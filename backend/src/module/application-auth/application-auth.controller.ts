import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ApplicationAuthService } from './application-auth.service.js';
import { ApplicationLoginDto } from './dto/application-login.dto.js';
import { ApplicationJwtGuard } from '../../common/guards/application-jwt/application-jwt.guard.js';
import { CurrentApplication } from '../../common/decorators/current-application/current-application.decorator.js';
import type { ApplicationJwtPayload } from './types/application-jwt-payload.js';

@ApiTags('Application Authentication')
@Controller('application-auth')
export class ApplicationAuthController {
  constructor(private readonly applicationAuthService: ApplicationAuthService) {}

  @Post('token')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate a registered application and issue an application JWT' })
  @ApiBody({ type: ApplicationLoginDto })
  @ApiOkResponse({ description: 'Application authenticated successfully.' })
  @ApiUnauthorizedResponse({ description: 'Invalid client credentials.' })
  @ApiResponse({ status: 429, description: 'Too many application authentication attempts.' })
  login(@Body() dto: ApplicationLoginDto) {
    return this.applicationAuthService.login(dto);
  }

  @Get('me')
  @UseGuards(ApplicationJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify the application JWT and return the authenticated application identity' })
  @ApiOkResponse({ description: 'Application JWT is valid.' })
  @ApiUnauthorizedResponse({ description: 'Application JWT is missing, invalid, expired, revoked, or belongs to a disabled application.' })
  getCurrentApplication(@CurrentApplication() application: ApplicationJwtPayload) {
    return {
      applicationId: application.sub,
      organizationId: application.organizationId,
      clientId: application.clientId,
      tokenType: application.tokenType,
    };
  }
}