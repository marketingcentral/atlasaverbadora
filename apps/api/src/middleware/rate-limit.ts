import type { MiddlewareHandler } from "hono";
import { Errors } from "../_shared/errors.js";
import type { Env } from "../env.js";

/**
 * Simple KV-based rate limiter.
 * Key = "rl:<scope>:<id>:<minute>"; each request increments. Returns 429 when exceeded.
 */
export function rateLimit(opts: { scope: string; max: number; perSeconds?: number }): MiddlewareHandler<{ Bindings: Env }> {
  const window = opts.perSeconds ?? 60;
  return async (c, next) => {
    const kv = c.env.KV_CACHE;
    if (!kv) return next(); // no-op when KV not bound (e.g., local dev without setup)

    const id = c.req.header("authorization")?.slice(7, 39) ?? c.req.header("cf-connecting-ip") ?? "anon";
    const bucket = Math.floor(Date.now() / 1000 / window);
    const key = `rl:${opts.scope}:${id}:${bucket}`;
    const current = await kv.get(key);
    const count = current ? parseInt(current, 10) + 1 : 1;
    await kv.put(key, String(count), { expirationTtl: window + 5 });
    c.header("X-RateLimit-Limit", String(opts.max));
    c.header("X-RateLimit-Remaining", String(Math.max(0, opts.max - count)));
    if (count > opts.max) {
      const resetIn = window - (Math.floor(Date.now() / 1000) % window);
      c.header("Retry-After", String(resetIn));
      throw Errors.rateLimit(resetIn);
    }
    await next();
  };
}
