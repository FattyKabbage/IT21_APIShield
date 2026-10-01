import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service.js';
import { SecurityEventService } from '../security-event/security-event.service.js';
import { CreateApplicationDto } from '../application/dto/create-application.dto.js';
import { UpdateApplicationDto } from '../application/dto/update-application.dto.js';

@Injectable()
export class DeveloperService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly securityEventService: SecurityEventService,
  ) {}

  private async getDeveloperUser(userId: string) {
    const user = await this.prisma.db.orm.public.User
      .select(
        'id',
        'email',
        'role',
        'status',
        'organizationId',
        'createdAt',
        'updatedAt',
      )
      .where({
        id: userId,
      })
      .first();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'DEVELOPER') {
      throw new ForbiddenException('Only developer accounts can access the developer workspace');
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

  private async getAssignedApplication(developerId: string, organizationId: string, applicationId: string) {
    const assignment = await this.prisma.db.orm.public.DeveloperApplicationAssignment
      .where({
        developerId,
        applicationId,
      })
      .first();

    if (!assignment) {
      throw new NotFoundException('Assigned application not found');
    }

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
        organizationId,
      })
      .first();

    if (!application) {
      throw new NotFoundException('Assigned application not found');
    }

    return {
      ...application,
      accessType: 'ASSIGNED' as const,
      assignedAt: assignment.createdAt,
    };
  }

  private async getPersonalApplication(developerId: string, applicationId: string) {
    const application = await this.prisma.db.orm.public.ClientApplication
      .select(
        'id',
        'organizationId',
        'ownerDeveloperId',
        'name',
        'description',
        'environment',
        'status',
        'createdAt',
        'updatedAt',
      )
      .where({
        id: applicationId,
        ownerDeveloperId: developerId,
      })
      .first();

    if (!application) {
      throw new NotFoundException('Personal application not found');
    }

    return {
      id: application.id,
      organizationId: application.organizationId,
      name: application.name,
      description: application.description,
      environment: application.environment,
      status: application.status,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      accessType: 'OWNED' as const,
      assignedAt: application.createdAt,
    };
  }

  async getProfile(userId: string) {
    const user = await this.getDeveloperUser(userId);

    if (!user.organizationId) {
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        membershipType: 'INDEPENDENT',
        organization: null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    }

    const organization = await this.prisma.db.orm.public.Organization
      .select(
        'id',
        'name',
        'createdAt',
      )
      .where({
        id: user.organizationId,
      })
      .first();

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      membershipType: 'ORGANIZATION',
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            createdAt: organization.createdAt,
          }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async createPersonalApplication(userId: string, dto: CreateApplicationDto) {
    const user = await this.getDeveloperUser(userId);

    if (user.organizationId) {
      throw new ForbiddenException('Organization developers cannot create personal applications');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Only active independent developers can create a personal application');
    }

    const existingApplication = await this.prisma.db.orm.public.ClientApplication
      .where({
        ownerDeveloperId: user.id,
      })
      .first();

    if (existingApplication) {
      throw new ConflictException('Independent developers can own only one personal application');
    }

    const name = this.normalizeDisplayName(dto.name);
    const normalizedName = this.normalizeApplicationName(dto.name);

    if (!name) {
      throw new BadRequestException('Application name cannot be empty');
    }

    const description = dto.description?.trim();

    const application = await this.prisma.db.orm.public.ClientApplication.create({
      name,
      normalizedName,
      description: description || null,
      environment: dto.environment ?? 'DEVELOPMENT',
      ownerDeveloper: (developer) => developer.connect({
        id: user.id,
      }),
    });

    await this.securityEventService.recordApplicationEvent({
      actorUserId: user.id,
      applicationId: application.id,
      category: 'APPLICATION',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'APPLICATION_CREATED',
      targetType: 'APPLICATION',
      targetId: application.id,
      targetLabel: application.name,
      description: `Personal application "${application.name}" was created.`,
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
      accessType: 'OWNED',
      assignedAt: application.createdAt,
    };
  }

  async getApplications(userId: string) {
    const user = await this.getDeveloperUser(userId);

    if (!user.organizationId) {
      const applications = await this.prisma.db.orm.public.ClientApplication
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
          ownerDeveloperId: user.id,
        })
        .all();

      return applications
        .map((application) => ({
          ...application,
          accessType: 'OWNED' as const,
          assignedAt: application.createdAt,
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const assignments = await this.prisma.db.orm.public.DeveloperApplicationAssignment
      .select(
        'applicationId',
        'createdAt',
      )
      .where({
        developerId: user.id,
      })
      .all();

    const applications = await Promise.all(
      assignments.map(async (assignment) => {
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
            id: assignment.applicationId,
            organizationId: user.organizationId,
          })
          .first();

        if (!application) return null;

        return {
          ...application,
          accessType: 'ASSIGNED' as const,
          assignedAt: assignment.createdAt,
        };
      }),
    );

    return applications
      .filter((application) => application !== null)
      .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());
  }

  async getApplication(userId: string, applicationId: string) {
    const user = await this.getDeveloperUser(userId);

    if (!user.organizationId) {
      return this.getPersonalApplication(user.id, applicationId);
    }

    return this.getAssignedApplication(user.id, user.organizationId, applicationId);
  }

  async updatePersonalApplication(userId: string, applicationId: string, dto: UpdateApplicationDto) {
    const user = await this.getDeveloperUser(userId);

    if (user.organizationId) {
      throw new ForbiddenException('Organization developers cannot modify application ownership settings');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Only active independent developers can update a personal application');
    }

    const application = await this.prisma.db.orm.public.ClientApplication
      .where({
        id: applicationId,
        ownerDeveloperId: user.id,
      })
      .first();

    if (!application) {
      throw new NotFoundException('Personal application not found');
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
    }

    const description = dto.description === undefined ? application.description : dto.description?.trim() || null;

    const updatedApplication = await this.prisma.db.orm.public.ClientApplication
      .where({
        id: application.id,
        ownerDeveloperId: user.id,
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
      throw new NotFoundException('Personal application no longer exists');
    }

    await this.securityEventService.recordApplicationEvent({
      actorUserId: user.id,
      applicationId: updatedApplication.id,
      category: 'APPLICATION',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'APPLICATION_UPDATED',
      targetType: 'APPLICATION',
      targetId: updatedApplication.id,
      targetLabel: updatedApplication.name,
      changedFields,
      description: `Personal application "${updatedApplication.name}" was updated.`,
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
      accessType: 'OWNED',
      assignedAt: updatedApplication.createdAt,
    };
  }

  async getApplicationCredential(userId: string, applicationId: string) {
    const user = await this.getDeveloperUser(userId);

    const application = user.organizationId
      ? await this.getAssignedApplication(user.id, user.organizationId, applicationId)
      : await this.getPersonalApplication(user.id, applicationId);

    const credential = await this.prisma.db.orm.public.ApplicationCredential
      .select(
        'id',
        'applicationId',
        'clientId',
        'status',
        'createdAt',
        'updatedAt',
      )
      .where({
        applicationId: application.id,
      })
      .first();

    return {
      hasCredential: !!credential,
      credential: credential ?? null,
    };
  }
}