import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import {
  ApiIntegrationService,
} from './api-integration.service.js';

import {
  CreateApiIntegrationDto,
} from './dto/create-api-integration.dto.js';

import {
  UpdateApiIntegrationDto,
} from './dto/update-api-integration.dto.js';

import {
  JwtAuthGuard,
} from '../../common/guards/jwt-auth/jwt-auth.guard.js';

import {
  RolesGuard,
} from '../../common/guards/roles/roles.guard.js';

import {
  Roles,
} from '../../common/decorators/roles/roles.decorator.js';

import {
  CurrentUser,
} from '../../common/decorators/current-user/current-user.decorator.js';

@ApiTags('API Integrations')
@ApiBearerAuth()
@Controller(
  'applications/:applicationId/integrations',
)
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles('ORGANIZATION')
export class ApiIntegrationController {
  constructor(
    private readonly apiIntegrationService:
      ApiIntegrationService,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      'Create a third-party API integration',
  })
  @ApiCreatedResponse({
    description:
      'API integration created successfully.',
  })
  @ApiBadRequestResponse({
    description:
      'Invalid integration or credential configuration.',
  })
  @ApiUnauthorizedResponse({
    description:
      'Missing, invalid, or expired management JWT.',
  })
  @ApiForbiddenResponse({
    description:
      'Only organization owners may manage integrations.',
  })
  @ApiNotFoundResponse({
    description:
      'Client application not found.',
  })
  @ApiConflictResponse({
    description:
      'An integration with this name already exists.',
  })
  createIntegration(
    @CurrentUser()
    user: { sub: string },

    @Param(
      'applicationId',
      new ParseUUIDPipe(),
    )
    applicationId: string,

    @Body()
    dto: CreateApiIntegrationDto,
  ) {
    return this.apiIntegrationService
      .createIntegration(
        user.sub,
        applicationId,
        dto,
      );
  }

  @Get()
  @ApiOperation({
    summary:
      'List API integrations for a client application',
  })
  @ApiOkResponse({
    description:
      'API integrations returned successfully.',
  })
  getIntegrations(
    @CurrentUser()
    user: { sub: string },

    @Param(
      'applicationId',
      new ParseUUIDPipe(),
    )
    applicationId: string,
  ) {
    return this.apiIntegrationService
      .getIntegrations(
        user.sub,
        applicationId,
      );
  }

  @Get(':integrationId')
  @ApiOperation({
    summary:
      'Get one API integration',
  })
  @ApiOkResponse({
    description:
      'API integration returned successfully.',
  })
  @ApiNotFoundResponse({
    description:
      'Client application or API integration not found.',
  })
  getIntegration(
    @CurrentUser()
    user: { sub: string },

    @Param(
      'applicationId',
      new ParseUUIDPipe(),
    )
    applicationId: string,

    @Param(
      'integrationId',
      new ParseUUIDPipe(),
    )
    integrationId: string,
  ) {
    return this.apiIntegrationService
      .getIntegration(
        user.sub,
        applicationId,
        integrationId,
      );
  }

  @Patch(':integrationId')
  @ApiOperation({
    summary:
      'Update an API integration or replace its provider credential',
  })
  @ApiOkResponse({
    description:
      'API integration updated successfully.',
  })
  @ApiBadRequestResponse({
    description:
      'Invalid integration or credential configuration.',
  })
  @ApiNotFoundResponse({
    description:
      'Client application or API integration not found.',
  })
  @ApiConflictResponse({
    description:
      'An integration with this name already exists.',
  })
  updateIntegration(
    @CurrentUser()
    user: { sub: string },

    @Param(
      'applicationId',
      new ParseUUIDPipe(),
    )
    applicationId: string,

    @Param(
      'integrationId',
      new ParseUUIDPipe(),
    )
    integrationId: string,

    @Body()
    dto: UpdateApiIntegrationDto,
  ) {
    return this.apiIntegrationService
      .updateIntegration(
        user.sub,
        applicationId,
        integrationId,
        dto,
      );
  }
}