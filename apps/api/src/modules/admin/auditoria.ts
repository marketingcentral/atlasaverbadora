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

// Seed entries — realistic mix to demonstrate the report.
appendAudit({
  ts: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
  categoria: "pre_reserva", acao: "criada", cpf: "000.***.***-33", matricula: "M-9001",
  propostaId: "PR-1A2B3C4D", idUnico: "PLH-000001",
  ip: "200.150.21.4", deviceId: "ios-9a3e1c", userId: "banco:1", userRole: "banco",
  detalhes: "Pre-reserva criada via portal banco. Margem travada por 48h.",
});
appendAudit({
  ts: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
  categoria: "termo_aceite", acao: "termo_consignado_v3", cpf: "000.***.***-33", matricula: "M-9001",
  propostaId: "PR-1A2B3C4D", termoAceito: "v3-2026-01",
  ip: "200.150.21.4", deviceId: "ios-9a3e1c", userId: "servidor:1", userRole: "servidor",
  detalhes: "Servidor aceitou Termo de Consignacao v3 (autorizacao de averbacao).",
});
appendAudit({
  ts: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
  categoria: "biometria", acao: "facematch_ok", cpf: "000.***.***-33", matricula: "M-9001",
  propostaId: "PR-1A2B3C4D", deviceId: "ios-9a3e1c", userId: "servidor:1", userRole: "servidor",
  detalhes: "Biometria facial aprovada (score=0.97). Acao: aceite de termo.",
});
appendAudit({
  ts: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  categoria: "dados_pessoais", acao: "email_alterado", cpf: "000.***.***-44", matricula: "M-9002",
  userId: "averbadora:200", userRole: "averbadora",
  detalhes: "Email alterado: antigo=joao@old.com -> novo=joao@new.com (mudanca aprovada por admin).",
});
appendAudit({
  ts: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  categoria: "margem", acao: "margem_liberada", cpf: "000.***.***-66", matricula: "M-9004",
  propostaId: "PR-XYZ", idUnico: "JNV-00001-AB12CD",
  detalhes: "Pre-reserva expirada (TTL 48h). Margem retornou para disponivel: R$ 14.200,00.",
});
appendAudit({
  ts: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
  categoria: "tombamento", acao: "lote_processado",
  detalhes: "Lote TB-1-202605 (Palhoca): 312 linhas, 8 inseridos, 296 atualizados, 8 divergencias.",
});
appendAudit({
  ts: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
  categoria: "id_unico", acao: "config_atualizada",
  userId: "averbadora:200", userRole: "averbadora",
  detalhes: "Config ID unico de Palhoca atualizada: prefixo=PLH, formato=SEQ, largura=6.",
});
appendAudit({
  ts: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
  categoria: "acesso", acao: "login_ok",
  userId: "averbadora:200", userRole: "averbadora",
  ip: "201.10.50.21", userAgent: "Mozilla/5.0 (Macintosh)",
  detalhes: "Login com 2FA OK no painel da averbadora.",
});
