import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../lib/database/prisma.service.js';
import type { ApplicationJwtPayload } from '../../../module/application-auth/types/application-jwt-payload.js';

@Injectable()
export class ApplicationJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{
        headers: {
          authorization?: string;
        };
        application?: ApplicationJwtPayload;
      }>();

    const authorization =
      request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException(
        'Application authentication required',
      );
    }

    const [scheme, token] =
      authorization.split(' ');

    if (
      scheme !== 'Bearer' ||
      !token
    ) {
      throw new UnauthorizedException(
        'Invalid application authorization header',
      );
    }

    const applicationJwtSecret =
      this.configService.get<string>(
        'APPLICATION_JWT_SECRET',
      );

    if (!applicationJwtSecret) {
      throw new Error(
        'APPLICATION_JWT_SECRET is not configured',
      );
    }

    let payload: ApplicationJwtPayload;

    try {
        //verify if it was signes using the systems app_jwt_secret
        //verify if it is modified  or expired
      payload =
        await this.jwtService.verifyAsync<ApplicationJwtPayload>(
          token,
          {
            secret: applicationJwtSecret,
            algorithms: ['HS256'],
          },
        );
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired application token',
      );
    }

    if (
      payload.tokenType !== 'APPLICATION' ||
      !payload.sub ||
      !payload.organizationId ||
      !payload.clientId
    ) {
      throw new UnauthorizedException(
        'Invalid application token',
      );
    }

    const credential =
      await this.prisma.db.orm.public.ApplicationCredential
        .where({
          clientId: payload.clientId,
        })
        .first();

    if (
      !credential ||
      credential.status !== 'ACTIVE' ||
      credential.applicationId !== payload.sub
    ) {
      throw new UnauthorizedException(
        'Application credential is no longer valid',
      );
    }

    const application =
      await this.prisma.db.orm.public.ClientApplication
        .where({
          id: payload.sub,
          organizationId: payload.organizationId,
        })
        .first();

    if (
      !application ||
      application.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException(
        'Application is no longer active',
      );
    }

    request.application = payload;

    return true;
  }
}