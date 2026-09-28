import { buildDatabaseOptions } from '../src/database.config';

describe('buildDatabaseOptions', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('uses SQLite when DATABASE_URL is not set', () => {
    delete process.env.DATABASE_URL;
    process.env.DATABASE_PATH = 'local.sqlite';
    expect(buildDatabaseOptions()).toMatchObject({ type: 'better-sqlite3', database: 'local.sqlite' });
  });

  it('uses PostgreSQL with verified TLS for cloud URLs asking for sslmode=require', () => {
    delete process.env.DATABASE_SSL;
    process.env.DATABASE_URL = 'postgresql://user:pw@ep-cool.neon.tech/db?sslmode=require';
    const opts = buildDatabaseOptions() as any;
    expect(opts.type).toBe('postgres');
    expect(opts.url).toBe('postgresql://user:pw@ep-cool.neon.tech/db');
    expect(opts.ssl).toEqual({ rejectUnauthorized: true });
  });

  it('disables TLS for plain local URLs and honours overrides', () => {
    delete process.env.DATABASE_SSL;
    process.env.DATABASE_URL = 'postgres://app:secret@localhost:5432/tasks';
    expect((buildDatabaseOptions() as any).ssl).toBe(false);

    process.env.DATABASE_SSL = 'no-verify';
    expect((buildDatabaseOptions() as any).ssl).toEqual({ rejectUnauthorized: false });
  });

  it('keeps other query parameters when stripping sslmode', () => {
    process.env.DATABASE_URL = 'postgres://u:p@h/db?sslmode=require&application_name=api';
    expect((buildDatabaseOptions() as any).url).toBe('postgres://u:p@h/db?application_name=api');
  });
});
