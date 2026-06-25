import { Hono } from "hono";
import { sql } from "drizzle-orm";
import type { Env } from "../../env.js";
import { getDb } from "../../db/client.js";

export const healthRoutes = new Hono<{ Bindings: Env }>()
  .get("/healthz", (c) => c.json({ status: "ok", time: new Date().toISOString() }))
  .get("/readyz", async (c) => {
    const checks: Record<string, { status: "ok" | "fail"; detail?: string; latency_ms?: number }> = {
      env: { status: "ok" },
    };

    // KV
    checks.kv = { status: c.env.KV_CACHE ? "ok" : "fail" };

    // DB — execute SELECT 1 real (via Hyperdrive quando disponível).
    const dbStart = Date.now();
    try {
      const db = getDb(c.env);
      const r = await db.execute(sql`SELECT 1 AS ok, current_database() AS db, version() AS v`);
      const row = (r as unknown as { ok: number; db: string; v: string }[])[0];
      checks.db = {
        status: "ok",
        detail: `${row?.db ?? "?"} via ${c.env.HYPERDRIVE ? "hyperdrive" : "direct"}`,
        latency_ms: Date.now() - dbStart,
      };
    } catch (err) {
      checks.db = { status: "fail", detail: (err as Error).message, latency_ms: Date.now() - dbStart };
    }

    const allOk = Object.values(checks).every((v) => v.status === "ok");
    return c.json({ status: allOk ? "ready" : "degraded", checks }, allOk ? 200 : 503);
  });
