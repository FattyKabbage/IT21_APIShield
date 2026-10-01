import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { ApplicationCredentialService } from './application-credential.service.js';
import { RotateApplicationCredentialDto } from './dto/rotate-application-credential.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles/roles.guard.js';
import { Roles } from '../../common/decorators/roles/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user/current-user.decorator.js';

@ApiTags('Application Credentials')
@ApiBearerAuth()
@Controller('applications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORGANIZATION')
export class ApplicationCredentialController {
  constructor(private readonly applicationCredentialService: ApplicationCredentialService) {}

  @Get(':applicationId/credentials')
  @ApiOperation({
    summary: 'Get safe credential information for a client application',
  })
  @ApiOkResponse({
    description: 'Safe application credential metadata returned successfully. The client secret hash is never exposed.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid application ID.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired management JWT.',
  })
  @ApiForbiddenResponse({
    description: 'Only organization owners can view application credentials.',
  })
  @ApiNotFoundResponse({
    description: 'User or client application not found.',
  })
  getCredential(
    @CurrentUser() user: { sub: string },
    @Param('applicationId', new ParseUUIDPipe()) applicationId: string,
  ) {
    return this.applicationCredentialService.getCredential(user.sub, applicationId);
  }

  @Post(':applicationId/credentials')
  @ApiOperation({
    summary: 'Generate credentials for a client application',
  })
  @ApiCreatedResponse({
    description: 'Application credentials generated successfully. The client secret is returned only once.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid application ID.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired management JWT.',
  })
  @ApiForbiddenResponse({
    description: 'Only organization owners can create application credentials.',
  })
  @ApiNotFoundResponse({
    description: 'User or client application not found.',
  })
  @ApiConflictResponse({
    description: 'Application is disabled or already has credentials.',
  })
  createCredential(
    @CurrentUser() user: { sub: string },
    @Param('applicationId', new ParseUUIDPipe()) applicationId: string,
  ) {
    return this.applicationCredentialService.createCredential(user.sub, applicationId);
  }

  @Post(':applicationId/credentials/rotate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate credentials for a client application',
  })
  @ApiOkResponse({
    description: 'New application credentials generated successfully. The new client secret is returned only once.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid application ID or request body.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing/invalid management JWT or incorrect current password.',
  })
  @ApiForbiddenResponse({
    description: 'Only organization owners can rotate application credentials.',
  })
  @ApiNotFoundResponse({
    description: 'User, client application, or application credentials not found.',
  })
  @ApiConflictResponse({
    description: 'Credentials cannot be rotated while the application is disabled.',
  })
  rotateCredential(
    @CurrentUser() user: { sub: string },
    @Param('applicationId', new ParseUUIDPipe()) applicationId: string,
    @Body() dto: RotateApplicationCredentialDto,
  ) {
    return this.applicationCredentialService.rotateCredential(user.sub, applicationId, dto.currentPassword);
  }
}