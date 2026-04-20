import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import type { AppEnv } from './context.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { loggerMiddleware } from './middleware/logger.js';
import { errorHandler } from './middleware/error.js';
import { authMiddleware } from './middleware/auth.js';
import { rateLimit } from './middleware/rate-limit.js';
import { meRoutes } from './routes/me.js';
import { uploadRoutes } from './routes/uploads.js';
import { characterRoutes } from './routes/characters.js';
import { trendsRoutes } from './routes/trends.js';
import { generateRoutes } from './routes/generate.js';
import { jobRoutes } from './routes/jobs.js';
import { libraryRoutes } from './routes/library.js';
import { billingRoutes } from './routes/billing.js';
import { adminRoutes } from './routes/admin.js';
import { webhookRoutes } from './routes/webhooks.js';
import { internalRoutes } from './routes/internal.js';
import { startDispatchWorker } from './services/queue.js';
import { ensureStorageBuckets } from './init/ensure-storage.js';

const app = new Hono<AppEnv>();

app.onError(errorHandler);

app.use('*', requestIdMiddleware);
app.use('*', loggerMiddleware);

// secureHeaders() default for Cross-Origin-Resource-Policy is `same-origin`,
// which blocks cross-origin `fetch` from reading the response. For an API
// backend called from a different origin this must be `cross-origin`.
// We also disable COOP/COEP — they aren't meaningful for a JSON API.
app.use(
  '*',
  secureHeaders({
    crossOriginResourcePolicy: 'cross-origin',
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

// CORS — allow the configured app URL plus any localhost/LAN origin in dev.
// Production uses the strict allowlist (PUBLIC_APP_URL only).
const devOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+)(:\d+)?$/;
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return env.PUBLIC_APP_URL;
      if (origin === env.PUBLIC_APP_URL) return origin;
      if (env.NODE_ENV !== 'production' && devOriginPattern.test(origin)) return origin;
      return env.PUBLIC_APP_URL;
    },
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization', 'X-Remy-Token', 'X-Remy-Signature', 'X-Request-Id'],
    exposeHeaders: ['X-Request-Id'],
    maxAge: 600,
  }),
);

app.get('/healthz', (c) => c.json({ ok: true, service: 'remy-api' }));
app.get('/readyz', (c) => c.json({ ok: true }));

// Webhooks BEFORE auth: they carry their own signatures.
app.route('/v1/webhooks', webhookRoutes);

// Internal (service-to-service) — token-gated.
app.route('/v1/internal', internalRoutes);

// Protected by bearer token.
app.use('/v1/*', authMiddleware);

// Per-user rate limiter: 120 req/min/user, plus a tighter one on generate.
app.use(
  '/v1/*',
  rateLimit({
    key: (c) => `user:${c.get('user')?.id ?? 'anon'}`,
    windowSeconds: 60,
    max: 120,
  }),
);
app.use(
  '/v1/generate',
  rateLimit({
    key: (c) => `gen:${c.get('user')?.id ?? 'anon'}`,
    windowSeconds: 60,
    max: 30,
  }),
);

app.route('/v1/me', meRoutes);
app.route('/v1/uploads', uploadRoutes);
app.route('/v1/characters', characterRoutes);
app.route('/v1/trends', trendsRoutes);
app.route('/v1/generate', generateRoutes);
app.route('/v1/jobs', jobRoutes);
app.route('/v1/library', libraryRoutes);
app.route('/v1/billing', billingRoutes);
app.route('/v1/admin', adminRoutes);

const isEntrypoint =
  import.meta.url === `file://${process.argv[1]}` ||
  process.env.REMY_API_START === '1';

if (isEntrypoint) {
  const port = env.PORT;
  serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
    logger.info({ port: info.port, env: env.NODE_ENV }, 'api started');
  });

  if (process.env.REMY_DISABLE_WORKERS !== '1') {
    startDispatchWorker('lora');
    startDispatchWorker('generation');
    startDispatchWorker('trends');
    startDispatchWorker('preprocessing');
    logger.info('queue workers started');
  }

  // Fire-and-forget: ensure Supabase Storage buckets exist. Idempotent.
  ensureStorageBuckets().catch((err) => logger.warn({ err }, 'ensure buckets failed'));
}

export { app };
