# Task Manager API

A production-style REST API for managing tasks, built with **NestJS**, **TypeScript**, **TypeORM** and **JWT authentication**. It includes request validation, filtering and pagination, per-user data isolation, auto-generated **Swagger** documentation, end-to-end tests and a Dockerfile.

![Swagger UI](docs/swagger.png)

## Features

- JWT authentication: register, login and a protected `/auth/me` endpoint
- Passwords hashed with bcrypt; emails normalized to lowercase
- Tasks CRUD with status (`todo`, `in_progress`, `done`), priority (`low`, `medium`, `high`) and due date
- Filtering by status and priority, text search, and pagination
- `GET /tasks/stats` with counts by status and completion rate (used by the [dashboard](https://github.com/WilliamFFO/tasks-dashboard))
- Each user only sees their own tasks
- Global validation with `class-validator` (unknown fields are stripped, invalid input returns `400`)
- Interactive API docs at `/docs` (OpenAPI JSON at `/docs-json`)
- 19 automated tests (Jest and Supertest), run against both SQLite and PostgreSQL
- **PostgreSQL in the cloud** (Neon, Supabase, Render...) through a single `DATABASE_URL`, or a zero-setup SQLite file for local development
- Rate limiting per IP (stricter on login and registration) and a startup check that refuses to run in production without `JWT_SECRET`
- Multi-stage Dockerfile and a `render.yaml` blueprint

## Tech stack

NestJS 11 · TypeScript · TypeORM · PostgreSQL / SQLite · Passport JWT · class-validator · Swagger · Jest · Docker

## Getting started

```bash
git clone https://github.com/WilliamFFO/task-manager-api.git
cd task-manager-api
npm install
cp .env.example .env      # optional, sensible defaults are built in
npm run start:dev
```

The API runs on `http://localhost:3000` and the docs on `http://localhost:3000/docs`.

Optional: load demo data (a demo user and 12 tasks) while the API is running. Real users simply register with `POST /auth/register`.

```bash
npm run seed
# demo@example.com / Demo-pass123
```

### Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `JWT_SECRET` | `dev-secret` | Secret used to sign tokens. **Set a strong value in production.** |
| `JWT_EXPIRES_IN` | `1d` | Token lifetime |
| `DATABASE_URL` | empty | PostgreSQL connection string. When set, it is used instead of SQLite |
| `DATABASE_PATH` | `tasks.sqlite` | SQLite file path (only when `DATABASE_URL` is empty) |
| `DATABASE_SSL` | auto | Postgres TLS: `true`, `no-verify` or `false`. Auto enables it when the URL contains `sslmode=require` |
| `CORS_ORIGIN` | any | Comma-separated list of allowed origins |
| `RATE_LIMIT` | `120` | Requests per minute per IP (login and register: 10 per minute) |
| `DB_SYNC` | `true` | Set to `false` to stop TypeORM from creating and altering tables automatically |

## API overview

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | No | Create an account and receive a JWT |
| `POST` | `/auth/login` | No | Log in and receive a JWT |
| `GET` | `/auth/me` | Yes | Current user |
| `POST` | `/tasks` | Yes | Create a task |
| `GET` | `/tasks` | Yes | List tasks (`status`, `priority`, `search`, `page`, `limit`) |
| `GET` | `/tasks/stats` | Yes | Counts by status and completion rate |
| `GET` | `/tasks/:id` | Yes | Get one task |
| `PATCH` | `/tasks/:id` | Yes | Update a task |
| `DELETE` | `/tasks/:id` | Yes | Delete a task |
| `GET` | `/health` | No | Health check |

### Example

```bash
# 1. Register
curl -s -X POST http://localhost:3000/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"ana@example.com","name":"Ana Torres","password":"S3cure-pass"}'

# 2. Create a task with the returned accessToken
curl -s -X POST http://localhost:3000/tasks \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"title":"Ship v1","priority":"high","dueDate":"2026-12-31"}'

# 3. List high priority tasks that are still open
curl -s "http://localhost:3000/tasks?priority=high&status=todo" \
  -H "authorization: Bearer $TOKEN"
```

## Cloud database (PostgreSQL)

Users, tasks and passwords (hashed) live in the database, so accounts persist across restarts and deployments.

1. Create a free PostgreSQL database at [Neon](https://neon.tech) or [Supabase](https://supabase.com) and copy its connection string.
2. Set it as `DATABASE_URL`:

```bash
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require" npm run start:dev
```

Tables are created automatically on the first start. To run the test suite against Postgres instead of SQLite:

```bash
DATABASE_URL="postgres://user:password@localhost:5432/tasks_test" DATABASE_SSL=false npm test
```

## Tests

```bash
npm test
```

The suite covers registration and login, validation errors, protected routes, task CRUD, filters, pagination, stats, data isolation between users, the Swagger document and the database configuration (SQLite and PostgreSQL with TLS options).

## Docker

```bash
docker build -t task-manager-api .
docker run -p 3000:3000 \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  -e DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require" \
  task-manager-api
```

## Deploy on Render (free)

1. Push the repository to GitHub.
2. In Render choose **New > Blueprint** and select the repository (it reads `render.yaml`).
3. Set `DATABASE_URL` (your Neon or Supabase string) and `CORS_ORIGIN` (the URL of your dashboard).
4. `JWT_SECRET` is generated automatically. Open `https://<your-service>.onrender.com/docs`.

## Project structure

```
src/
  auth/        registration, login, JWT strategy and guard
  tasks/       entity, DTOs, service and controller
  users/       user entity
  database.config.ts   SQLite or PostgreSQL selection
  app.module.ts
  app.factory.ts   shared bootstrap (used by main.ts and the tests)
test/          end-to-end tests
scripts/       demo data seeder
```

## License

MIT
