import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service.js';

export type SecurityEventCategory = 'AUTHENTICATION' | 'AUTHORIZATION' | 'APPLICATION' | 'CREDENTIAL' | 'INTEGRATION' | 'ORGANIZATION' | 'ACCESS_CONTROL' | 'SYSTEM';

export type SecurityEventSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type SecurityEventOutcome = 'SUCCESS' | 'FAILURE' | 'DENIED';

export type SecurityEventAction =
  | 'USER_LOGIN_SUCCEEDED'
  | 'USER_LOGIN_FAILED'
  | 'USER_LOGOUT'
  | 'APPLICATION_CREATED'
  | 'APPLICATION_UPDATED'
  | 'APPLICATION_CREDENTIAL_CREATED'
  | 'APPLICATION_CREDENTIAL_ROTATED'
  | 'DEVELOPER_ASSIGNED'
  | 'DEVELOPER_ACCESS_REMOVED'
  | 'API_INTEGRATION_CREATED'
  | 'API_INTEGRATION_UPDATED'
  | 'ORGANIZATION_INVITATION_CREATED'
  | 'ORGANIZATION_INVITATION_RESENT'
  | 'ORGANIZATION_INVITATION_REVOKED'
  | 'ORGANIZATION_INVITATION_ACCEPTED'
  | 'ACCESS_DENIED';

export type SecurityEventTargetType = 'USER' | 'ORGANIZATION' | 'APPLICATION' | 'APPLICATION_CREDENTIAL' | 'DEVELOPER' | 'API_INTEGRATION' | 'ORGANIZATION_INVITATION' | 'SYSTEM';

export interface RecordApplicationEventInput {
  actorUserId: string;
  applicationId: string;
  category: SecurityEventCategory;
  action: SecurityEventAction;
  targetType: SecurityEventTargetType;
  severity?: SecurityEventSeverity;
  outcome?: SecurityEventOutcome;
  targetId?: string | null;
  targetLabel?: string | null;
  changedFields?: string[];
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

export interface RecordSystemEventInput {
  actorUserId?: string | null;
  actorEmail?: string | null;
  organizationId?: string | null;
  applicationId?: string | null;
  category: SecurityEventCategory;
  action: SecurityEventAction;
  targetType: SecurityEventTargetType;
  severity?: SecurityEventSeverity;
  outcome?: SecurityEventOutcome;
  targetId?: string | null;
  targetLabel?: string | null;
  changedFields?: string[];
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

@Injectable()
export class SecurityEventService {
  constructor(private readonly prisma: PrismaService) {}

  async recordSystemEvent(input: RecordSystemEventInput) {
    let actorEmail = input.actorEmail?.trim().toLowerCase() ?? null;
    let organizationId = input.organizationId ?? null;

    if (input.actorUserId) {
      const actor = await this.prisma.db.orm.public.User
        .select('id', 'email', 'organizationId')
        .where({ id: input.actorUserId })
        .first();

      if (!actor) {
        throw new NotFoundException('Security event actor not found');
      }

      actorEmail = actor.email;
      organizationId = organizationId ?? actor.organizationId;
    }

    return this.prisma.db.orm.public.SecurityEvent.create({
      actorUserId: input.actorUserId ?? null,
      actorEmail,
      organizationId,
      applicationId: input.applicationId ?? null,
      category: input.category,
      severity: input.severity ?? 'INFO',
      outcome: input.outcome ?? 'SUCCESS',
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      targetLabel: input.targetLabel ?? null,
      changedFields: input.changedFields && input.changedFields.length > 0 ? input.changedFields.join('|') : null,
      description: input.description ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      requestId: input.requestId ?? null,
    });
  }

  async recordApplicationEvent(input: RecordApplicationEventInput) {
    const actor = await this.prisma.db.orm.public.User
      .select('id', 'email', 'role', 'organizationId')
      .where({ id: input.actorUserId })
      .first();

    if (!actor) {
      throw new NotFoundException('Security event actor not found');
    }

    const application = await this.prisma.db.orm.public.ClientApplication
      .select('id', 'organizationId', 'ownerDeveloperId')
      .where({ id: input.applicationId })
      .first();

    if (!application) {
      throw new NotFoundException('Security event application not found');
    }

    const belongsToOrganization = application.organizationId !== null && actor.organizationId === application.organizationId;
    const ownsPersonalApplication = actor.role === 'DEVELOPER' && application.ownerDeveloperId === actor.id;
    const systemAdministrator = actor.role === 'SYSTEM_ADMIN';

    if (!belongsToOrganization && !ownsPersonalApplication && !systemAdministrator) {
      throw new ForbiddenException('Security event actor does not have access to this application');
    }

    return this.prisma.db.orm.public.SecurityEvent.create({
      actorUserId: actor.id,
      actorEmail: actor.email,
      organizationId: application.organizationId,
      applicationId: application.id,
      category: input.category,
      severity: input.severity ?? 'INFO',
      outcome: input.outcome ?? 'SUCCESS',
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      targetLabel: input.targetLabel ?? null,
      changedFields: input.changedFields && input.changedFields.length > 0 ? input.changedFields.join('|') : null,
      description: input.description ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      requestId: input.requestId ?? null,
    });
  }

  async getOrganizationApplicationEvents(userId: string, applicationId: string) {
    const user = await this.prisma.db.orm.public.User
      .select('id', 'role', 'organizationId')
      .where({ id: userId })
      .first();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'ORGANIZATION' || !user.organizationId) {
      throw new ForbiddenException('Only organization owners can view management activity');
    }

    const application = await this.prisma.db.orm.public.ClientApplication
      .select('id', 'organizationId')
      .where({ id: applicationId, organizationId: user.organizationId })
      .first();

    if (!application) {
      throw new NotFoundException('Client application not found');
    }

    const events = await this.prisma.db.orm.public.SecurityEvent
      .select(
        'id',
        'actorUserId',
        'actorEmail',
        'organizationId',
        'applicationId',
        'category',
        'severity',
        'outcome',
        'action',
        'targetType',
        'targetId',
        'targetLabel',
        'changedFields',
        'description',
        'ipAddress',
        'userAgent',
        'requestId',
        'createdAt',
      )
      .where({ organizationId: user.organizationId, applicationId: application.id })
      .all();

    return events
      .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))
      .map((event) => ({
        id: event.id,
        actorUserId: event.actorUserId,
        actorEmail: event.actorEmail,
        organizationId: event.organizationId,
        applicationId: event.applicationId,
        category: event.category,
        severity: event.severity,
        outcome: event.outcome,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId,
        targetLabel: event.targetLabel,
        changedFields: event.changedFields ? event.changedFields.split('|') : [],
        description: event.description,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        requestId: event.requestId,
        createdAt: event.createdAt,
      }));
  }

  async getDeveloperPersonalApplicationEvents(userId: string, applicationId: string) {
    const user = await this.prisma.db.orm.public.User
      .select('id', 'role', 'status', 'organizationId')
      .where({ id: userId })
      .first();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'DEVELOPER' || user.organizationId) {
      throw new ForbiddenException('Only independent developers can view personal application activity');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Only active independent developers can view personal application activity');
    }

    const application = await this.prisma.db.orm.public.ClientApplication
      .select('id', 'ownerDeveloperId')
      .where({ id: applicationId, ownerDeveloperId: user.id })
      .first();

    if (!application) {
      throw new NotFoundException('Personal application not found');
    }

    const events = await this.prisma.db.orm.public.SecurityEvent
      .select(
        'id',
        'actorUserId',
        'actorEmail',
        'organizationId',
        'applicationId',
        'category',
        'severity',
        'outcome',
        'action',
        'targetType',
        'targetId',
        'targetLabel',
        'changedFields',
        'description',
        'ipAddress',
        'userAgent',
        'requestId',
        'createdAt',
      )
      .where({ applicationId: application.id })
      .all();

    return events
      .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))
      .map((event) => ({
        id: event.id,
        actorUserId: event.actorUserId,
        actorEmail: event.actorEmail,
        organizationId: event.organizationId,
        applicationId: event.applicationId,
        category: event.category,
        severity: event.severity,
        outcome: event.outcome,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId,
        targetLabel: event.targetLabel,
        changedFields: event.changedFields ? event.changedFields.split('|') : [],
        description: event.description,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        requestId: event.requestId,
        createdAt: event.createdAt,
      }));
  }
}