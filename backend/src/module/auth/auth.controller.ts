import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import type { AuthSecurityContext } from './auth.service.js';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user/current-user.decorator.js';

const REFRESH_COOKIE_NAME = 'apishield_refresh';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private getSecurityContext(request: Request): AuthSecurityContext {
    const requestIdHeader = request.headers['x-request-id'];
    const requestId = typeof requestIdHeader === 'string' ? requestIdHeader : Array.isArray(requestIdHeader) ? requestIdHeader[0] ?? null : null;

    return {
      ipAddress: request.ip ?? null,
      userAgent: request.get('user-agent') ?? null,
      requestId,
    };
  }

  private getCookieOptions() {
    const production = this.config.get<string>('NODE_ENV') === 'production';
    const days = Number(this.config.get<string>('REFRESH_TOKEN_EXPIRES_DAYS') ?? 7);

    return {
      httpOnly: true,
      secure: production,
      sameSite: production ? 'none' as const : 'lax' as const,
      path: '/auth',
      maxAge: days * 24 * 60 * 60 * 1000,
    };
  }

  private setRefreshCookie(response: Response, token: string) {
    response.cookie(REFRESH_COOKIE_NAME, token, this.getCookieOptions());
  }

  private clearRefreshCookie(response: Response) {
    const options = this.getCookieOptions();

    response.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: options.httpOnly,
      secure: options.secure,
      sameSite: options.sameSite,
      path: options.path,
    });
  }

  @Post('bootstrap')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 600_000 } })
  @ApiOperation({ summary: 'Bootstrap the initial system administrator' })
  @ApiBadRequestResponse({ description: 'Invalid bootstrap request.' })
  @ApiUnauthorizedResponse({ description: 'Invalid bootstrap credentials.' })
  @ApiConflictResponse({ description: 'A system administrator already exists.' })
  bootstrapAdmin(@Body() dto: BootstrapAdminDto) {
    return this.authService.bootstrapAdmin(dto);
  }

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @ApiOperation({ summary: 'Register an organization or developer account' })
  @ApiBadRequestResponse({ description: 'Invalid registration data.' })
  @ApiConflictResponse({ description: 'An account with this email already exists.' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate a user and create a refresh session' })
  @ApiBadRequestResponse({ description: 'Invalid login request.' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials or account is not allowed to log in.' })
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const session = await this.authService.login(dto, this.getSecurityContext(request));

    this.setRefreshCookie(response, session.refreshToken);

    return {
      access_token: session.accessToken,
    };
  }

  @Post('refresh')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh the management access token using the HttpOnly refresh session' })
  @ApiOkResponse({ description: 'Access token refreshed successfully.' })
  @ApiUnauthorizedResponse({ description: 'Refresh session is missing, invalid, expired, revoked, or no longer allowed.' })
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = request.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;

    try {
      const session = await this.authService.refresh(refreshToken ?? '');

      this.setRefreshCookie(response, session.refreshToken);

      return {
        access_token: session.accessToken,
      };
    } catch (error) {
      this.clearRefreshCookie(response);
      throw error;
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the current refresh session and sign out' })
  @ApiOkResponse({ description: 'Refresh session revoked and sign out recorded successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired management JWT.' })
  async logout(
    @CurrentUser() user: { sub: string; email: string; role: string },
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;

    try {
      return await this.authService.logout(user, refreshToken ?? null, this.getSecurityContext(request));
    } finally {
      this.clearRefreshCookie(response);
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  me(@CurrentUser() user: { sub: string; email: string; role: string }) {
    return user;
  }

  @Post('verify-email')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @ApiOperation({ summary: 'Verify a user email address' })
  @ApiBadRequestResponse({ description: 'Invalid verification request.' })
  @ApiUnauthorizedResponse({ description: 'Verification token is invalid, expired, or already used.' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 600_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request another email verification link' })
  @ApiOkResponse({ description: 'Generic response returned whether or not the account exists or requires verification.' })
  @ApiBadRequestResponse({ description: 'Invalid email address.' })
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }
}