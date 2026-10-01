import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../lib/database/prisma.service.js';
import { SecurityEventService } from '../security-event/security-event.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationDto } from './dto/update-application.dto.js';
import { AssignDeveloperDto } from './dto/assign-developer.dto.js';
import { RemoveDeveloperAccessDto } from './dto/remove-developer-access.dto.js';

@Injectable()
export class ApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly securityEventService: SecurityEventService,
  ) {}

  private async getOrganizationUser(userId: string) {
    const user = await this.prisma.db.orm.public.User.first({
      id: userId,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'ORGANIZATION' || !user.organizationId) {
      throw new ForbiddenException('Only organization owners can manage client applications');
    }

    return user;
  }

  private normalizeDisplayName(name: string) {
    return name.trim().replace(/\s+/g, ' ');
  }

  private normalizeApplicationName(name: string) {
    return this.normalizeDisplayName(name).toLowerCase();
  }

  private getApplicationChangedFields(dto: UpdateApplicationDto) {
    const fields: string[] = [];

    if (dto.name !== undefined) fields.push('name');
    if (dto.description !== undefined) fields.push('description');
    if (dto.environment !== undefined) fields.push('environment');
    if (dto.status !== undefined) fields.push('status');

    return fields;
  }

  async createApplication(userId: string, dto: CreateApplicationDto) {
    const user = await this.getOrganizationUser(userId);
    const organizationId = user.organizationId;

    if (!organizationId) {
      throw new ForbiddenException('Authenticated organization account has no organization');
    }

    const name = this.normalizeDisplayName(dto.name);
    const normalizedName = this.normalizeApplicationName(dto.name);

    if (!name) {
      throw new BadRequestException('Application name cannot be empty');
    }

    const existingApplication = await this.prisma.db.orm.public.ClientApplication
      .where({
        organizationId,
        normalizedName,
      })
      .first();

    if (existingApplication) {
      throw new ConflictException('An application with this name already exists in your organization');
    }

    const description = dto.description?.trim();

    const application = await this.prisma.db.orm.public.ClientApplication.create({
      name,
      normalizedName,
      description: description || null,
      environment: dto.environment ?? 'DEVELOPMENT',
      organization: (organization) => organization.connect({
        id: organizationId,
      }),
    });

    await this.securityEventService.recordApplicationEvent({
      actorUserId: userId,
      applicationId: application.id,
      category: 'APPLICATION',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'APPLICATION_CREATED',
      targetType: 'APPLICATION',
      targetId: application.id,
      targetLabel: application.name,
      description: `Application "${application.name}" was created.`,
    });

    return {
      id: application.id,
      organizationId: application.organizationId,
      name: application.name,
      description: application.description,
      environment: application.environment,
      status: application.status,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  }

  async getApplications(userId: string) {
    const user = await this.getOrganizationUser(userId);

    return this.prisma.db.orm.public.ClientApplication
      .select(
        'id',
        'organizationId',
        'name',
        'description',
        'environment',
        'status',
        'createdAt',
        'updatedAt',
      )
      .where({
        organizationId: user.organizationId,
      })
      .all();
  }

  async getApplication(userId: string, applicationId: string) {
    const user = await this.getOrganizationUser(userId);

    const application = await this.prisma.db.orm.public.ClientApplication
      .select(
        'id',
        'organizationId',
        'name',
        'description',
        'environment',
        'status',
        'createdAt',
        'updatedAt',
      )
      .where({
        id: applicationId,
        organizationId: user.organizationId,
      })
      .first();

    if (!application) {
      throw new NotFoundException('Client application not found');
    }

    return application;
  }

  async updateApplication(userId: string, applicationId: string, dto: UpdateApplicationDto) {
    const user = await this.getOrganizationUser(userId);

    const application = await this.prisma.db.orm.public.ClientApplication
      .where({
        id: applicationId,
        organizationId: user.organizationId,
      })
      .first();

    if (!application) {
      throw new NotFoundException('Client application not found');
    }

    const hasUpdate =
      dto.name !== undefined ||
      dto.description !== undefined ||
      dto.environment !== undefined ||
      dto.status !== undefined;

    if (!hasUpdate) {
      throw new BadRequestException('At least one application field must be provided');
    }

    const changedFields = this.getApplicationChangedFields(dto);

    let name = application.name;
    let normalizedName = application.normalizedName;

    if (dto.name !== undefined) {
      name = this.normalizeDisplayName(dto.name);
      normalizedName = this.normalizeApplicationName(dto.name);

      if (!name) {
        throw new BadRequestException('Application name cannot be empty');
      }

      const duplicateApplication = await this.prisma.db.orm.public.ClientApplication
        .where({
          organizationId: user.organizationId,
          normalizedName,
        })
        .first();

      if (duplicateApplication && duplicateApplication.id !== application.id) {
        throw new ConflictException('An application with this name already exists in your organization');
      }
    }

    const description = dto.description === undefined ? application.description : dto.description?.trim() || null;

    const updatedApplication = await this.prisma.db.orm.public.ClientApplication
      .where({
        id: application.id,
        organizationId: user.organizationId,
      })
      .update({
        name,
        normalizedName,
        description,
        environment: dto.environment ?? application.environment,
        status: dto.status ?? application.status,
        updatedAt: new Date().toISOString(),
      });

    if (!updatedApplication) {
      throw new NotFoundException('Client application no longer exists');
    }

    await this.securityEventService.recordApplicationEvent({
      actorUserId: userId,
      applicationId: updatedApplication.id,
      category: 'APPLICATION',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'APPLICATION_UPDATED',
      targetType: 'APPLICATION',
      targetId: updatedApplication.id,
      targetLabel: updatedApplication.name,
      changedFields,
      description: `Application "${updatedApplication.name}" was updated.`,
    });

    return {
      id: updatedApplication.id,
      organizationId: updatedApplication.organizationId,
      name: updatedApplication.name,
      description: updatedApplication.description,
      environment: updatedApplication.environment,
      status: updatedApplication.status,
      createdAt: updatedApplication.createdAt,
      updatedAt: updatedApplication.updatedAt,
    };
  }

  async getApplicationDevelopers(userId: string, applicationId: string) {
    const user = await this.getOrganizationUser(userId);

    const application = await this.prisma.db.orm.public.ClientApplication
      .where({
        id: applicationId,
        organizationId: user.organizationId,
      })
      .first();

    if (!application) {
      throw new NotFoundException('Client application not found');
    }

    const assignments = await this.prisma.db.orm.public.DeveloperApplicationAssignment
      .select(
        'developerId',
        'createdAt',
      )
      .where({
        applicationId: application.id,
      })
      .all();

    const developers = await Promise.all(
      assignments.map(async (assignment) => {
        const developer = await this.prisma.db.orm.public.User
          .select(
            'id',
            'email',
            'role',
            'status',
            'organizationId',
          )
          .where({
            id: assignment.developerId,
          })
          .first();

        if (!developer || developer.role !== 'DEVELOPER' || developer.organizationId !== user.organizationId) {
          return null;
        }

        return {
          id: developer.id,
          email: developer.email,
          status: developer.status,
          assignedAt: assignment.createdAt,
        };
      }),
    );

    return developers
      .filter((developer) => developer !== null)
      .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());
  }

  async assignDeveloper(userId: string, applicationId: string, dto: AssignDeveloperDto) {
    const user = await this.getOrganizationUser(userId);

    const application = await this.prisma.db.orm.public.ClientApplication
      .where({
        id: applicationId,
        organizationId: user.organizationId,
      })
      .first();

    if (!application) {
      throw new NotFoundException('Client application not found');
    }

    const developer = await this.prisma.db.orm.public.User
      .select(
        'id',
        'email',
        'role',
        'status',
        'organizationId',
      )
      .where({
        id: dto.developerId,
      })
      .first();

    if (!developer) {
      throw new NotFoundException('Developer not found');
    }

    if (developer.role !== 'DEVELOPER' || developer.status !== 'ACTIVE' || developer.organizationId !== user.organizationId) {
      throw new BadRequestException('Developer must be an active member of your organization');
    }

    const existingAssignment = await this.prisma.db.orm.public.DeveloperApplicationAssignment
      .where({
        developerId: developer.id,
        applicationId: application.id,
      })
      .first();

    if (existingAssignment) {
      throw new ConflictException('Developer already has access to this application');
    }

    const assignment = await this.prisma.db.orm.public.DeveloperApplicationAssignment.create({
      developer: (developerRelation) => developerRelation.connect({
        id: developer.id,
      }),
      application: (applicationRelation) => applicationRelation.connect({
        id: application.id,
      }),
    });

    await this.securityEventService.recordApplicationEvent({
      actorUserId: userId,
      applicationId: application.id,
      category: 'ACCESS_CONTROL',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'DEVELOPER_ASSIGNED',
      targetType: 'DEVELOPER',
      targetId: developer.id,
      targetLabel: developer.email,
      description: `Developer "${developer.email}" was assigned to "${application.name}".`,
    });

    return {
      id: developer.id,
      email: developer.email,
      status: developer.status,
      assignedAt: assignment.createdAt,
      message: 'Developer assigned successfully',
    };
  }

  async removeApplicationDeveloper(
    userId: string,
    applicationId: string,
    developerId: string,
    dto: RemoveDeveloperAccessDto,
  ) {
    const user = await this.getOrganizationUser(userId);

    const application = await this.prisma.db.orm.public.ClientApplication
      .where({
        id: applicationId,
        organizationId: user.organizationId,
      })
      .first();

    if (!application) {
      throw new NotFoundException('Client application not found');
    }

    const assignment = await this.prisma.db.orm.public.DeveloperApplicationAssignment
      .where({
        developerId,
        applicationId: application.id,
      })
      .first();

    if (!assignment) {
      throw new NotFoundException('Developer assignment not found');
    }

    const developer = await this.prisma.db.orm.public.User
      .select(
        'id',
        'email',
      )
      .where({
        id: developerId,
      })
      .first();

    const passwordMatches = await argon2.verify(user.passwordHash, dto.currentPassword);

    if (!passwordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const deletedAssignment = await this.prisma.db.orm.public.DeveloperApplicationAssignment
      .where({
        id: assignment.id,
        applicationId: application.id,
        developerId,
      })
      .delete();

    if (!deletedAssignment) {
      throw new NotFoundException('Developer assignment no longer exists');
    }

    await this.securityEventService.recordApplicationEvent({
      actorUserId: userId,
      applicationId: application.id,
      category: 'ACCESS_CONTROL',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'DEVELOPER_ACCESS_REMOVED',
      targetType: 'DEVELOPER',
      targetId: developerId,
      targetLabel: developer?.email ?? developerId,
      description: `Developer "${developer?.email ?? developerId}" was removed from "${application.name}".`,
    });

    return {
      message: 'Developer access removed successfully',
    };
  }
}