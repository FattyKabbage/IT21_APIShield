import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service.js';
import { ProviderCredentialEncryptionService } from '../../lib/security/provider-credential-encryption.service.js';
import { OutboundUrlSafetyService } from '../../lib/security/outbound-url-safety.service.js';
import { SecurityEventService } from '../security-event/security-event.service.js';
import { CreateApiIntegrationDto, ApiCredentialDto } from './dto/create-api-integration.dto.js';
import { UpdateApiIntegrationDto } from './dto/update-api-integration.dto.js';

@Injectable()
export class ApiIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: ProviderCredentialEncryptionService,
    private readonly outboundUrlSafetyService: OutboundUrlSafetyService,
    private readonly securityEventService: SecurityEventService,
  ) {}

  private getIntegrationChangedFields(dto: UpdateApiIntegrationDto) {
    const fields: string[] = [];

    if (dto.name !== undefined) fields.push('name');
    if (dto.provider !== undefined) fields.push('provider');
    if (dto.baseUrl !== undefined) fields.push('baseUrl');
    if (dto.authType !== undefined) fields.push('authType');
    if (dto.credentialPlacement !== undefined) fields.push('credentialPlacement');
    if (dto.credentialName !== undefined) fields.push('credentialName');
    if (dto.credential !== undefined) fields.push('providerCredential');
    if (dto.status !== undefined) fields.push('status');

    return fields;
  }

  private async getIntegrationUser(userId: string) {
    const user = await this.prisma.db.orm.public.User.first({
      id: userId,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'ORGANIZATION' && user.role !== 'DEVELOPER') {
      throw new ForbiddenException('User cannot manage API integrations');
    }

    return user;
  }

  private async getOwnedApplication(userId: string, applicationId: string) {
  const user = await this.getIntegrationUser(userId);

    if (user.role === 'ORGANIZATION') {
      if (!user.organizationId) {
        throw new ForbiddenException('Organization account has no organization');
      }

      const application = await this.prisma.db.orm.public.ClientApplication
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

    if (user.status !== 'ACTIVE') {
      throw new NotFoundException('Developer application not found');
    }

    if (!user.organizationId) {
      const application = await this.prisma.db.orm.public.ClientApplication
        .where({
          id: applicationId,
          ownerDeveloperId: user.id,
        })
        .first();

      if (!application) {
        throw new NotFoundException('Personal application not found');
      }

      return application;
    }

    const assignment = await this.prisma.db.orm.public.DeveloperApplicationAssignment
      .where({
        developerId: user.id,
        applicationId,
      })
      .first();

    if (!assignment) {
      throw new NotFoundException('Assigned application not found');
    }

    const application = await this.prisma.db.orm.public.ClientApplication
      .where({
        id: applicationId,
        organizationId: user.organizationId,
      })
      .first();

    if (!application) {
      throw new NotFoundException('Assigned application not found');
    }

    return application;
  }
  private normalizeDisplayName(name: string) {
    return name.trim().replace(/\s+/g, ' ');
  }

  private normalizeIntegrationName(name: string) {
    return this.normalizeDisplayName(name).toLowerCase();
  }

  private normalizeBaseUrl(baseUrl: string) {
    return baseUrl.trim().replace(/\/+$/, '');
  }

  private validateCredential(
    authType: 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH',
    credential: ApiCredentialDto | undefined,
    credentialPlacement?: 'HEADER' | 'QUERY',
    credentialName?: string,
  ) {
    if (authType === 'NONE') {
      if (credential) {
        throw new BadRequestException('Credential must not be provided when authentication type is NONE');
      }

      return {
        credential: null,
        credentialPlacement: null,
        credentialName: null,
      };
    }

    if (authType === 'API_KEY') {
      const value = credential?.value?.trim();

      if (!value) {
        throw new BadRequestException('API_KEY authentication requires credential.value');
      }

      if (!credentialPlacement) {
        throw new BadRequestException('API_KEY authentication requires credentialPlacement');
      }

      const normalizedCredentialName = credentialName?.trim();

      if (!normalizedCredentialName) {
        throw new BadRequestException('API_KEY authentication requires credentialName');
      }

      return {
        credential: {
          value,
        },
        credentialPlacement,
        credentialName: normalizedCredentialName,
      };
    }

    if (authType === 'BEARER_TOKEN') {
      const token = credential?.token?.trim();

      if (!token) {
        throw new BadRequestException('BEARER_TOKEN authentication requires credential.token');
      }

      return {
        credential: {
          token,
        },
        credentialPlacement: null,
        credentialName: null,
      };
    }

    const username = credential?.username?.trim();
    const password = credential?.password;

    if (!username || !password) {
      throw new BadRequestException('BASIC_AUTH authentication requires credential.username and credential.password');
    }

    return {
      credential: {
        username,
        password,
      },
      credentialPlacement: null,
      credentialName: null,
    };
  }

  async createIntegration(userId: string, applicationId: string, dto: CreateApiIntegrationDto) {
    const application = await this.getOwnedApplication(userId, applicationId);
    const name = this.normalizeDisplayName(dto.name);
    const normalizedName = this.normalizeIntegrationName(dto.name);

    if (!name) {
      throw new BadRequestException('Integration name cannot be empty');
    }

    const existingIntegration = await this.prisma.db.orm.public.ApiIntegration
      .where({
        applicationId: application.id,
        normalizedName,
      })
      .first();

    if (existingIntegration) {
      throw new ConflictException('An API integration with this name already exists for this application');
    }

    const provider = dto.provider.trim();

    if (!provider) {
      throw new BadRequestException('Provider cannot be empty');
    }

    const baseUrl = this.normalizeBaseUrl(dto.baseUrl);

    await this.outboundUrlSafetyService.validateBaseUrl(baseUrl);

    const configuration = this.validateCredential(
      dto.authType,
      dto.credential,
      dto.credentialPlacement,
      dto.credentialName,
    );

    let encryptedCredential: string | null = null;
    let credentialIv: string | null = null;
    let credentialAuthTag: string | null = null;

    if (configuration.credential) {
      const encrypted = this.encryptionService.encrypt(configuration.credential);

      encryptedCredential = encrypted.encryptedCredential;
      credentialIv = encrypted.credentialIv;
      credentialAuthTag = encrypted.credentialAuthTag;
    }

    const integration = await this.prisma.db.orm.public.ApiIntegration.create({
      applicationId: application.id,
      name,
      normalizedName,
      provider,
      baseUrl,
      authType: dto.authType,
      credentialPlacement: configuration.credentialPlacement,
      credentialName: configuration.credentialName,
      encryptedCredential,
      credentialIv,
      credentialAuthTag,
    });

    await this.securityEventService.recordApplicationEvent({
      actorUserId: userId,
      applicationId: application.id,
      category: 'INTEGRATION',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'API_INTEGRATION_CREATED',
      targetType: 'API_INTEGRATION',
      targetId: integration.id,
      targetLabel: integration.name,
      description: `API integration "${integration.name}" was created.`,
    });

    return {
      id: integration.id,
      applicationId: integration.applicationId,
      name: integration.name,
      provider: integration.provider,
      baseUrl: integration.baseUrl,
      authType: integration.authType,
      credentialPlacement: integration.credentialPlacement,
      credentialName: integration.credentialName,
      hasCredential: integration.encryptedCredential !== null,
      status: integration.status,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    };
  }

  async getIntegrations(userId: string, applicationId: string) {
    const application = await this.getOwnedApplication(userId, applicationId);

    const integrations = await this.prisma.db.orm.public.ApiIntegration
      .select(
        'id',
        'applicationId',
        'name',
        'provider',
        'baseUrl',
        'authType',
        'credentialPlacement',
        'credentialName',
        'encryptedCredential',
        'status',
        'createdAt',
        'updatedAt',
      )
      .where({
        applicationId: application.id,
      })
      .all();

    return integrations.map((integration) => ({
      id: integration.id,
      applicationId: integration.applicationId,
      name: integration.name,
      provider: integration.provider,
      baseUrl: integration.baseUrl,
      authType: integration.authType,
      credentialPlacement: integration.credentialPlacement,
      credentialName: integration.credentialName,
      hasCredential: integration.encryptedCredential !== null,
      status: integration.status,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    }));
  }

  async getIntegration(userId: string, applicationId: string, integrationId: string) {
    const application = await this.getOwnedApplication(userId, applicationId);

    const integration = await this.prisma.db.orm.public.ApiIntegration
      .select(
        'id',
        'applicationId',
        'name',
        'provider',
        'baseUrl',
        'authType',
        'credentialPlacement',
        'credentialName',
        'encryptedCredential',
        'status',
        'createdAt',
        'updatedAt',
      )
      .where({
        id: integrationId,
        applicationId: application.id,
      })
      .first();

    if (!integration) {
      throw new NotFoundException('API integration not found');
    }

    return {
      id: integration.id,
      applicationId: integration.applicationId,
      name: integration.name,
      provider: integration.provider,
      baseUrl: integration.baseUrl,
      authType: integration.authType,
      credentialPlacement: integration.credentialPlacement,
      credentialName: integration.credentialName,
      hasCredential: integration.encryptedCredential !== null,
      status: integration.status,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    };
  }

  async updateIntegration(
    userId: string,
    applicationId: string,
    integrationId: string,
    dto: UpdateApiIntegrationDto,
  ) {
    const application = await this.getOwnedApplication(userId, applicationId);

    const integration = await this.prisma.db.orm.public.ApiIntegration
      .where({
        id: integrationId,
        applicationId: application.id,
      })
      .first();

    if (!integration) {
      throw new NotFoundException('API integration not found');
    }

    const hasUpdate =
      dto.name !== undefined ||
      dto.provider !== undefined ||
      dto.baseUrl !== undefined ||
      dto.authType !== undefined ||
      dto.credentialPlacement !== undefined ||
      dto.credentialName !== undefined ||
      dto.credential !== undefined ||
      dto.status !== undefined;

    if (!hasUpdate) {
      throw new BadRequestException('At least one integration field must be provided');
    }

    const changedFields = this.getIntegrationChangedFields(dto);

    let name = integration.name;
    let normalizedName = integration.normalizedName;

    if (dto.name !== undefined) {
      name = this.normalizeDisplayName(dto.name);
      normalizedName = this.normalizeIntegrationName(dto.name);

      if (!name) {
        throw new BadRequestException('Integration name cannot be empty');
      }

      const duplicate = await this.prisma.db.orm.public.ApiIntegration
        .where({
          applicationId: application.id,
          normalizedName,
        })
        .first();

      if (duplicate && duplicate.id !== integration.id) {
        throw new ConflictException('An API integration with this name already exists for this application');
      }
    }

    const authType = dto.authType ?? integration.authType;
    const authTypeChanged = dto.authType !== undefined && dto.authType !== integration.authType;

    let credentialPlacement = integration.credentialPlacement;
    let credentialName = integration.credentialName;
    let encryptedCredential = integration.encryptedCredential;
    let credentialIv = integration.credentialIv;
    let credentialAuthTag = integration.credentialAuthTag;

    if (authTypeChanged && authType !== 'NONE' && dto.credential === undefined) {
      throw new BadRequestException('A new credential is required when changing authentication type');
    }

    if (dto.credential !== undefined || authTypeChanged) {
      const configuration = this.validateCredential(
        authType,
        dto.credential,
        dto.credentialPlacement ?? integration.credentialPlacement ?? undefined,
        dto.credentialName ?? integration.credentialName ?? undefined,
      );

      credentialPlacement = configuration.credentialPlacement;
      credentialName = configuration.credentialName;

      if (configuration.credential) {
        const encrypted = this.encryptionService.encrypt(configuration.credential);

        encryptedCredential = encrypted.encryptedCredential;
        credentialIv = encrypted.credentialIv;
        credentialAuthTag = encrypted.credentialAuthTag;
      } else {
        encryptedCredential = null;
        credentialIv = null;
        credentialAuthTag = null;
      }
    } else if (authType === 'API_KEY') {
      if (dto.credentialPlacement !== undefined) {
        credentialPlacement = dto.credentialPlacement;
      }

      if (dto.credentialName !== undefined) {
        credentialName = dto.credentialName.trim();
      }

      if (!credentialPlacement || !credentialName) {
        throw new BadRequestException('API_KEY authentication requires credentialPlacement and credentialName');
      }
    } else if (dto.credentialPlacement !== undefined || dto.credentialName !== undefined) {
      throw new BadRequestException('credentialPlacement and credentialName are only used with API_KEY authentication');
    }

    const baseUrl = dto.baseUrl !== undefined ? this.normalizeBaseUrl(dto.baseUrl) : integration.baseUrl;

    if (dto.baseUrl !== undefined) {
      await this.outboundUrlSafetyService.validateBaseUrl(baseUrl);
    }

    const updatedIntegration = await this.prisma.db.orm.public.ApiIntegration
      .where({
        id: integration.id,
        applicationId: application.id,
      })
      .update({
        name,
        normalizedName,
        provider: dto.provider?.trim() ?? integration.provider,
        baseUrl,
        authType,
        credentialPlacement,
        credentialName,
        encryptedCredential,
        credentialIv,
        credentialAuthTag,
        status: dto.status ?? integration.status,
        updatedAt: new Date().toISOString(),
      });

    if (!updatedIntegration) {
      throw new NotFoundException('API integration no longer exists');
    }

    await this.securityEventService.recordApplicationEvent({
      actorUserId: userId,
      applicationId: application.id,
      category: 'INTEGRATION',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'API_INTEGRATION_UPDATED',
      targetType: 'API_INTEGRATION',
      targetId: updatedIntegration.id,
      targetLabel: updatedIntegration.name,
      changedFields,
      description: `API integration "${updatedIntegration.name}" was updated.`,
    });

    return {
      id: updatedIntegration.id,
      applicationId: updatedIntegration.applicationId,
      name: updatedIntegration.name,
      provider: updatedIntegration.provider,
      baseUrl: updatedIntegration.baseUrl,
      authType: updatedIntegration.authType,
      credentialPlacement: updatedIntegration.credentialPlacement,
      credentialName: updatedIntegration.credentialName,
      hasCredential: updatedIntegration.encryptedCredential !== null,
      status: updatedIntegration.status,
      createdAt: updatedIntegration.createdAt,
      updatedAt: updatedIntegration.updatedAt,
    };
  }
}