import { cors } from "hono/cors";

export const corsMiddleware = cors({
  origin: (origin) => {
    if (!origin) return "";
    if (/^http:\/\/localhost:(5173|5174|8787)$/.test(origin)) return origin;
    if (/^https:\/\/([a-z0-9-]+\.)?atlas\.io$/.test(origin)) return origin;
    if (/^https:\/\/([a-z0-9-]+\.)*atlas-web-6ef\.pages\.dev$/.test(origin)) return origin;
    return "";
  },
  credentials: true,
  allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Authorization", "Content-Type", "X-Trace-Id", "Idempotency-Key"],
  exposeHeaders: ["X-Trace-Id", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
  maxAge: 86400,
});
