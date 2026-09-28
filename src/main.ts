import 'reflect-metadata';
import { createApp } from './app.factory';

async function bootstrap() {
  const app = await createApp();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API running on http://localhost:${port}  |  Swagger docs: http://localhost:${port}/docs`);
}
bootstrap();
