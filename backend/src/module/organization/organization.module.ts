import { Module } from '@nestjs/common';
import { OrganizationController } from './organization.controller.js';
import { OrganizationService } from './organization.service.js';
import { SecurityEventModule } from '../security-event/security-event.module.js';

@Module({
  imports: [SecurityEventModule],
  controllers: [OrganizationController],
  providers: [OrganizationService],
})
export class OrganizationModule {}