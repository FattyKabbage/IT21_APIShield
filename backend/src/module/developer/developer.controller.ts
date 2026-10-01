import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { DeveloperService } from './developer.service.js';
import { ApiIntegrationService } from '../api-integration/api-integration.service.js';
import { ActivityLogService } from '../activity-log/activity-log.service.js';
import { ApplicationCredentialService } from '../application-credential/application-credential.service.js';
import { SecurityEventService } from '../security-event/security-event.service.js';
import { CreateApplicationDto } from '../application/dto/create-application.dto.js';
import { UpdateApplicationDto } from '../application/dto/update-application.dto.js';
import { CreateApiIntegrationDto } from '../api-integration/dto/create-api-integration.dto.js';
import { UpdateApiIntegrationDto } from '../api-integration/dto/update-api-integration.dto.js';
import { RotateApplicationCredentialDto } from '../application-credential/dto/rotate-application-credential.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles/roles.guard.js';
import { Roles } from '../../common/decorators/roles/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user/current-user.decorator.js';

@ApiTags('Developer')
@ApiBearerAuth()
@Controller('developer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEVELOPER')
export class DeveloperController {
  constructor(
    private readonly developerService: DeveloperService,
    private readonly apiIntegrationService: ApiIntegrationService,
    private readonly activityLogService: ActivityLogService,
    private readonly applicationCredentialService: ApplicationCredentialService,
    private readonly securityEventService: SecurityEventService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get authenticated developer workspace profile' })
  @ApiOkResponse({ description: 'Developer profile and organization membership returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'User does not have the DEVELOPER role.' })
  @ApiNotFoundResponse({ description: 'Authenticated developer was not found.' })
  getProfile(@CurrentUser() user: { sub: string }) {
    return this.developerService.getProfile(user.sub);
  }

  @Post('applications')
  @ApiOperation({ summary: 'Create one personal application for an independent developer' })
  @ApiCreatedResponse({ description: 'Personal application created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid application data.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'Only active independent developers can create a personal application.' })
  @ApiConflictResponse({ description: 'The independent developer already owns a personal application.' })
  createPersonalApplication(@CurrentUser() user: { sub: string }, @Body() dto: CreateApplicationDto) {
    return this.developerService.createPersonalApplication(user.sub, dto);
  }

  @Get('applications')
  @ApiOperation({ summary: 'Get applications available to the authenticated developer' })
  @ApiOkResponse({ description: 'Developer applications returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'User does not have the DEVELOPER role.' })
  getApplications(@CurrentUser() user: { sub: string }) {
    return this.developerService.getApplications(user.sub);
  }

  @Get('applications/:applicationId')
  @ApiOperation({ summary: 'Get one application available to the authenticated developer' })
  @ApiOkResponse({ description: 'Developer application returned successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid application ID.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'User does not have the DEVELOPER role.' })
  @ApiNotFoundResponse({ description: 'Developer application not found.' })
  getApplication(
    @CurrentUser() user: { sub: string },
    @Param('applicationId', new ParseUUIDPipe()) applicationId: string,
  ) {
    return this.developerService.getApplication(user.sub, applicationId);
  }

  @Patch('applications/:applicationId')
  @ApiOperation({ summary: 'Update a personal application owned by an independent developer' })
  @ApiOkResponse({ description: 'Personal application updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid application data or empty update.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'Organization developers cannot modify personal applications.' })
  @ApiNotFoundResponse({ description: 'Personal application not found.' })
  updatePersonalApplication(
    @CurrentUser() user: { sub: string },
    @Param('applicationId', new ParseUUIDPipe()) applicationId: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.developerService.updatePersonalApplication(user.sub, applicationId, dto);
  }

  @Get('applications/:applicationId/credentials')
  @ApiOperation({ summary: 'Get safe credential information for a developer application' })
  @ApiOkResponse({ description: 'Safe credential information returned successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid application ID.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'User does not have the DEVELOPER role.' })
  @ApiNotFoundResponse({ description: 'Developer application not found.' })
  getApplicationCredential(
    @CurrentUser() user: { sub: string },
    @Param('applicationId', new ParseUUIDPipe()) applicationId: string,
  ) {
    return this.developerService.getApplicationCredential(user.sub, applicationId);
  }

  @Post('applications/:applicationId/credentials')
  @ApiOperation({ summary: 'Generate credentials for an independent developer personal application' })
  @ApiCreatedResponse({ description: 'Personal application credentials generated successfully. The Client Secret is returned only once.' })
  @ApiBadRequestResponse({ description: 'Invalid application ID.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'Only an active independent developer may create credentials for their own personal application.' })
  @ApiConflictResponse({ description: 'Application is disabled or already has credentials.' })
  @ApiNotFoundResponse({ description: 'Personal application not found.' })
  createPersonalApplicationCredential(
    @CurrentUser() user: { sub: string },
    @Param('applicationId', new ParseUUIDPipe()) applicationId: string,
  ) {
    return this.applicationCredentialService.createDeveloperCredential(user.sub, applicationId);
  }

  @Post('applications/:applicationId/credentials/rotate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate credentials for an independent developer personal application' })
  @ApiOkResponse({ description: 'Personal application credentials rotated successfully. The new Client Secret is returned only once.' })
  @ApiBadRequestResponse({ description: 'Invalid application ID or request body.' })
  @ApiUnauthorizedResponse({ description: 'Missing/invalid JWT or incorrect current password.' })
  @ApiForbiddenResponse({ description: 'Only an active independent developer may rotate credentials for their own personal application.' })
  @ApiConflictResponse({ description: 'Credentials cannot be rotated while the application is disabled.' })
  @ApiNotFoundResponse({ description: 'Personal application or application credentials not found.' })
  rotatePersonalApplicationCredential(
    @CurrentUser() user: { sub: string },
    @Param('applicationId', new ParseUUIDPipe()) applicationId: string,
    @Body() dto: RotateApplicationCredentialDto,
  ) {
    return this.applicationCredentialService.rotateDeveloperCredential(user.sub, applicationId, dto.currentPassword);
  }

  @Get('applications/:applicationId/integrations')
  @ApiOperation({ summary: 'Get API integrations for a developer application' })
  @ApiOkResponse({ description: 'API integrations returned successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid application ID.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'Developer does not have access to this application.' })
  @ApiNotFoundResponse({ description: 'Developer application not found.' })
  getIntegrations(
    @CurrentUser() user: { sub: string },
    @Param('applicationId', new ParseUUIDPipe()) applicationId: string,
  ) {
    return this.apiIntegrationService.getIntegrations(user.sub, applicationId);
  }

  @Get('applications/:applicationId/integrations/:integrationId')
  @ApiOperation({ summary: 'Get one API integration for a developer application' })
  @ApiOkResponse({ description: 'API integration returned successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid application or integration ID.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'Developer does not have access to this application.' })
  @ApiNotFoundResponse({ description: 'Developer application or API integration not found.' })
  getIntegration(
    @CurrentUser() user: { sub: string },
    @Param('applicationId', new ParseUUIDPipe()) applicationId: string,
    @Param('integrationId', new ParseUUIDPipe()) integrationId: string,
  ) {
    return this.apiIntegrationService.getIntegration(user.sub, applicationId, integrationId);
  }

  @Post('applications/:applicationId/integrations')
  @ApiOperation({ summary: 'Create an API integration for a developer application' })
  @ApiCreatedResponse({ description: 'API integration created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid integration or credential configuration.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'Developer does not have access to this application.' })
  @ApiConflictResponse({ description: 'An integration with this name already exists.' })
  @ApiNotFoundResponse({ description: 'Developer application not found.' })
  createIntegration(
    @CurrentUser() user: { sub: string },
    @Param('applicationId', new ParseUUIDPipe()) applicationId: string,
    @Body() dto: CreateApiIntegrationDto,
  ) {
    return this.apiIntegrationService.createIntegration(user.sub, applicationId, dto);
  }

  @Patch('applications/:applicationId/integrations/:integrationId')
  @ApiOperation({ summary: 'Update an API integration for a developer application' })
  @ApiOkResponse({ description: 'API integration updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid integration or credential configuration.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'Developer does not have access to this application.' })
  @ApiConflictResponse({ description: 'An integration with this name already exists.' })
  @ApiNotFoundResponse({ description: 'Developer application or API integration not found.' })
  updateIntegration(
    @CurrentUser() user: { sub: string },
    @Param('applicationId', new ParseUUIDPipe()) applicationId: string,
    @Param('integrationId', new ParseUUIDPipe()) integrationId: string,
    @Body() dto: UpdateApiIntegrationDto,
  ) {
    return this.apiIntegrationService.updateIntegration(user.sub, applicationId, integrationId, dto);
  }

  @Get('applications/:applicationId/gateway-activity')
  @ApiOperation({ summary: 'Get gateway activity for a developer application' })
  @ApiOkResponse({ description: 'Gateway activity returned successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid application ID.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'User does not have the DEVELOPER role.' })
  @ApiNotFoundResponse({ description: 'Developer application not found.' })
  getGatewayActivity(
    @CurrentUser() user: { sub: string },
    @Param('applicationId', new ParseUUIDPipe()) applicationId: string,
  ) {
    return this.activityLogService.getDeveloperGatewayActivity(user.sub, applicationId);
  }

  @Get('applications/:applicationId/activity')
  @ApiOperation({ summary: 'Get management activity for an independent developer personal application' })
  @ApiOkResponse({ description: 'Personal application activity returned successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid application ID.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired JWT.' })
  @ApiForbiddenResponse({ description: 'Only an active independent developer may view personal application activity.' })
  @ApiNotFoundResponse({ description: 'Personal application not found.' })
  getPersonalApplicationActivity(
    @CurrentUser() user: { sub: string },
    @Param('applicationId', new ParseUUIDPipe()) applicationId: string,
  ) {
    return this.securityEventService.getDeveloperPersonalApplicationEvents(user.sub, applicationId);
  }
}