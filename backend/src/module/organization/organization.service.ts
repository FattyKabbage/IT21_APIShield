import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../lib/database/prisma.service.js';
import { MailService } from '../../lib/mail/mail.service.js';
import { SecurityEventService } from '../security-event/security-event.service.js';
import { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import { CreateInvitationDto } from './dto/create-invitation.dto.js';

const INVITATION_TTL_MINUTES = 15;
const INVITATION_RESEND_COOLDOWN_SECONDS = 60;

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
    private readonly securityEventService: SecurityEventService,
  ) {}

  async getOrganization(userId: string) {
    const user = await this.prisma.db.orm.public.User.first({
      id: userId,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'ORGANIZATION' || !user.organizationId) {
      throw new ForbiddenException('Only organization owners can access organization data');
    }

    const organization = await this.prisma.db.orm.public.Organization.first({
      id: user.organizationId,
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async createInvitation(userId: string, dto: CreateInvitationDto) {
    const user = await this.prisma.db.orm.public.User.first({
      id: userId,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'ORGANIZATION' || !user.organizationId) {
      throw new ForbiddenException('Only organization owners can send invitations');
    }

    const email = dto.email.toLowerCase().trim();

    if (email === user.email) {
      throw new ConflictException('You cannot invite yourself');
    }

    const developer = await this.prisma.db.orm.public.User
      .where({
        email,
      })
      .first();

    if (developer?.organizationId === user.organizationId) {
      throw new ConflictException('Developer already belongs to this organization');
    }

    const pendingInvitation = await this.prisma.db.orm.public.OrganizationInvitation
      .where({
        organizationId: user.organizationId,
        email,
        status: 'PENDING',
      })
      .first();

    if (pendingInvitation) {
      const isExpired = new Date(pendingInvitation.expiresAt) < new Date();

      if (!isExpired) {
        throw new ConflictException('An invitation is already pending for this email');
      }

      await this.prisma.db.orm.public.OrganizationInvitation
        .where({
          id: pendingInvitation.id,
        })
        .update({
          status: 'EXPIRED',
        });
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MINUTES * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '+00');

    const invitation = await this.prisma.db.orm.public.OrganizationInvitation.create({
      organizationId: user.organizationId,
      email,
      tokenHash,
      expiresAt,
    });

    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    const invitationUrl = `${frontendUrl}/accept-invitation?token=${encodeURIComponent(token)}`;

    await this.mailService.sendMail(
      email,
      'You have been invited to APIShield',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <h1>APIShield Organization Invitation</h1>
          <p>You have been invited to join an organization on APIShield.</p>
          <p>
            <a href="${invitationUrl}" style="display: inline-block; padding: 12px 20px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px;">
              Accept Invitation
            </a>
          </p>
          <p>This invitation expires in ${INVITATION_TTL_MINUTES} minutes.</p>
          <p>If you were not expecting this invitation, you can safely ignore this email.</p>
        </div>
      `,
    );

    await this.securityEventService.recordSystemEvent({
      actorUserId: user.id,
      actorEmail: user.email,
      organizationId: user.organizationId,
      category: 'ORGANIZATION',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'ORGANIZATION_INVITATION_CREATED',
      targetType: 'ORGANIZATION_INVITATION',
      targetId: invitation.id,
      targetLabel: email,
      description: `Organization invitation for "${email}" was created.`,
    });

    return {
      message: 'Invitation sent successfully',
    };
  }

  async acceptInvitation(userId: string, dto: AcceptInvitationDto) {
    const user = await this.prisma.db.orm.public.User.first({
      id: userId,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'DEVELOPER') {
      throw new ForbiddenException('Only developers can accept invitations');
    }

    if (user.organizationId) {
      throw new ConflictException('Developer already belongs to an organization');
    }

    const tokenHash = createHash('sha256').update(dto.token).digest('hex');

    const invitation = await this.prisma.db.orm.public.OrganizationInvitation
      .where({
        tokenHash,
      })
      .first();

    if (!invitation) {
      throw new NotFoundException('Invalid invitation');
    }

    if (invitation.status !== 'PENDING') {
      throw new ConflictException('Invitation is no longer available');
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      await this.prisma.db.orm.public.OrganizationInvitation
        .where({
          id: invitation.id,
        })
        .update({
          status: 'EXPIRED',
        });

      throw new ConflictException('Invitation has expired');
    }

    if (user.email !== invitation.email) {
      throw new ForbiddenException('Invitation email does not match your account');
    }

    await this.prisma.db.orm.public.User
      .where({
        id: user.id,
      })
      .update({
        organizationId: invitation.organizationId,
      });

    await this.prisma.db.orm.public.OrganizationInvitation
      .where({
        id: invitation.id,
      })
      .update({
        status: 'ACCEPTED',
        acceptedAt: new Date().toISOString(),
      });

    await this.securityEventService.recordSystemEvent({
      actorUserId: user.id,
      actorEmail: user.email,
      organizationId: invitation.organizationId,
      category: 'ORGANIZATION',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'ORGANIZATION_INVITATION_ACCEPTED',
      targetType: 'ORGANIZATION_INVITATION',
      targetId: invitation.id,
      targetLabel: invitation.email,
      changedFields: ['status', 'acceptedAt'],
      description: `Organization invitation for "${invitation.email}" was accepted.`,
    });

    return {
      message: 'Invitation accepted successfully',
    };
  }

  async getMembers(userId: string) {
    const user = await this.prisma.db.orm.public.User.first({
      id: userId,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'ORGANIZATION' || !user.organizationId) {
      throw new ForbiddenException('Only organization owners can access members');
    }

    return this.prisma.db.orm.public.User
      .select('id', 'email', 'role', 'status', 'createdAt')
      .where({
        organizationId: user.organizationId,
      })
      .all();
  }

  async getInvitations(userId: string) {
    const user = await this.prisma.db.orm.public.User.first({
      id: userId,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'ORGANIZATION' || !user.organizationId) {
      throw new ForbiddenException('Only organization owners can access invitations');
    }

    return this.prisma.db.orm.public.OrganizationInvitation
      .select('id', 'email', 'expiresAt', 'acceptedAt', 'status', 'createdAt')
      .where({
        organizationId: user.organizationId,
      })
      .all();
  }

  async cancelInvitation(userId: string, invitationId: string) {
    const user = await this.prisma.db.orm.public.User.first({
      id: userId,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'ORGANIZATION' || !user.organizationId) {
      throw new ForbiddenException('Only organization owners can cancel invitations');
    }

    const invitation = await this.prisma.db.orm.public.OrganizationInvitation.first({
      id: invitationId,
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.organizationId !== user.organizationId) {
      throw new ForbiddenException('You cannot cancel an invitation from another organization');
    }

    if (invitation.status !== 'PENDING') {
      throw new ConflictException('Only pending invitations can be cancelled');
    }

    await this.prisma.db.orm.public.OrganizationInvitation
      .where({
        id: invitation.id,
      })
      .update({
        status: 'CANCELLED',
      });

    await this.securityEventService.recordSystemEvent({
      actorUserId: user.id,
      actorEmail: user.email,
      organizationId: user.organizationId,
      category: 'ORGANIZATION',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'ORGANIZATION_INVITATION_REVOKED',
      targetType: 'ORGANIZATION_INVITATION',
      targetId: invitation.id,
      targetLabel: invitation.email,
      changedFields: ['status'],
      description: `Organization invitation for "${invitation.email}" was cancelled.`,
    });

    return {
      message: 'Invitation cancelled successfully',
    };
  }

  async resendInvitation(userId: string, invitationId: string) {
    const user = await this.prisma.db.orm.public.User.first({
      id: userId,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'ORGANIZATION' || !user.organizationId) {
      throw new ForbiddenException('Only organization owners can resend invitations');
    }

    const invitation = await this.prisma.db.orm.public.OrganizationInvitation.first({
      id: invitationId,
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.organizationId !== user.organizationId) {
      throw new ForbiddenException('You cannot resend an invitation from another organization');
    }

    if (invitation.status === 'ACCEPTED') {
      throw new ConflictException('Accepted invitations cannot be resent');
    }

    if (invitation.status === 'CANCELLED') {
      throw new ConflictException('Cancelled invitations cannot be resent');
    }

    if (invitation.status === 'PENDING') {
      const originalIssueTime = new Date(invitation.expiresAt).getTime() - INVITATION_TTL_MINUTES * 60 * 1000;
      const resendAvailableAt = originalIssueTime + INVITATION_RESEND_COOLDOWN_SECONDS * 1000;

      if (Date.now() < resendAvailableAt) {
        throw new ConflictException('Please wait before resending this invitation');
      }
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MINUTES * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '+00');

    const previousInvitation = {
      tokenHash: invitation.tokenHash,
      expiresAt: invitation.expiresAt,
      status: invitation.status,
      acceptedAt: invitation.acceptedAt,
    };

    await this.prisma.db.orm.public.OrganizationInvitation
      .where({
        id: invitation.id,
      })
      .update({
        tokenHash,
        expiresAt,
        status: 'PENDING',
        acceptedAt: null,
      });

    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    const invitationUrl = `${frontendUrl}/accept-invitation?token=${encodeURIComponent(token)}`;

    try {
      await this.mailService.sendMail(
        invitation.email,
        'APIShield organization invitation',
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
            <h1>APIShield Organization Invitation</h1>
            <p>A new invitation link has been issued for you to join an organization on APIShield.</p>
            <p>
              <a href="${invitationUrl}" style="display: inline-block; padding: 12px 20px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px;">
                Accept Invitation
              </a>
            </p>
            <p>This invitation expires in ${INVITATION_TTL_MINUTES} minutes.</p>
            <p>If you were not expecting this invitation, you can safely ignore this email.</p>
          </div>
        `,
      );
    } catch (error) {
      await this.prisma.db.orm.public.OrganizationInvitation
        .where({
          id: invitation.id,
        })
        .update({
          tokenHash: previousInvitation.tokenHash,
          expiresAt: previousInvitation.expiresAt,
          status: previousInvitation.status,
          acceptedAt: previousInvitation.acceptedAt,
        });

      throw error;
    }

    await this.securityEventService.recordSystemEvent({
      actorUserId: user.id,
      actorEmail: user.email,
      organizationId: user.organizationId,
      category: 'ORGANIZATION',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'ORGANIZATION_INVITATION_RESENT',
      targetType: 'ORGANIZATION_INVITATION',
      targetId: invitation.id,
      targetLabel: invitation.email,
      changedFields: ['expiresAt', 'status'],
      description: `Organization invitation for "${invitation.email}" was resent.`,
    });

    return {
      message: 'Invitation resent successfully',
    };
  }
}