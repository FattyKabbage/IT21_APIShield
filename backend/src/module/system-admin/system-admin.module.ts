import { Module } from '@nestjs/common';
import { SystemAdminController } from './system-admin.controller.js';
import { SystemAdminService } from './system-admin.service.js';

@Module({
  controllers: [SystemAdminController],
  providers: [SystemAdminService],
})
export class SystemAdminModule {}