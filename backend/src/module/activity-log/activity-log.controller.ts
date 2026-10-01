import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ActivityLogService } from './activity-log.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles/roles.guard.js';
import { Roles } from '../../common/decorators/roles/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user/current-user.decorator.js';

@ApiTags('Activity Logs')
@ApiBearerAuth()
@Controller('applications/:applicationId/activity')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORGANIZATION')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @ApiOperation({
    summary: 'Get gateway activity for a client application',
  })
  @ApiOkResponse({
    description: 'Application gateway activity returned successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired management JWT.',
  })
  @ApiForbiddenResponse({
    description: 'Only organization owners may view application activity.',
  })
  @ApiNotFoundResponse({
    description: 'Client application not found.',
  })
  getApplicationActivity(
    @CurrentUser() user: { sub: string },
    @Param('applicationId', new ParseUUIDPipe()) applicationId: string,
  ) {
    return this.activityLogService.getApplicationActivity(
      user.sub,
      applicationId,
    );
  }
}