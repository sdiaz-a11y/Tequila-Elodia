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
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.DATABASE_URL) {
      ctx.addIssue({ code: 'custom', path: ['DATABASE_URL'], message: 'Required in production' });
    }
  });

export type AppEnv = z.infer<typeof envSchema>;
export const APP_ENV = Symbol('APP_ENV');

/** Validates the environment once, at startup. Never logs values (they may contain secrets). */
export function parseEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration — ${issues}`);
  }
  return result.data;
}
