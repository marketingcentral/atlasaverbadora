import { z } from "zod";

/**
 * Hyperdrive binding shape exposed by Cloudflare Workers runtime.
 * @see https://developers.cloudflare.com/hyperdrive/
 */
export interface Hyperdrive {
  /** Connection string the Worker should use (host points to the Hyperdrive proxy). */
  readonly connectionString: string;
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly password: string;
  readonly database: string;
}

/** Cloudflare bindings exposed to handlers via c.env */
export interface Env {
  APP_ENV: "dev" | "staging" | "prod";
  LOG_LEVEL: "debug" | "info" | "warn" | "error";
  /** Direct Postgres URL — used in local dev / tests when HYPERDRIVE binding is absent. */
  DATABASE_URL?: string;
  /** Cloudflare Hyperdrive binding — present in deployed environments. */
  HYPERDRIVE?: Hyperdrive;
  JWT_PRIVATE_KEY: string;
  JWT_PUBLIC_KEY: string;
  SENTRY_DSN?: string;
  BANK_ADAPTER: "sandbox" | "ifractal";
  KV_CACHE?: KVNamespace;
  KV_SESSIONS?: KVNamespace;
  KV_RATELIMIT?: KVNamespace;
  R2_FILES?: R2Bucket;
}

export const EnvSchema = z.object({
  APP_ENV: z.enum(["dev", "staging", "prod"]).default("dev"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  DATABASE_URL: z.string().optional(),
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  SENTRY_DSN: z.string().optional(),
  BANK_ADAPTER: z.enum(["sandbox", "ifractal"]).default("sandbox"),
});

export function validateEnv(env: unknown): asserts env is Env {
  const r = EnvSchema.safeParse(env);
  if (!r.success) throw new Error(`invalid_env: ${JSON.stringify(r.error.flatten())}`);
}
