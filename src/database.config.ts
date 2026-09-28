import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Task } from './tasks/task.entity';
import { User } from './users/user.entity';

/**
 * Database selection (read at startup, never at import time):
 *
 *  - DATABASE_URL set  -> PostgreSQL (Neon, Supabase, Render, Railway, any Postgres)
 *  - otherwise         -> SQLite file at DATABASE_PATH (zero-setup local development)
 *
 * DATABASE_SSL controls TLS for Postgres:
 *   "true" (default when the URL asks for it) verifies the server certificate,
 *   "no-verify" encrypts without verifying, "false" disables TLS (local Postgres).
 * DB_SYNC=false disables automatic schema creation (use migrations in larger projects).
 */
export function buildDatabaseOptions(): TypeOrmModuleOptions {
  const entities = [User, Task];
  const synchronize = process.env.DB_SYNC !== 'false';
  const url = process.env.DATABASE_URL;

  if (!url) {
    return {
      type: 'better-sqlite3',
      database: process.env.DATABASE_PATH ?? 'tasks.sqlite',
      entities,
      synchronize,
    };
  }

  const sslMode = process.env.DATABASE_SSL ?? (/sslmode=(require|verify)/i.test(url) ? 'true' : 'false');
  const ssl =
    sslMode === 'false' ? false : sslMode === 'no-verify' ? { rejectUnauthorized: false } : { rejectUnauthorized: true };

  return {
    type: 'postgres',
    url: stripSslMode(url),
    ssl,
    entities,
    synchronize,
    extra: { max: Number(process.env.DATABASE_POOL_MAX ?? 10) },
  };
}

/** TLS is configured through the `ssl` option, so the URL parameter is removed to avoid conflicts. */
function stripSslMode(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('sslmode');
    return parsed.toString();
  } catch {
    return url;
  }
}
