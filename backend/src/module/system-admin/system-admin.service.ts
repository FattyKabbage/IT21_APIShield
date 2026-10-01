import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service.js';

@Injectable()
export class SystemAdminService {
  constructor(private readonly prisma: PrismaService) {}

  private async getSystemAdmin(userId: string) {
    const user = await this.prisma.db.orm.public.User
      .select('id', 'role', 'status')
      .where({ id: userId })
      .first();

    if (!user) {
      throw new NotFoundException('System administrator not found');
    }

    if (user.role !== 'SYSTEM_ADMIN') {
      throw new ForbiddenException('Only system administrators can access system administration');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('System administrator account is not active');
    }

    return user;
  }

  async getOverview(userId: string) {
    await this.getSystemAdmin(userId);

    const [users, organizations, applications, securityEvents] = await Promise.all([
      this.prisma.db.orm.public.User.select('id', 'role', 'status').all(),
      this.prisma.db.orm.public.Organization.select('id').all(),
      this.prisma.db.orm.public.ClientApplication.select('id').all(),
      this.prisma.db.orm.public.SecurityEvent.select('id').all(),
    ]);

    return {
      totalUsers: users.length,
      totalOrganizations: organizations.length,
      totalApplications: applications.length,
      totalSecurityEvents: securityEvents.length,
      activeUsers: users.filter((user) => user.status === 'ACTIVE').length,
      suspendedUsers: users.filter((user) => user.status === 'SUSPENDED').length,
      organizationAccounts: users.filter((user) => user.role === 'ORGANIZATION').length,
      developerAccounts: users.filter((user) => user.role === 'DEVELOPER').length,
    };
  }

  async getUsers(userId: string) {
    await this.getSystemAdmin(userId);

    const [users, organizations] = await Promise.all([
      this.prisma.db.orm.public.User
        .select('id', 'email', 'role', 'status', 'organizationId', 'createdAt', 'updatedAt')
        .all(),
      this.prisma.db.orm.public.Organization.select('id', 'name').all(),
    ]);

    const organizationMap = new Map(organizations.map((organization) => [organization.id, organization.name]));

    return users
      .map((user) => ({
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        organizationId: user.organizationId,
        organizationName: user.organizationId ? organizationMap.get(user.organizationId) ?? null : null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }))
      .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
  }

  async getUser(userId: string, targetUserId: string) {
    await this.getSystemAdmin(userId);

    const user = await this.prisma.db.orm.public.User
      .select('id', 'email', 'role', 'status', 'organizationId', 'createdAt', 'updatedAt')
      .where({ id: targetUserId })
      .first();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let organization: { id: string; name: string } | null = null;

    if (user.organizationId) {
      const organizationRecord = await this.prisma.db.orm.public.Organization
        .select('id', 'name')
        .where({ id: user.organizationId })
        .first();

      if (organizationRecord) {
        organization = {
          id: organizationRecord.id,
          name: organizationRecord.name,
        };
      }
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      organizationId: user.organizationId,
      organization,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async getOrganizations(userId: string) {
    await this.getSystemAdmin(userId);

    const [organizations, users, applications] = await Promise.all([
      this.prisma.db.orm.public.Organization.select('id', 'name', 'createdAt', 'updatedAt').all(),
      this.prisma.db.orm.public.User.select('id', 'organizationId').all(),
      this.prisma.db.orm.public.ClientApplication.select('id', 'organizationId').all(),
    ]);

    return organizations
      .map((organization) => ({
        id: organization.id,
        name: organization.name,
        memberCount: users.filter((user) => user.organizationId === organization.id).length,
        applicationCount: applications.filter((application) => application.organizationId === organization.id).length,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
      }))
      .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
  }

  async getOrganization(userId: string, organizationId: string) {
    await this.getSystemAdmin(userId);

    const organization = await this.prisma.db.orm.public.Organization
      .select('id', 'name', 'createdAt', 'updatedAt')
      .where({ id: organizationId })
      .first();

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const [members, applications] = await Promise.all([
      this.prisma.db.orm.public.User
        .select('id', 'email', 'role', 'status', 'createdAt', 'updatedAt')
        .where({ organizationId: organization.id })
        .all(),
      this.prisma.db.orm.public.ClientApplication
        .select('id', 'name', 'description', 'environment', 'status', 'createdAt', 'updatedAt')
        .where({ organizationId: organization.id })
        .all(),
    ]);

    return {
      id: organization.id,
      name: organization.name,
      memberCount: members.length,
      applicationCount: applications.length,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
      members: members.sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt)),
      applications: applications.sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt)),
    };
  }

  async getSecurityEvents(userId: string) {
    await this.getSystemAdmin(userId);

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