import { Module } from '@nestjs/common';
import { ApiGatewayController } from './api-gateway.controller.js';
import { ApiGatewayService } from './api-gateway.service.js';
import { ApplicationAuthModule } from '../application-auth/application-auth.module.js';
import { ProviderCredentialEncryptionModule } from '../../lib/security/provider-credential-encryption.module.js';
import { OutboundUrlSafetyModule } from '../../lib/security/outbound-url-safety.module.js';
import { GatewayRateLimitModule } from '../../lib/security/gateway-rate-limit.module.js';

@Module({
  imports: [
    ApplicationAuthModule,
    ProviderCredentialEncryptionModule,
    OutboundUrlSafetyModule,
    GatewayRateLimitModule,
  ],
  controllers: [ApiGatewayController],
  providers: [ApiGatewayService],
})
export class ApiGatewayModule {}