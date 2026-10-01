import { Module } from '@nestjs/common';
import { ApplicationCredentialService } from './application-credential.service.js';
import { ApplicationCredentialController } from './application-credential.controller.js';
import { SecurityEventModule } from '../security-event/security-event.module.js';

@Module({
  imports: [SecurityEventModule],
  providers: [ApplicationCredentialService],
  controllers: [ApplicationCredentialController],
  exports: [ApplicationCredentialService],
})
export class ApplicationCredentialModule {}