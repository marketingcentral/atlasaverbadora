// Dedicated audit log — separate from generic application events.
// Captures: pre-reservation transitions, term acceptances, biometric authentications,
// data changes with PII, margin movements. Append-only, never mutated.

export type AuditCategoria =
  | "pre_reserva"
  | "termo_aceite"
  | "biometria"
  | "dados_pessoais"
  | "margem"
  | "tombamento"
  | "id_unico"
  | "convenio_config"
  | "acesso";

export interface AuditEntry {
  id: string;
  ts: string;
  trace_id: string;
  categoria: AuditCategoria;
  acao: string;
  cpf?: string; // masked
  matricula?: string;
  propostaId?: string;
  idUnico?: string;
  ip?: string;
  userAgent?: string;
  deviceId?: string;
  termoAceito?: string;
  userId?: string;
  userRole?: string;
  detalhes: string;
}

const _entries: AuditEntry[] = [];

function uid(): string {
  const t = Date.now().toString(36);
  const r = Math.floor(Math.random() * 36 ** 6).toString(36).padStart(6, "0");
  return `AUD-${t.toUpperCase()}-${r.toUpperCase()}`;
}

function trace(): string {
  return Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

export function appendAudit(input: Omit<AuditEntry, "id" | "ts" | "trace_id"> & { ts?: string; trace_id?: string }): AuditEntry {
  const entry: AuditEntry = {
    id: uid(),
    ts: input.ts ?? new Date().toISOString(),
    trace_id: input.trace_id ?? trace(),
    categoria: input.categoria,
    acao: input.acao,
    cpf: input.cpf,
    matricula: input.matricula,
    propostaId: input.propostaId,
    idUnico: input.idUnico,
    ip: input.ip,
    userAgent: input.userAgent,
    deviceId: input.deviceId,
    termoAceito: input.termoAceito,
    userId: input.userId,
    userRole: input.userRole,
    detalhes: input.detalhes,
  };
  _entries.unshift(entry);
  if (_entries.length > 1000) _entries.length = 1000;
  return entry;
}

export interface AuditFilter {
  categoria?: AuditCategoria;
  cpf?: string;
  matricula?: string;
  propostaId?: string;
  desde?: string;
  ate?: string;
}

export function listAudit(filter: AuditFilter = {}, limit = 200): AuditEntry[] {
  return _entries
    .filter((e) => !filter.categoria || e.categoria === filter.categoria)
    .filter((e) => !filter.cpf || e.cpf === filter.cpf)
    .filter((e) => !filter.matricula || e.matricula === filter.matricula)
    .filter((e) => !filter.propostaId || e.propostaId === filter.propostaId)
    .filter((e) => !filter.desde || e.ts >= filter.desde)
    .filter((e) => !filter.ate || e.ts <= filter.ate)
    .slice(0, limit);
}

export function auditCategorias(): { value: AuditCategoria; label: string }[] {
  return [
    { value: "pre_reserva", label: "Pre-reservas" },
    { value: "termo_aceite", label: "Aceite de termos" },
    { value: "biometria", label: "Biometria" },
    { value: "dados_pessoais", label: "Dados pessoais" },
    { value: "margem", label: "Movimentacao de margem" },
    { value: "tombamento", label: "Tombamento de contratos" },
    { value: "id_unico", label: "ID unico" },
    { value: "convenio_config", label: "Config de convenio" },
    { value: "acesso", label: "Acesso ao painel" },
  ];
}

// Cliente pediu remocao dos 8 seed entries de auditoria (16/07/2026) pra
// teste real do zero — eram registros demo (PR-1A2B3C4D, Lote TB-1-202605,
// login "averbadora:200") orfaos de dados ja removidos. Entradas reais
// continuam chegando via appendAudit em cada acao do sistema.
// Se restaurar pra demo, reverter este bloco.
