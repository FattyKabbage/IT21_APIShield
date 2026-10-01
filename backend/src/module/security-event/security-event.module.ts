import { Module } from '@nestjs/common';
import { SecurityEventController } from './security-event.controller.js';
import { SecurityEventService } from './security-event.service.js';

@Module({
  controllers: [SecurityEventController],
  providers: [SecurityEventService],
  exports: [SecurityEventService],
})
export class SecurityEventModule {}