import { z } from "zod";

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export class AtlasError extends Error {
  constructor(public readonly code: string, message: string, public readonly details?: unknown) {
    super(message);
    this.name = "AtlasError";
  }
}

export class UnauthorizedError extends AtlasError {
  constructor(message = "Token invalido ou expirado") {
    super("unauthorized", message);
  }
}

export class ForbiddenError extends AtlasError {
  constructor(message = "Acesso negado para este recurso") {
    super("forbidden", message);
  }
}

export class NotFoundError extends AtlasError {
  constructor(resource: string) {
    super("not_found", `${resource} nao encontrado`);
  }
}

export class ValidationError extends AtlasError {
  constructor(details: unknown) {
    super("validation_error", "Dados de entrada invalidos", details);
  }
}

export class BankIntegrationError extends AtlasError {
  constructor(message: string, details?: unknown) {
    super("bank_integration_error", message, details);
  }
}
