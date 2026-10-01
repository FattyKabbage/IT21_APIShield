import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../../lib/database/prisma.service.js';
import { SecurityEventService } from '../security-event/security-event.service.js';

@Injectable()
export class ApplicationCredentialService {
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
      throw new ForbiddenException('Only organization owners can manage organization application credentials');
    }

    return {
      id: user.id,
      organizationId: user.organizationId,
      passwordHash: user.passwordHash,
    };
  }

  private async getIndependentDeveloperUser(userId: string) {
    const user = await this.prisma.db.orm.public.User.first({
      id: userId,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'DEVELOPER' || user.organizationId) {
      throw new ForbiddenException('Only independent developers can manage personal application credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Only active independent developers can manage personal application credentials');
    }

    return {
      id: user.id,
      passwordHash: user.passwordHash,
    };
  }

  private async getOwnedApplication(organizationId: string, applicationId: string) {
    const application = await this.prisma.db.orm.public.ClientApplication
      .where({
        id: applicationId,
        organizationId,
      })
      .first();

    if (!application) {
      throw new NotFoundException('Client application not found');
    }

    return application;
  }

  private async getPersonalApplication(developerId: string, applicationId: string) {
    const application = await this.prisma.db.orm.public.ClientApplication
      .where({
        id: applicationId,
        ownerDeveloperId: developerId,
      })
      .first();

    if (!application) {
      throw new NotFoundException('Personal application not found');
    }

    return application;
  }

  private generateClientId() {
    return `app_${randomBytes(18).toString('base64url')}`;
  }

  private generateClientSecret() {
    return `sk_${randomBytes(32).toString('base64url')}`;
  }

  async getCredential(userId: string, applicationId: string) {
    const user = await this.getOrganizationUser(userId);
    const application = await this.getOwnedApplication(user.organizationId, applicationId);

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

  async createCredential(userId: string, applicationId: string) {
    const user = await this.getOrganizationUser(userId);
    const application = await this.getOwnedApplication(user.organizationId, applicationId);

    if (application.status !== 'ACTIVE') {
      throw new ConflictException('Credentials cannot be created for a disabled application');
    }

    const existingCredential = await this.prisma.db.orm.public.ApplicationCredential
      .where({
        applicationId: application.id,
      })
      .first();

    if (existingCredential) {
      throw new ConflictException('This application already has credentials');
    }

    const clientId = this.generateClientId();
    const clientSecret = this.generateClientSecret();
    const clientSecretHash = await argon2.hash(clientSecret);

    const credential = await this.prisma.db.orm.public.ApplicationCredential.create({
      applicationId: application.id,
      clientId,
      clientSecretHash,
    });

    await this.securityEventService.recordApplicationEvent({
      actorUserId: userId,
      applicationId: application.id,
      category: 'CREDENTIAL',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'APPLICATION_CREDENTIAL_CREATED',
      targetType: 'APPLICATION_CREDENTIAL',
      targetId: credential.id,
      targetLabel: application.name,
      description: `Application credentials were created for "${application.name}".`,
    });

    return {
      id: credential.id,
      applicationId: credential.applicationId,
      clientId: credential.clientId,
      clientSecret,
      status: credential.status,
      createdAt: credential.createdAt,
      message: 'Store this client secret securely. It will not be shown again.',
    };
  }

  async rotateCredential(userId: string, applicationId: string, currentPassword: string) {
    const user = await this.getOrganizationUser(userId);
    const application = await this.getOwnedApplication(user.organizationId, applicationId);

    if (application.status !== 'ACTIVE') {
      throw new ConflictException('Credentials cannot be rotated for a disabled application');
    }

    const credential = await this.prisma.db.orm.public.ApplicationCredential
      .where({
        applicationId: application.id,
      })
      .first();

    if (!credential) {
      throw new NotFoundException('Application credentials not found');
    }

    const passwordMatches = await argon2.verify(user.passwordHash, currentPassword);

    if (!passwordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const clientId = this.generateClientId();
    const clientSecret = this.generateClientSecret();
    const clientSecretHash = await argon2.hash(clientSecret);

    const updatedCredential = await this.prisma.db.orm.public.ApplicationCredential
      .where({
        id: credential.id,
        applicationId: application.id,
      })
      .update({
        clientId,
        clientSecretHash,
        status: 'ACTIVE',
        updatedAt: new Date().toISOString(),
      });

    if (!updatedCredential) {
      throw new NotFoundException('Application credentials no longer exist');
    }

    await this.securityEventService.recordApplicationEvent({
      actorUserId: userId,
      applicationId: application.id,
      category: 'CREDENTIAL',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'APPLICATION_CREDENTIAL_ROTATED',
      targetType: 'APPLICATION_CREDENTIAL',
      targetId: updatedCredential.id,
      targetLabel: application.name,
      changedFields: ['clientId', 'clientSecret'],
      description: `Application credentials were rotated for "${application.name}".`,
    });

    return {
      id: updatedCredential.id,
      applicationId: updatedCredential.applicationId,
      clientId: updatedCredential.clientId,
      clientSecret,
      status: updatedCredential.status,
      createdAt: updatedCredential.createdAt,
      updatedAt: updatedCredential.updatedAt,
      message: 'Application credentials rotated successfully. Store the new client secret securely. It will not be shown again.',
    };
  }

  async createDeveloperCredential(userId: string, applicationId: string) {
    const user = await this.getIndependentDeveloperUser(userId);
    const application = await this.getPersonalApplication(user.id, applicationId);

    if (application.status !== 'ACTIVE') {
      throw new ConflictException('Credentials cannot be created for a disabled application');
    }

    const existingCredential = await this.prisma.db.orm.public.ApplicationCredential
      .where({
        applicationId: application.id,
      })
      .first();

    if (existingCredential) {
      throw new ConflictException('This application already has credentials');
    }

    const clientId = this.generateClientId();
    const clientSecret = this.generateClientSecret();
    const clientSecretHash = await argon2.hash(clientSecret);

    const credential = await this.prisma.db.orm.public.ApplicationCredential.create({
      applicationId: application.id,
      clientId,
      clientSecretHash,
    });

    await this.securityEventService.recordApplicationEvent({
      actorUserId: user.id,
      applicationId: application.id,
      category: 'CREDENTIAL',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'APPLICATION_CREDENTIAL_CREATED',
      targetType: 'APPLICATION_CREDENTIAL',
      targetId: credential.id,
      targetLabel: application.name,
      description: `Application credentials were created for personal application "${application.name}".`,
    });

    return {
      id: credential.id,
      applicationId: credential.applicationId,
      clientId: credential.clientId,
      clientSecret,
      status: credential.status,
      createdAt: credential.createdAt,
      message: 'Store this client secret securely. It will not be shown again.',
    };
  }

  async rotateDeveloperCredential(userId: string, applicationId: string, currentPassword: string) {
    const user = await this.getIndependentDeveloperUser(userId);
    const application = await this.getPersonalApplication(user.id, applicationId);

    if (application.status !== 'ACTIVE') {
      throw new ConflictException('Credentials cannot be rotated for a disabled application');
    }

    const credential = await this.prisma.db.orm.public.ApplicationCredential
      .where({
        applicationId: application.id,
      })
      .first();

    if (!credential) {
      throw new NotFoundException('Application credentials not found');
    }

    const passwordMatches = await argon2.verify(user.passwordHash, currentPassword);

    if (!passwordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const clientId = this.generateClientId();
    const clientSecret = this.generateClientSecret();
    const clientSecretHash = await argon2.hash(clientSecret);

    const updatedCredential = await this.prisma.db.orm.public.ApplicationCredential
      .where({
        id: credential.id,
        applicationId: application.id,
      })
      .update({
        clientId,
        clientSecretHash,
        status: 'ACTIVE',
        updatedAt: new Date().toISOString(),
      });

    if (!updatedCredential) {
      throw new NotFoundException('Application credentials no longer exist');
    }

    await this.securityEventService.recordApplicationEvent({
      actorUserId: user.id,
      applicationId: application.id,
      category: 'CREDENTIAL',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'APPLICATION_CREDENTIAL_ROTATED',
      targetType: 'APPLICATION_CREDENTIAL',
      targetId: updatedCredential.id,
      targetLabel: application.name,
      changedFields: ['clientId', 'clientSecret'],
      description: `Application credentials were rotated for personal application "${application.name}".`,
    });

    return {
      id: updatedCredential.id,
      applicationId: updatedCredential.applicationId,
      clientId: updatedCredential.clientId,
      clientSecret,
      status: updatedCredential.status,
      createdAt: updatedCredential.createdAt,
      updatedAt: updatedCredential.updatedAt,
      message: 'Application credentials rotated successfully. Store the new client secret securely. It will not be shown again.',
    };
  }
}