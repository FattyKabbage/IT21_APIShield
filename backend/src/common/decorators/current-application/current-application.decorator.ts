import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { ApplicationJwtPayload } from '../../../module/application-auth/types/application-jwt-payload.js';

export const CurrentApplication =
  createParamDecorator(
    (
      _data: unknown,
      context: ExecutionContext,
    ): ApplicationJwtPayload => {
      const request = context
        .switchToHttp()
        .getRequest<{
          application: ApplicationJwtPayload;
        }>();

      return request.application;
    },
  );