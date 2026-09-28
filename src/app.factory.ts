import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

export async function createApp(): Promise<INestApplication> {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production');
  }
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  // Behind a reverse proxy (Render, Vercel, Nginx) the real client IP comes from X-Forwarded-For
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Task Manager API')
    .setDescription('REST API with JWT authentication, filtering, pagination and stats')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  return app;
}
