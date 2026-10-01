import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { env } from './config/env.js';
import { pool } from './config/db.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import publicRoutes from './routes/public.routes.js';
import adminRoutes from './routes/admin.routes.js';
import seoRoutes from './routes/seo.routes.js';

export function createApp() {
  const app = express();

  // Render and most PaaS hosts sit behind one proxy hop; needed for rate limiting by IP.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin(origin, cb) {
        // Allow server-to-server/curl (no Origin) and configured front-ends.
        if (!origin || env.corsOrigins.includes(origin.replace(/\/$/, ''))) return cb(null, true);
        cb(null, false);
      },
      credentials: false,
      maxAge: 600,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  // sendBeacon posts text/plain; parse it as JSON for the tracking endpoints.
  app.use('/api/track', express.text({ type: 'text/plain', limit: '16kb' }), (req, _res, next) => {
    if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        req.body = {};
      }
    }
    next();
  });

  app.get('/health', async (_req, res) => {
    await pool.query('select 1');
    res.json({ ok: true });
  });

  app.use(seoRoutes);
  app.use('/api', apiLimiter);
  app.use('/api/admin', adminRoutes);
  app.use('/api', publicRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
