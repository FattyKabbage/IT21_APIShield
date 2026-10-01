import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service.js';

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOwnedApplication(userId: string, applicationId: string) {
    const user = await this.prisma.db.orm.public.User.first({
      id: userId,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'ORGANIZATION' || !user.organizationId) {
      throw new ForbiddenException('Only organization owners can view application activity');
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

  private async getDeveloperApplication(userId: string, applicationId: string) {
    const user = await this.prisma.db.orm.public.User
      .select('id', 'role', 'status', 'organizationId')
      .where({
        id: userId,
      })
      .first();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'DEVELOPER' || user.status !== 'ACTIVE') {
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

  private async getGatewayLogs(applicationId: string) {
    const logs = await this.prisma.db.orm.public.GatewayRequestLog
      .select(
        'id',
        'applicationId',
        'integrationId',
        'method',
        'path',
        'providerStatus',
        'outcome',
        'durationMs',
        'createdAt',
      )
      .where({
        applicationId,
      })
      .all();

    const integrations = await this.prisma.db.orm.public.ApiIntegration
      .select('id', 'name', 'provider')
      .where({
        applicationId,
      })
      .all();

    const integrationMap = new Map(
      integrations.map((integration) => [
        integration.id,
        {
          name: integration.name,
          provider: integration.provider,
        },
      ]),
    );

    return logs
      .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))
      .map((log) => {
        const integration = integrationMap.get(log.integrationId);

        return {
          id: log.id,
          applicationId: log.applicationId,
          integrationId: log.integrationId,
          integrationName: integration?.name ?? null,
          provider: integration?.provider ?? null,
          method: log.method,
          path: log.path,
          providerStatus: log.providerStatus,
          outcome: log.outcome,
          durationMs: log.durationMs,
          createdAt: log.createdAt,
        };
      });
  }

  async getApplicationActivity(userId: string, applicationId: string) {
    const application = await this.getOwnedApplication(userId, applicationId);

    return this.getGatewayLogs(application.id);
  }

  async getDeveloperGatewayActivity(userId: string, applicationId: string) {
    const application = await this.getDeveloperApplication(userId, applicationId);

    return this.getGatewayLogs(application.id);
  }
}