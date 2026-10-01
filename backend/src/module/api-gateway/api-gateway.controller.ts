import {
  Body,
  Controller,
  HttpStatus,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiGatewayTimeoutResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiGatewayService } from './api-gateway.service.js';
import { GatewayRequestDto } from './dto/gateway-request.dto.js';
import { ApplicationJwtGuard } from '../../common/guards/application-jwt/application-jwt.guard.js';
import { CurrentApplication } from '../../common/decorators/current-application/current-application.decorator.js';
import type { ApplicationJwtPayload } from '../application-auth/types/application-jwt-payload.js';
import { ApplicationRateLimitGuard } from '../../common/guards/application-rate-limit/application-rate-limit.guard.js';
import { Throttle } from '@nestjs/throttler/dist/throttler.decorator.js';

@ApiTags('API Gateway')
@ApiBearerAuth()
@Controller('gateway')
@UseGuards(ApplicationJwtGuard, ApplicationRateLimitGuard)
export class ApiGatewayController {
  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post('integrations/:integrationId/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a request through one of the authenticated application’s API integrations',
  })
  @ApiOkResponse({
    description: 'Provider request completed.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid request, disabled integration, or unsafe destination.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, expired, or revoked Application JWT.',
  })
  @ApiNotFoundResponse({
    description: 'Integration does not belong to the authenticated application.',
  })
  @ApiBadGatewayResponse({
    description: 'The external provider request failed.',
  })
  @ApiGatewayTimeoutResponse({
    description: 'The external provider request timed out.',
  })
  @ApiResponse({
    status: 429,
    description: 'Application gateway rate limit exceeded.',
})
  executeRequest(
    @CurrentApplication() application: ApplicationJwtPayload,
    @Param('integrationId', new ParseUUIDPipe()) integrationId: string,
    @Body() dto: GatewayRequestDto,
  ) {
    return this.apiGatewayService.executeRequest(
      application.sub,
      integrationId,
      dto,
    );
  }
}