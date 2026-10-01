
import { Module } from '@nestjs/common';
import { OutboundUrlSafetyService } from './outbound-url-safety.service.js';

@Module({
  providers: [OutboundUrlSafetyService],
  exports: [OutboundUrlSafetyService],
})
export class OutboundUrlSafetyModule {}