import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp } from '../src/app.factory';

describe('Task Manager API (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;
  let token: string;
  let otherToken: string;

  beforeAll(async () => {
    process.env.DATABASE_PATH = ':memory:';
    process.env.JWT_SECRET = 'test-secret';
    app = await createApp();
    await app.init();
    http = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health responds ok', async () => {
    const res = await request(http).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  describe('auth', () => {
    it('registers a user and returns a JWT', async () => {
      const res = await request(http)
        .post('/auth/register')
        .send({ email: 'Ana@Example.com', name: 'Ana Torres', password: 'S3cure-pass' })
        .expect(201);
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user.email).toBe('ana@example.com');
      expect(res.body.user).not.toHaveProperty('passwordHash');
      token = res.body.accessToken;
    });

    it('rejects a duplicate email', async () => {
      await request(http)
        .post('/auth/register')
        .send({ email: 'ana@example.com', name: 'Ana', password: 'S3cure-pass' })
        .expect(409);
    });

    it('validates input', async () => {
      await request(http)
        .post('/auth/register')
        .send({ email: 'not-an-email', name: 'A', password: '123' })
        .expect(400);
    });

    it('logs in with valid credentials and rejects invalid ones', async () => {
      await request(http)
        .post('/auth/login')
        .send({ email: 'ana@example.com', password: 'S3cure-pass' })
        .expect(201);
      await request(http)
        .post('/auth/login')
        .send({ email: 'ana@example.com', password: 'wrong-password' })
        .expect(401);
    });

    it('protects routes without a token', async () => {
      await request(http).get('/tasks').expect(401);
      await request(http).get('/auth/me').expect(401);
    });

    it('returns the current user', async () => {
      const res = await request(http).get('/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
      expect(res.body.email).toBe('ana@example.com');
    });
  });

  describe('tasks', () => {
    let taskId: string;

    it('creates tasks', async () => {
      const res = await request(http)
        .post('/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Design schema', priority: 'high', dueDate: '2026-12-31' })
        .expect(201);
      expect(res.body).toMatchObject({ title: 'Design schema', status: 'todo', priority: 'high' });
      taskId = res.body.id;

      await request(http)
        .post('/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Write docs', status: 'done' })
        .expect(201);
      await request(http)
        .post('/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Deploy', status: 'in_progress', description: 'Docker image' })
        .expect(201);
    });

    it('rejects invalid payloads and unknown fields', async () => {
      await request(http).post('/tasks').set('Authorization', `Bearer ${token}`).send({ title: '' }).expect(400);
      await request(http)
        .post('/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'x', status: 'nope' })
        .expect(400);
    });

    it('lists with pagination, filters and search', async () => {
      const all = await request(http).get('/tasks').set('Authorization', `Bearer ${token}`).expect(200);
      expect(all.body.total).toBe(3);

      const page = await request(http)
        .get('/tasks?limit=2&page=2')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(page.body.items).toHaveLength(1);
      expect(page.body.pages).toBe(2);

      const done = await request(http).get('/tasks?status=done').set('Authorization', `Bearer ${token}`).expect(200);
      expect(done.body.items.map((t: { title: string }) => t.title)).toEqual(['Write docs']);

      const search = await request(http).get('/tasks?search=docker').set('Authorization', `Bearer ${token}`).expect(200);
      expect(search.body.total).toBe(1);
    });

    it('returns stats', async () => {
      const res = await request(http).get('/tasks/stats').set('Authorization', `Bearer ${token}`).expect(200);
      expect(res.body).toEqual({
        total: 3,
        byStatus: { todo: 1, in_progress: 1, done: 1 },
        completionRate: 33,
      });
    });

    it('updates a task', async () => {
      const res = await request(http)
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'done' })
        .expect(200);
      expect(res.body.status).toBe('done');
    });

    it('isolates tasks between users', async () => {
      const reg = await request(http)
        .post('/auth/register')
        .send({ email: 'luis@example.com', name: 'Luis', password: 'Another-pass1' })
        .expect(201);
      otherToken = reg.body.accessToken;
      await request(http).get(`/tasks/${taskId}`).set('Authorization', `Bearer ${otherToken}`).expect(404);
      const list = await request(http).get('/tasks').set('Authorization', `Bearer ${otherToken}`).expect(200);
      expect(list.body.total).toBe(0);
    });

    it('validates ids and deletes tasks', async () => {
      await request(http).get('/tasks/not-a-uuid').set('Authorization', `Bearer ${token}`).expect(400);
      await request(http).delete(`/tasks/${taskId}`).set('Authorization', `Bearer ${token}`).expect(204);
      await request(http).get(`/tasks/${taskId}`).set('Authorization', `Bearer ${token}`).expect(404);
    });
  });

  it('serves Swagger docs', async () => {
    await request(http).get('/docs').expect(200);
    const json = await request(http).get('/docs-json').expect(200);
    expect(Object.keys(json.body.paths)).toEqual(expect.arrayContaining(['/tasks', '/auth/login']));
  });
});
