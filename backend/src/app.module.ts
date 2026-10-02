import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { PrismaModule } from './lib/database/prisma.module.js';
import { MailModule } from './lib/mail/mail.module.js';
import { AuthModule } from './module/auth/auth.module.js';
import { OrganizationModule } from './module/organization/organization.module.js';
import { ApplicationModule } from './module/application/application.module.js';
import { ApplicationCredentialModule } from './module/application-credential/application-credential.module.js';
import { ApplicationAuthModule } from './module/application-auth/application-auth.module.js';
import { ApiIntegrationModule } from './module/api-integration/api-integration.module.js';
import { ApiGatewayModule } from './module/api-gateway/api-gateway.module.js';
import { ActivityLogModule } from './module/activity-log/activity-log.module.js';
import { DeveloperModule } from './module/developer/developer.module.js';
import { SystemAdminModule } from './module/system-admin/system-admin.module.js';
import { validateEnvironment } from './config/env.validation.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 60,
      },
    ]),
    PrismaModule,
    AuthModule,
    MailModule,
    OrganizationModule,
    ApplicationModule,
    ApplicationCredentialModule,
    ApplicationAuthModule,
    ApiIntegrationModule,
    ApiGatewayModule,
    ActivityLogModule,
    DeveloperModule,
    SystemAdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

