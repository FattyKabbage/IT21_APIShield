import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const frontendUrl = config.getOrThrow<string>('FRONTEND_URL');
  const port = Number(config.get<string>('PORT') ?? 3000);

  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  app.use(helmet());
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('APIShield API')
    .setDescription('Secure API management and security platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  // const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig);

  // SwaggerModule.setup('api', app, documentFactory);
  const swaggerEnabled = config.get<string>('SWAGGER_ENABLED') !== 'false';

if (swaggerEnabled) {
  const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, documentFactory);
}

  await app.listen(port, '0.0.0.0');
}

await bootstrap();