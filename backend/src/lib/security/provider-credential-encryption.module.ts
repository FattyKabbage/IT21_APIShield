import { Module } from '@nestjs/common';
import { ProviderCredentialEncryptionService } from './provider-credential-encryption.service.js';

@Module({
  providers: [
    ProviderCredentialEncryptionService,
  ],
  exports: [
    ProviderCredentialEncryptionService,
  ],
})
export class ProviderCredentialEncryptionModule {}