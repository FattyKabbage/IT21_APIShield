import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SystemAdminService } from './system-admin.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles/roles.guard.js';
import { Roles } from '../../common/decorators/roles/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user/current-user.decorator.js';

@ApiTags('System Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSTEM_ADMIN')
export class SystemAdminController {
  constructor(private readonly systemAdminService: SystemAdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get system administration overview' })
  @ApiOkResponse({ description: 'System administration overview returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'Only active system administrators may access system administration.' })
  getOverview(@CurrentUser() user: { sub: string }) {
    return this.systemAdminService.getOverview(user.sub);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all system users' })
  @ApiOkResponse({ description: 'Safe system user information returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'Only system administrators may view system users.' })
  getUsers(@CurrentUser() user: { sub: string }) {
    return this.systemAdminService.getUsers(user.sub);
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get one system user' })
  @ApiOkResponse({ description: 'Safe system user information returned successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid user ID.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'Only system administrators may view system users.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  getUser(
    @CurrentUser() user: { sub: string },
    @Param('userId', new ParseUUIDPipe()) targetUserId: string,
  ) {
    return this.systemAdminService.getUser(user.sub, targetUserId);
  }

  @Get('organizations')
  @ApiOperation({ summary: 'Get all organizations' })
  @ApiOkResponse({ description: 'Organizations returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'Only system administrators may view organizations.' })
  getOrganizations(@CurrentUser() user: { sub: string }) {
    return this.systemAdminService.getOrganizations(user.sub);
  }

  @Get('organizations/:organizationId')
  @ApiOperation({ summary: 'Get one organization and its safe membership/application information' })
  @ApiOkResponse({ description: 'Organization details returned successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid organization ID.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'Only system administrators may view organizations.' })
  @ApiNotFoundResponse({ description: 'Organization not found.' })
  getOrganization(
    @CurrentUser() user: { sub: string },
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
  ) {
    return this.systemAdminService.getOrganization(user.sub, organizationId);
  }

  @Get('security-events')
  @ApiOperation({ summary: 'Get platform-wide security events' })
  @ApiOkResponse({ description: 'Platform security events returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'Only system administrators may view platform security events.' })
  getSecurityEvents(@CurrentUser() user: { sub: string }) {
    return this.systemAdminService.getSecurityEvents(user.sub);
  }
}