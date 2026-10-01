import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`[api] listening on http://localhost:${env.port} (${env.isProd ? 'production' : 'development'})`);
});

function shutdown(signal) {
  console.log(`[api] ${signal} received, closing`);
  server.close(() => pool.end().finally(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
