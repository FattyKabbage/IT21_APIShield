import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SecurityEventService } from './security-event.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles/roles.guard.js';
import { Roles } from '../../common/decorators/roles/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user/current-user.decorator.js';

@ApiTags('Management Activity')
@ApiBearerAuth()
@Controller(
  'applications/:applicationId/management-activity',
)
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles('ORGANIZATION')
export class SecurityEventController {
  constructor(
    private readonly securityEventService:
      SecurityEventService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Get management activity for a client application',
  })
  @ApiOkResponse({
    description:
      'Management activity returned successfully.',
  })
  @ApiBadRequestResponse({
    description:
      'Invalid application ID.',
  })
  @ApiUnauthorizedResponse({
    description:
      'Missing, invalid, or expired management JWT.',
  })
  @ApiForbiddenResponse({
    description:
      'Only organization owners may view management activity.',
  })
  @ApiNotFoundResponse({
    description:
      'Client application not found.',
  })
  getApplicationActivity(
    @CurrentUser()
    user: { sub: string },

    @Param(
      'applicationId',
      new ParseUUIDPipe(),
    )
    applicationId: string,
  ) {
    return this.securityEventService
      .getOrganizationApplicationEvents(
        user.sub,
        applicationId,
      );
  }
}