import { Module } from '@nestjs/common';
import { ApplicationController } from './application.controller.js';
import { ApplicationService } from './application.service.js';
import { SecurityEventModule } from '../security-event/security-event.module.js';

@Module({
  imports: [SecurityEventModule],
  controllers: [ApplicationController],
  providers: [ApplicationService],
})
export class ApplicationModule {}