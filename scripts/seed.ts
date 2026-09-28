/**
 * Fills a running API with a demo user and sample tasks.
 * Usage: npm run seed            (API must be running on http://localhost:3000)
 *        API_URL=https://my-api npm run seed
 */
const API = process.env.API_URL ?? 'http://localhost:3000';
const demo = { email: 'demo@example.com', name: 'Demo User', password: 'Demo-pass123' };

const titles: Array<[string, 'todo' | 'in_progress' | 'done', 'low' | 'medium' | 'high']> = [
  ['Design database schema', 'done', 'high'],
  ['Set up authentication with JWT', 'done', 'high'],
  ['Build tasks CRUD endpoints', 'done', 'medium'],
  ['Add request validation', 'done', 'medium'],
  ['Write e2e tests', 'in_progress', 'high'],
  ['Document the API with Swagger', 'in_progress', 'medium'],
  ['Add pagination and filters', 'done', 'medium'],
  ['Dockerize the service', 'todo', 'low'],
  ['Configure CI pipeline', 'todo', 'medium'],
  ['Deploy to production', 'todo', 'high'],
  ['Add rate limiting', 'todo', 'low'],
  ['Review security checklist', 'in_progress', 'high'],
];

async function call(path: string, init: RequestInit = {}, token?: string) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok && res.status !== 409) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res;
}

async function main() {
  await call('/auth/register', { method: 'POST', body: JSON.stringify(demo) });
  const login = await (
    await call('/auth/login', { method: 'POST', body: JSON.stringify({ email: demo.email, password: demo.password }) })
  ).json();
  const token: string = login.accessToken;

  const existing = await (await call('/tasks?limit=1', {}, token)).json();
  if (existing.total > 0) {
    console.log(`Demo user already has ${existing.total} tasks. Nothing to do.`);
    return;
  }
  const day = 86_400_000;
  for (const [i, [title, status, priority]] of titles.entries()) {
    const dueDate = new Date(Date.now() + (i - 4) * day).toISOString().slice(0, 10);
    await call('/tasks', { method: 'POST', body: JSON.stringify({ title, status, priority, dueDate }) }, token);
  }
  console.log(`Seeded ${titles.length} tasks. Log in with ${demo.email} / ${demo.password}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
