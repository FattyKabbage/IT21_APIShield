import {
  Body,
  Controller,
  Delete,
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
import { ApplicationService } from './application.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationDto } from './dto/update-application.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles/roles.guard.js';
import { Roles } from '../../common/decorators/roles/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user/current-user.decorator.js';
import { AssignDeveloperDto } from './dto/assign-developer.dto.js';
import { RemoveDeveloperAccessDto } from './dto/remove-developer-access.dto.js';

@ApiTags('Applications')
@ApiBearerAuth()
@Controller('applications')
export class ApplicationController {
  constructor(
    private readonly applicationService: ApplicationService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZATION')
  @Post()
  @ApiOperation({
    summary: 'Create a client application',
  })
  @ApiCreatedResponse({
    description: 'Client application created successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid application data.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired JWT.',
  })
  @ApiForbiddenResponse({
    description:
      'User does not have the ORGANIZATION role.',
  })
  @ApiNotFoundResponse({
    description: 'Authenticated user not found.',
  })
  @ApiConflictResponse({
    description:
      'An application with this name already exists in the organization.',
  })
  createApplication(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateApplicationDto,
  ) {
    return this.applicationService.createApplication(
      user.sub,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZATION')
  @Get()
  @ApiOperation({
    summary:
      'Get client applications belonging to the authenticated organization',
  })
  @ApiOkResponse({
    description: 'Organization applications returned successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired JWT.',
  })
  @ApiForbiddenResponse({
    description:
      'User does not have the ORGANIZATION role.',
  })
  @ApiNotFoundResponse({
    description: 'Authenticated user not found.',
  })
  getApplications(
    @CurrentUser() user: { sub: string },
  ) {
    return this.applicationService.getApplications(
      user.sub,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZATION')
  @Get(':id')
  @ApiOperation({
    summary: 'Get one client application',
  })
  @ApiOkResponse({
    description: 'Client application returned successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid application ID.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired JWT.',
  })
  @ApiForbiddenResponse({
    description:
      'User does not have the ORGANIZATION role.',
  })
  @ApiNotFoundResponse({
    description:
      'Client application not found in the authenticated organization.',
  })
  getApplication(
    @CurrentUser() user: { sub: string },
    @Param('id', new ParseUUIDPipe())
    applicationId: string,
  ) {
    return this.applicationService.getApplication(
      user.sub,
      applicationId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZATION')
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a client application',
  })
  @ApiOkResponse({
    description: 'Client application updated successfully.',
  })
  @ApiBadRequestResponse({
    description:
      'Invalid application ID, application data, or empty update.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired JWT.',
  })
  @ApiForbiddenResponse({
    description:
      'User does not have the ORGANIZATION role.',
  })
  @ApiNotFoundResponse({
    description:
      'Client application not found in the authenticated organization.',
  })
  @ApiConflictResponse({
    description:
      'Another application with this name already exists.',
  })
  updateApplication(
    @CurrentUser() user: { sub: string },
    @Param('id', new ParseUUIDPipe())
    applicationId: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.applicationService.updateApplication(
      user.sub,
      applicationId,
      dto,
    );
  }

  //developer
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZATION')
  @Get(':applicationId/developers')
  @ApiOperation({
    summary: 'Get developers assigned to a client application',
  })
  @ApiOkResponse({
    description: 'Assigned developers returned successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired JWT.',
  })
  @ApiForbiddenResponse({
    description: 'Only organization owners may manage application access.',
  })
  @ApiNotFoundResponse({
    description: 'Client application not found.',
  })
  getApplicationDevelopers(
    @CurrentUser() user: { sub: string },
    @Param('applicationId', new ParseUUIDPipe())
    applicationId: string,
  ) {
    return this.applicationService.getApplicationDevelopers(
      user.sub,
      applicationId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZATION')
  @Post(':applicationId/developers')
  @ApiOperation({
    summary: 'Assign an organization developer to a client application',
  })
  @ApiCreatedResponse({
    description: 'Developer assigned successfully.',
  })
  @ApiBadRequestResponse({
    description:
      'Developer is not an active member of the authenticated organization.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired JWT.',
  })
  @ApiForbiddenResponse({
    description: 'Only organization owners may manage application access.',
  })
  @ApiNotFoundResponse({
    description: 'Client application or developer not found.',
  })
  @ApiConflictResponse({
    description: 'Developer already has access to this application.',
  })
  assignDeveloper(
    @CurrentUser() user: { sub: string },
    @Param('applicationId', new ParseUUIDPipe())
    applicationId: string,
    @Body() dto: AssignDeveloperDto,
  ) {
    return this.applicationService.assignDeveloper(
      user.sub,
      applicationId,
      dto,
    );
  }

 @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZATION')
  @Delete(':applicationId/developers/:developerId')
  @ApiOperation({
    summary: 'Remove a developer from a client application',
  })
  @ApiOkResponse({
    description: 'Developer access removed successfully.',
  })
  @ApiBadRequestResponse({
    description:
      'Invalid application ID, developer ID, or removal request.',
  })
  @ApiUnauthorizedResponse({
    description:
      'Missing, invalid, expired JWT, or incorrect current password.',
  })
  @ApiForbiddenResponse({
    description:
      'Only organization owners may manage application access.',
  })
  @ApiNotFoundResponse({
    description:
      'Client application or developer assignment not found.',
  })
  removeApplicationDeveloper(
    @CurrentUser() user: { sub: string },
    @Param('applicationId', new ParseUUIDPipe())
    applicationId: string,
    @Param('developerId', new ParseUUIDPipe())
    developerId: string,
    @Body() dto: RemoveDeveloperAccessDto,
  ) {
    return this.applicationService.removeApplicationDeveloper(
      user.sub,
      applicationId,
      developerId,
      dto,
    );
  }
}