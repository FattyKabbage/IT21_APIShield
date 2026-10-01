import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ApplicationRateLimitGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const applicationId = req.application?.sub;

    if (typeof applicationId === 'string' && applicationId) {
      return `application:${applicationId}`;
    }

    return req.ip ?? 'unknown';
  }
}