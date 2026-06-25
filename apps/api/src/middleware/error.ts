import type { ErrorHandler } from "hono";
import { ZodError } from "zod";
import { HttpError } from "../_shared/errors.js";

export const errorHandler: ErrorHandler = (err, c) => {
  const trace_id = c.get("trace_id") as string | undefined;
  if (err instanceof HttpError) {
    return c.json({ error: { code: err.code, message: err.message, details: err.details, trace_id } }, err.status as 400);
  }
  if (err instanceof ZodError) {
    return c.json({ error: { code: "validation_error", message: "Dados invalidos", details: err.flatten(), trace_id } }, 400);
  }
  console.error(JSON.stringify({ level: "error", trace_id, error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined }));
  return c.json({ error: { code: "internal_error", message: "Erro interno", trace_id } }, 500);
};
