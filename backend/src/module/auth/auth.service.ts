import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../lib/database/prisma.service.js';
import { MailService } from '../../lib/mail/mail.service.js';
import { SecurityEventService } from '../security-event/security-event.service.js';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

export interface AuthSecurityContext {
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

export interface AuthSessionResult {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly mailService: MailService,
    private readonly securityEventService: SecurityEventService,
  ) {}

  private hashRefreshToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateRefreshToken() {
    return randomBytes(48).toString('base64url');
  }

  private getRefreshExpiresAt() {
    const days = Number(this.config.get<string>('REFRESH_TOKEN_EXPIRES_DAYS') ?? 7);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  private async createAccessToken(user: { id: string; email: string; role: string }) {
    return this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  private async createRefreshSession(userId: string) {
    const refreshToken = this.generateRefreshToken();

    await this.prisma.db.orm.public.RefreshSession.create({
      userId,
      tokenHash: this.hashRefreshToken(refreshToken),
      expiresAt: this.getRefreshExpiresAt(),
    });

    return refreshToken;
  }

  async bootstrapAdmin(dto: BootstrapAdminDto) {
    const bootstrapSecret = this.config.getOrThrow<string>('BOOTSTRAP_SECRET');

    if (dto.bootstrapSecret !== bootstrapSecret) {
      throw new UnauthorizedException('Invalid bootstrap credentials');
    }

    const admin = await this.prisma.db.orm.public.User.first({
      role: 'SYSTEM_ADMIN',
    });

    if (admin) {
      throw new ConflictException('System administrator already exists');
    }

    const email = dto.email.toLowerCase().trim();
    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.db.orm.public.User.create({
      email,
      passwordHash,
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();

    const existingUser = await this.prisma.db.orm.public.User
      .where({ email })
      .first();

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    if (dto.type === 'ORGANIZATION' && !dto.organizationName?.trim()) {
      throw new ConflictException('Organization name is required');
    }

    const passwordHash = await argon2.hash(dto.password);
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    let user;

    if (dto.type === 'ORGANIZATION') {
      const organization = await this.prisma.db.orm.public.Organization.create({
        name: dto.organizationName!.trim(),
      });

      user = await this.prisma.db.orm.public.User.create({
        email,
        passwordHash,
        role: 'ORGANIZATION',
        status: 'PENDING_VERIFICATION',
        organizationId: organization.id,
      });
    } else {
      user = await this.prisma.db.orm.public.User.create({
        email,
        passwordHash,
        role: 'DEVELOPER',
        status: 'PENDING_VERIFICATION',
      });
    }

    await this.prisma.db.orm.public.EmailVerification.create({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '+00'),
    });

    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    const verificationUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

    await this.mailService.sendMail(
      email,
      'Verify your APIShield account',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <h1>Welcome to APIShield</h1>
          <p>Thank you for registering. Please verify your email address to activate your account.</p>
          <p><a href="${verificationUrl}" style="display: inline-block; padding: 12px 20px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px;">Verify My Account</a></p>
          <p>This verification link expires in 15 minutes.</p>
          <p>If you did not create this account, you can safely ignore this email.</p>
        </div>
      `,
    );

    return {
      message: 'Registration successful. Please verify your email.',
    };
  }

  async login(dto: LoginDto, context: AuthSecurityContext = {}): Promise<AuthSessionResult> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.db.orm.public.User.where({ email }).first();

    if (!user) {
      await this.securityEventService.recordSystemEvent({
        actorEmail: email,
        category: 'AUTHENTICATION',
        severity: 'WARNING',
        outcome: 'FAILURE',
        action: 'USER_LOGIN_FAILED',
        targetType: 'USER',
        targetLabel: email,
        description: 'Login attempt failed because the credentials were invalid.',
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
        requestId: context.requestId ?? null,
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await argon2.verify(user.passwordHash, dto.password);

    if (!passwordMatches) {
      await this.securityEventService.recordSystemEvent({
        actorUserId: user.id,
        actorEmail: user.email,
        organizationId: user.organizationId,
        category: 'AUTHENTICATION',
        severity: 'WARNING',
        outcome: 'FAILURE',
        action: 'USER_LOGIN_FAILED',
        targetType: 'USER',
        targetId: user.id,
        targetLabel: user.email,
        description: 'Login attempt failed because the credentials were invalid.',
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
        requestId: context.requestId ?? null,
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'PENDING_VERIFICATION') {
      await this.securityEventService.recordSystemEvent({
        actorUserId: user.id,
        actorEmail: user.email,
        organizationId: user.organizationId,
        category: 'AUTHENTICATION',
        severity: 'WARNING',
        outcome: 'DENIED',
        action: 'USER_LOGIN_FAILED',
        targetType: 'USER',
        targetId: user.id,
        targetLabel: user.email,
        description: 'Login attempt denied because the account is awaiting email verification.',
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
        requestId: context.requestId ?? null,
      });

      throw new UnauthorizedException('Please verify your email before logging in');
    }

    if (user.status === 'SUSPENDED') {
      await this.securityEventService.recordSystemEvent({
        actorUserId: user.id,
        actorEmail: user.email,
        organizationId: user.organizationId,
        category: 'AUTHENTICATION',
        severity: 'WARNING',
        outcome: 'DENIED',
        action: 'USER_LOGIN_FAILED',
        targetType: 'USER',
        targetId: user.id,
        targetLabel: user.email,
        description: 'Login attempt denied because the account is suspended.',
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
        requestId: context.requestId ?? null,
      });

      throw new UnauthorizedException('Account is suspended');
    }

    const accessToken = await this.createAccessToken(user);
    const refreshToken = await this.createRefreshSession(user.id);

    await this.securityEventService.recordSystemEvent({
      actorUserId: user.id,
      actorEmail: user.email,
      organizationId: user.organizationId,
      category: 'AUTHENTICATION',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'USER_LOGIN_SUCCEEDED',
      targetType: 'USER',
      targetId: user.id,
      targetLabel: user.email,
      description: 'User authenticated successfully.',
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      requestId: context.requestId ?? null,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string): Promise<AuthSessionResult> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh session is missing');
    }

    const tokenHash = this.hashRefreshToken(refreshToken);

    const session = await this.prisma.db.orm.public.RefreshSession
      .where({ tokenHash })
      .first();

    if (!session || session.revokedAt) {
      throw new UnauthorizedException('Refresh session is invalid');
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await this.prisma.db.orm.public.RefreshSession
        .where({ id: session.id })
        .update({
          revokedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

      throw new UnauthorizedException('Refresh session has expired');
    }

    const user = await this.prisma.db.orm.public.User
      .where({ id: session.userId })
      .first();

    if (!user || user.status !== 'ACTIVE') {
      await this.prisma.db.orm.public.RefreshSession
        .where({ id: session.id })
        .update({
          revokedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

      throw new UnauthorizedException('Refresh session is no longer allowed');
    }

    const nextRefreshToken = this.generateRefreshToken();

    const updatedSession = await this.prisma.db.orm.public.RefreshSession
      .where({
        id: session.id,
        tokenHash,
      })
      .update({
        tokenHash: this.hashRefreshToken(nextRefreshToken),
        expiresAt: this.getRefreshExpiresAt(),
        updatedAt: new Date().toISOString(),
      });

    if (!updatedSession) {
      throw new UnauthorizedException('Refresh session is no longer valid');
    }

    const accessToken = await this.createAccessToken(user);

    return {
      accessToken,
      refreshToken: nextRefreshToken,
    };
  }

  async logout(user: { sub: string; email: string }, refreshToken: string | null, context: AuthSecurityContext = {}) {
    if (refreshToken) {
      const tokenHash = this.hashRefreshToken(refreshToken);

      const session = await this.prisma.db.orm.public.RefreshSession
        .where({
          userId: user.sub,
          tokenHash,
        })
        .first();

      if (session && !session.revokedAt) {
        await this.prisma.db.orm.public.RefreshSession
          .where({ id: session.id })
          .update({
            revokedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
      }
    }

    await this.securityEventService.recordSystemEvent({
      actorUserId: user.sub,
      actorEmail: user.email,
      category: 'AUTHENTICATION',
      severity: 'INFO',
      outcome: 'SUCCESS',
      action: 'USER_LOGOUT',
      targetType: 'USER',
      targetId: user.sub,
      targetLabel: user.email,
      description: 'User signed out from APIShield.',
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      requestId: context.requestId ?? null,
    });

    return {
      message: 'Signed out successfully',
    };
  }

  async resendVerification(emailInput: string) {
    const genericResponse = {
      message: 'If an account with that email is awaiting verification, a new verification link has been sent.',
    };

    const email = emailInput.toLowerCase().trim();
    const user = await this.prisma.db.orm.public.User.where({ email }).first();

    if (!user || user.status !== 'PENDING_VERIFICATION') {
      return genericResponse;
    }

    const existingVerification = await this.prisma.db.orm.public.EmailVerification
      .where({ userId: user.id })
      .first();

    if (existingVerification && !existingVerification.usedAt) {
      const originalIssueTime = new Date(existingVerification.expiresAt).getTime() - 15 * 60 * 1000;
      const resendAvailableAt = originalIssueTime + 60 * 1000;

      if (Date.now() < resendAvailableAt) {
        return genericResponse;
      }
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '+00');

    const previousVerification = existingVerification
      ? {
          tokenHash: existingVerification.tokenHash,
          expiresAt: existingVerification.expiresAt,
          usedAt: existingVerification.usedAt,
        }
      : null;

    let verificationId: string;

    if (existingVerification) {
      await this.prisma.db.orm.public.EmailVerification
        .where({ id: existingVerification.id })
        .update({
          tokenHash,
          expiresAt,
          usedAt: null,
        });

      verificationId = existingVerification.id;
    } else {
      const createdVerification = await this.prisma.db.orm.public.EmailVerification.create({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      verificationId = createdVerification.id;
    }

    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    const verificationUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

    try {
      await this.mailService.sendMail(
        user.email,
        'Verify your APIShield account',
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
            <h1>Verify your APIShield account</h1>
            <p>A new email verification link was requested for your APIShield account.</p>
            <p><a href="${verificationUrl}" style="display: inline-block; padding: 12px 20px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px;">Verify My Account</a></p>
            <p>This verification link expires in 15 minutes.</p>
            <p>If you did not request another verification email, you can safely ignore this message.</p>
          </div>
        `,
      );
    } catch (error) {
      if (previousVerification) {
        await this.prisma.db.orm.public.EmailVerification
          .where({ id: verificationId })
          .update({
            tokenHash: previousVerification.tokenHash,
            expiresAt: previousVerification.expiresAt,
            usedAt: previousVerification.usedAt,
          });
      } else {
        await this.prisma.db.orm.public.EmailVerification
          .where({ id: verificationId })
          .update({
            usedAt: new Date().toISOString(),
          });
      }

      throw error;
    }

    return genericResponse;
  }

  async verifyEmail(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const verification = await this.prisma.db.orm.public.EmailVerification
      .where({ tokenHash })
      .first();

    if (!verification) {
      throw new UnauthorizedException('Invalid verification token');
    }

    if (verification.usedAt) {
      throw new UnauthorizedException('Verification token has already been used');
    }

    if (new Date(verification.expiresAt) < new Date()) {
      throw new UnauthorizedException('Verification token has expired');
    }

    await this.prisma.db.orm.public.User
      .where({ id: verification.userId })
      .update({
        status: 'ACTIVE',
      });

    await this.prisma.db.orm.public.EmailVerification
      .where({ id: verification.id })
      .update({
        usedAt: new Date().toISOString(),
      });

    return {
      message: 'Email verified successfully',
    };
  }
}