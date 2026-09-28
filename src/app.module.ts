import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { buildDatabaseOptions } from './database.config';
import { HealthController } from './health.controller';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({ useFactory: () => buildDatabaseOptions() }),
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        // Public API: limit requests per IP. Disabled while running the test suite.
        throttlers: [{ ttl: 60_000, limit: Number(process.env.RATE_LIMIT ?? 120) }],
        skipIf: () => process.env.NODE_ENV === 'test',
      }),
    }),
    AuthModule,
    TasksModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
