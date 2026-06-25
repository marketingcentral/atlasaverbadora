export class HttpError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly details?: unknown) {
    super(message);
    this.name = "HttpError";
  }
}

export const Errors = {
  unauthorized: (m = "Token invalido ou expirado") => new HttpError(401, "unauthorized", m),
  forbidden: (m = "Acesso negado") => new HttpError(403, "forbidden", m),
  notFound: (resource: string) => new HttpError(404, "not_found", `${resource} nao encontrado`),
  validation: (details?: unknown) => new HttpError(400, "validation_error", "Dados invalidos", details),
  rateLimit: (resetSec: number) => new HttpError(429, "rate_limited", "Muitas requisicoes", { reset_in: resetSec }),
  bankUnavailable: (m = "Servico bancario indisponivel") => new HttpError(503, "bank_unavailable", m),
} as const;
