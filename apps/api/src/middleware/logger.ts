import type { MiddlewareHandler } from "hono";
import { newTraceId } from "../_shared/trace.js";

interface Vars { trace_id: string; t0: number }

export const loggerMiddleware: MiddlewareHandler<{ Variables: Vars }> = async (c, next) => {
  const trace_id = c.req.header("x-trace-id") ?? newTraceId();
  c.set("trace_id", trace_id);
  c.set("t0", Date.now());
  c.header("x-trace-id", trace_id);

  await next();

  const ms = Date.now() - c.get("t0");
  const log = {
    level: "info",
    ts: new Date().toISOString(),
    trace_id,
    method: c.req.method,
    path: new URL(c.req.url).pathname,
    status: c.res.status,
    duration_ms: ms,
  };
  console.log(JSON.stringify(log));
};
