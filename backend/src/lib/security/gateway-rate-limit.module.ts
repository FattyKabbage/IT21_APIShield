import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ApplicationRateLimitGuard } from '../../common/guards/application-rate-limit/application-rate-limit.guard.js';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const limit = Number(configService.get<string>('GATEWAY_RATE_LIMIT_MAX') ?? '60');
        const ttl = Number(configService.get<string>('GATEWAY_RATE_LIMIT_TTL_MS') ?? '60000');

        if (!Number.isInteger(limit) || limit <= 0) {
          throw new Error('GATEWAY_RATE_LIMIT_MAX must be a positive integer');
        }

        if (!Number.isInteger(ttl) || ttl <= 0) {
          throw new Error('GATEWAY_RATE_LIMIT_TTL_MS must be a positive integer');
        }

        return [
          {
            name: 'gateway',
            ttl,
            limit,
          },
        ];
      },
    }),
  ],
  providers: [ApplicationRateLimitGuard],
  exports: [ApplicationRateLimitGuard],
})
export class GatewayRateLimitModule {}