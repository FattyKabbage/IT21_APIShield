import { Module } from '@nestjs/common';
import { DeveloperController } from './developer.controller.js';
import { DeveloperService } from './developer.service.js';
import { ApiIntegrationModule } from '../api-integration/api-integration.module.js';
import { ActivityLogModule } from '../activity-log/activity-log.module.js';
import { SecurityEventModule } from '../security-event/security-event.module.js';
import { ApplicationCredentialModule } from '../application-credential/application-credential.module.js';

@Module({
  imports: [
    ApiIntegrationModule,
    ActivityLogModule,
    SecurityEventModule,
    ApplicationCredentialModule,
  ],
  controllers: [DeveloperController],
  providers: [DeveloperService],
})
export class DeveloperModule {}