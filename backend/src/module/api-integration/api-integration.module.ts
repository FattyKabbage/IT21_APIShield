import { Module } from '@nestjs/common';
import { ApiIntegrationController } from './api-integration.controller.js';
import { ApiIntegrationService } from './api-integration.service.js';
import { ProviderCredentialEncryptionModule } from '../../lib/security/provider-credential-encryption.module.js';
import { OutboundUrlSafetyModule } from '../../lib/security/outbound-url-safety.module.js';
import { SecurityEventModule } from '../security-event/security-event.module.js';

@Module({
  imports: [
    ProviderCredentialEncryptionModule,
    OutboundUrlSafetyModule,
    SecurityEventModule,
  ],
  controllers: [
    ApiIntegrationController,
  ],
  providers: [
    ApiIntegrationService,
  ],
  exports: [
    ApiIntegrationService,
  ],
})
export class ApiIntegrationModule {}