import { z } from 'zod';

const origins = z
  .string()
  .default('http://localhost:3000')
  .transform((v) =>
    v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.url()).min(1));

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    WEB_ORIGIN: origins,
    DATABASE_URL: z.string().min(1).optional(),
    LOG_LEVEL: z.enum(['error', 'warn', 'log', 'debug', 'verbose']).default('log'),
    /** base64 of 32 random bytes; encrypts TOTP secrets at rest. Generate: openssl rand -base64 32 */
    APP_ENCRYPTION_KEY: z
      .string()
      .refine((v) => Buffer.from(v, 'base64').length === 32, 'Must be base64 of exactly 32 bytes')
      .optional(),
    SESSION_TTL_HOURS: z.coerce.number().positive().default(12),
    SESSION_IDLE_MINUTES: z.coerce.number().positive().default(120),
    LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(5),
    /** Number of reverse-proxy hops to trust for the client IP (rate limiting, audit). */
    TRUST_PROXY: z.coerce.number().int().min(0).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.DATABASE_URL) {
      ctx.addIssue({ code: 'custom', path: ['DATABASE_URL'], message: 'Required in production' });
    }
    if (env.NODE_ENV === 'production' && !env.APP_ENCRYPTION_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['APP_ENCRYPTION_KEY'],
        message: 'Required in production',
      });
    }
  });

export type AppEnv = z.infer<typeof envSchema>;
export const APP_ENV = Symbol('APP_ENV');

/**
 * Hosts Vercel itself assigns to this deployment (platform-controlled, not user input). Trusting them
 * lets the first deploy log in without hand-copying the generated domain into WEB_ORIGIN; a custom
 * domain still has to be listed in WEB_ORIGIN.
 */
function vercelOrigins(source: NodeJS.ProcessEnv): string[] {
  return [source.VERCEL_PROJECT_PRODUCTION_URL, source.VERCEL_URL]
    .filter((host): host is string => Boolean(host))
    .map((host) => `https://${host}`);
}

/** Validates the environment once, at startup. Never logs values (they may contain secrets). */
export function parseEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration — ${issues}`);
  }
  const env = result.data;
  return { ...env, WEB_ORIGIN: [...new Set([...env.WEB_ORIGIN, ...vercelOrigins(source)])] };
}
