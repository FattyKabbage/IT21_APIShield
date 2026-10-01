import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../lib/database/prisma.service.js';
import { ApplicationLoginDto } from './dto/application-login.dto.js';

@Injectable()
export class ApplicationAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: ApplicationLoginDto) {
    const credential = await this.prisma.db.orm.public.ApplicationCredential
        .where({ clientId: dto.clientId,})
        .first();

    if (!credential) {
      throw new UnauthorizedException(
        'Invalid client credentials',
      );
    }

    if (credential.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Invalid client credentials',
      );
    }

    const secretMatches = await argon2.verify(
      credential.clientSecretHash,
      dto.clientSecret,
    );

    if (!secretMatches) {
      throw new UnauthorizedException(
        'Invalid client credentials',
      );
    }

    const application =
      await this.prisma.db.orm.public.ClientApplication
        .where({
          id: credential.applicationId,
        })
        .first();

    if (!application) {
      throw new UnauthorizedException(
        'Invalid client credentials',
      );
    }

    if (application.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Invalid client credentials',
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

    const accessToken =
      await this.jwtService.signAsync(
        {
          sub: application.id,
          organizationId: application.organizationId,
          clientId: credential.clientId,
          tokenType: 'APPLICATION',
        },
        {
          secret: applicationJwtSecret,
          algorithm: 'HS256',
          expiresIn: '15m',
        },
      );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      application: {
        id: application.id,
        name: application.name,
        environment: application.environment,
      },
    };
  }
}