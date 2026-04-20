import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(8000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  REDIS_URL: z.string().url(),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(16),

  SUPABASE_BUCKET_UPLOADS: z.string().default('uploads'),
  SUPABASE_BUCKET_GENERATIONS: z.string().default('generations'),
  SUPABASE_BUCKET_DATASETS: z.string().default('datasets'),

  PUBLIC_APP_URL: z.string().url(),
  PUBLIC_AI_URL: z.string().url(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_SCALE: z.string().optional(),
  STRIPE_PRICE_TOPUP_100: z.string().optional(),
  STRIPE_PRICE_TOPUP_500: z.string().optional(),
  STRIPE_PRICE_TOPUP_2000: z.string().optional(),

  INTERNAL_SERVICE_TOKEN: z.string().min(16),
  ADMIN_EMAILS: z
    .string()
    .default('')
    .transform((s) => s.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)),

  SENTRY_DSN: z.string().optional(),
});

function parseEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return parsed.data;
}

export const env = parseEnv();
export type Env = typeof env;
