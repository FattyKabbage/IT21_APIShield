import { Module } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service.js';
import { ActivityLogController } from './activity-log.controller.js';

@Module({
  providers: [
    ActivityLogService,
  ],
  controllers: [
    ActivityLogController,
  ],
  exports: [
    ActivityLogService,
  ],
})
export class ActivityLogModule {}