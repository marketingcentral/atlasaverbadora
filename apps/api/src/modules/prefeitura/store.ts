// Prefeitura portal — mutable in-memory stores for the data the prefeitura owns.
// Mirrors the portal-banco store pattern: arrays/maps + append-only events, English
// identifiers, PT-BR labels in the UI layer. All mutations are real and reflected
// across the platform (they touch the same servidores/folhas the bancos read).

import { SERVIDORES_BUSCA_MOCK, CONVENIOS_MOCK, prefeituraIdDe } from "../portal-banco/fixtures.js";
import { listContratos, setContratoFolhaStatus } from "../portal-banco/store.js";
import { issueIdUnico } from "../admin/id-unico.js";

// ============================================================
// Folha — movimentação mensal de pessoal
// ============================================================

export type MovimentacaoTipo = "admissao" | "demissao" | "aposentadoria" | "promocao" | "alteracao";

export interface Movimentacao {
  id: string;
  folhaId: string;
  prefeituraId: number;
  tipo: MovimentacaoTipo;
  matricula: string;
  cpfMasked: string;
  nome: string;
  detalhe: string;
  cargoNovo?: string;
  salarioNovo?: number;
  criadoEm: string;
}

const _movimentacoes: Movimentacao[] = [];
let _movSeq = 1;

export function listMovimentacoes(folhaId: string): Movimentacao[] {
  return _movimentacoes.filter((m) => m.folhaId === folhaId).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export function countMovimentacoes(folhaId: string): number {
  return _movimentacoes.filter((m) => m.folhaId === folhaId).length;
}

/** Applies one movimentação to the servidor base and records it. Returns the record or an error string. */
export function applyMovimentacao(input: {
  folhaId: string; prefeituraId: number; tipo: MovimentacaoTipo; matricula: string;
  cargoNovo?: string; salarioNovo?: number; detalhe?: string; nomeNovo?: string; cpf?: string;
}, now: string): { ok: true; mov: Movimentacao } | { ok: false; error: string } {
  const s = SERVIDORES_BUSCA_MOCK.find((x) => x.matricula === input.matricula && prefeituraIdDe(x) === input.prefeituraId);

  // Admissão pode criar um servidor novo se não existir.
  if (!s && input.tipo !== "admissao") return { ok: false, error: `matricula ${input.matricula} nao encontrada` };

  let target = s;
  if (input.tipo === "admissao" && !target) {
    const cpf = (input.cpf ?? "").replace(/\D/g, "");
    if (cpf.length !== 11) return { ok: false, error: "admissao requer cpf com 11 digitos" };
    const convenio = CONVENIOS_MOCK.find((cv) => cv.prefeituraId === input.prefeituraId);
    target = {
      cpf, cpfMasked: `${cpf.slice(0, 3)}.***.***-${cpf.slice(-2)}`,
      matricula: input.matricula, idMatricula: `MAT-${input.matricula}`, prefeituraId: input.prefeituraId,
      nome: input.nomeNovo ?? "SERVIDOR ADMITIDO", dataAdmissao: now.slice(0, 10), dataNascimento: "",
      vinculo: "ESTATUTARIO", origem: prefeituraNome(input.prefeituraId), situacaoFuncional: "TRABALHANDO",
      salarioLiquido: input.salarioNovo ?? 0, idConvenio: convenio?.id ?? "", cargo: input.cargoNovo,
    };
    SERVIDORES_BUSCA_MOCK.push(target);
  }
  if (!target) return { ok: false, error: `matricula ${input.matricula} nao encontrada` };

  // Aplica o efeito real da movimentação.
  switch (input.tipo) {
    case "demissao": target.situacaoFuncional = "DESLIGADO"; break;
    case "aposentadoria": target.situacaoFuncional = "APOSENTADO"; break;
    case "promocao":
      if (input.cargoNovo) target.cargo = input.cargoNovo;
      if (input.salarioNovo != null) target.salarioLiquido = input.salarioNovo;
      break;
    case "alteracao":
      if (input.cargoNovo) target.cargo = input.cargoNovo;
      if (input.salarioNovo != null) target.salarioLiquido = input.salarioNovo;
      break;
    case "admissao": break; // já tratado acima
  }

  const mov: Movimentacao = {
    id: `MOV-${String(_movSeq++).padStart(6, "0")}`,
    folhaId: input.folhaId, prefeituraId: input.prefeituraId, tipo: input.tipo,
    matricula: target.matricula, cpfMasked: target.cpfMasked, nome: target.nome,
    detalhe: input.detalhe ?? defaultDetalhe(input.tipo),
    cargoNovo: input.cargoNovo, salarioNovo: input.salarioNovo, criadoEm: now,
  };
  _movimentacoes.push(mov);
  return { ok: true, mov };
}

function defaultDetalhe(t: MovimentacaoTipo): string {
  return { admissao: "Admissão", demissao: "Desligamento", aposentadoria: "Aposentadoria", promocao: "Promoção", alteracao: "Alteração de cargo/salário" }[t];
}

function prefeituraNome(_id: number): string {
  const cv = CONVENIOS_MOCK.find((c) => c.prefeituraId === _id);
  return cv ? `PREFEITURA DE ${cv.prefeitura.toUpperCase()}` : "PREFEITURA";
}

// ============================================================
// ADF — descontos em folha gerados pelos bancos
// ============================================================

export type AdfStatus = "recebida" | "aplicada" | "falha";

export interface AdfEntry {
  id: string;
  competencia: string; // YYYYMM
  prefeituraId: number;
  adf: string;
  idUnico: string;
  cpfMasked: string;
  matricula: string;
  nome: string;
  bancoNome: string;
  valorParcela: number;
  totalParcelas: number;
  status: AdfStatus;
  motivo?: string;
  atualizadoEm: string;
}

const _adfs: AdfEntry[] = [];

/** Averbado = o banco confirmou/averbou (situacao "Ativo"). Reservas ("Aguardando"),
 *  cancelados e quitados NÃO viram ADF pendente na folha. */
function isAverbado(situacao: string): boolean {
  const s = situacao.toLowerCase();
  return s === "ativo" || s.includes("averb");
}

/** Materializa ADFs a partir dos contratos AVERBADOS da prefeitura (1 ADF por contrato).
 *  O status do ADF é fonte-única do próprio contrato (ct.folhaStatus) — assim a
 *  confirmação da prefeitura persiste e o banco a enxerga. Requer refreshContratos
 *  antes (feito no endpoint) pra ver averbações de outros isolates. */
export function ensureAdfs(prefeituraId: number, competencia: string, bancoNomeById: (id: number) => string, now: string): void {
  const convenioIds = new Set(CONVENIOS_MOCK.filter((cv) => cv.prefeituraId === prefeituraId).map((cv) => cv.id));
  const contratos = listContratos().filter((ct) => convenioIds.has(ct.convenioId) && isAverbado(ct.situacao));
  for (const ct of contratos) {
    const status = (ct.folhaStatus ?? "recebida") as AdfStatus;
    const already = _adfs.find((a) => a.adf === ct.adf && a.competencia === competencia);
    if (already) {
      already.status = status; // sincroniza status do contrato (cross-isolate)
      already.motivo = ct.folhaMotivo;
      already.atualizadoEm = now;
      continue;
    }
    _adfs.push({
      id: `ADF-${competencia}-${ct.adf}`,
      competencia, prefeituraId, adf: ct.adf, idUnico: issueIdUnico(prefeituraId),
      cpfMasked: ct.cpfMasked, matricula: ct.matricula, nome: ct.nome,
      bancoNome: bancoNomeById(ct.bancoId), valorParcela: ct.valorParcela, totalParcelas: ct.totalParcelas,
      status, motivo: ct.folhaMotivo, atualizadoEm: now,
    });
  }
}

export function listAdfs(prefeituraId: number, competencia?: string): AdfEntry[] {
  return _adfs.filter((a) => a.prefeituraId === prefeituraId && (!competencia || a.competencia === competencia));
}

export function listAdfCompetencias(prefeituraId: number): { competencia: string; total: number; aplicadas: number; falhas: number }[] {
  const map = new Map<string, { competencia: string; total: number; aplicadas: number; falhas: number }>();
  for (const a of _adfs.filter((x) => x.prefeituraId === prefeituraId)) {
    const g = map.get(a.competencia) ?? { competencia: a.competencia, total: 0, aplicadas: 0, falhas: 0 };
    g.total++; if (a.status === "aplicada") g.aplicadas++; if (a.status === "falha") g.falhas++;
    map.set(a.competencia, g);
  }
  return Array.from(map.values()).sort((a, b) => b.competencia.localeCompare(a.competencia));
}

/** Aplica o status na folha. Fonte-única = contrato: além do _adfs local, grava
 *  ct.folhaStatus (o chamador persiste os adfs retornados). Retorna os `adf` de
 *  contrato tocados pra o endpoint fazer o write-through. */
export function setAdfStatus(prefeituraId: number, adfIds: string[], status: AdfStatus, motivo: string | undefined, now: string): string[] {
  const contratoAdfs: string[] = [];
  for (const a of _adfs) {
    if (a.prefeituraId === prefeituraId && adfIds.includes(a.id)) {
      a.status = status; a.motivo = motivo; a.atualizadoEm = now;
      setContratoFolhaStatus(a.adf, status, motivo); // sincroniza no contrato (banco vê)
      contratoAdfs.push(a.adf);
    }
  }
  return contratoAdfs;
}

// ============================================================
// Anuência de dados (opt-in auditável)
// ============================================================

export const TERMO_VERSAO_ATUAL = "v1-2026-07";
export const TERMO_TEXTO =
  "A Prefeitura autoriza a Atlas Averbadora e os bancos parceiros conveniados a tratar os dados " +
  "da base de servidores (nome, CPF, matrícula, vínculo, salário e margem) para fins de averbação " +
  "de crédito consignado, cálculo de margem e conciliação de folha, nos termos da LGPD.";

export interface Anuencia {
  id: string;
  prefeituraId: number;
  versao: string;
  escopo: string;
  aceitoPor: string;
  aceitoEm: string;
  ip?: string;
}

const _anuencias: Anuencia[] = [];
let _anuSeq = 1;

export function listAnuencias(prefeituraId: number): Anuencia[] {
  return _anuencias.filter((a) => a.prefeituraId === prefeituraId).sort((a, b) => b.aceitoEm.localeCompare(a.aceitoEm));
}

export function anuenciaVigente(prefeituraId: number): Anuencia | undefined {
  return listAnuencias(prefeituraId).find((a) => a.versao === TERMO_VERSAO_ATUAL);
}

export function registrarAnuencia(input: { prefeituraId: number; aceitoPor: string; ip?: string }, now: string): Anuencia {
  const a: Anuencia = {
    id: `ANU-${String(_anuSeq++).padStart(4, "0")}`,
    prefeituraId: input.prefeituraId, versao: TERMO_VERSAO_ATUAL, escopo: "base_servidores",
    aceitoPor: input.aceitoPor, aceitoEm: now, ip: input.ip,
  };
  _anuencias.push(a);
  return a;
}

// ============================================================
// Perfis por área (RH, financeiro, gestor) + 2FA TOTP
// ============================================================

export type PrefeituraArea = "rh" | "financeiro" | "gestor";
export const AREA_LABEL: Record<PrefeituraArea, string> = { rh: "Recursos Humanos", financeiro: "Financeiro", gestor: "Gestor" };

export interface PrefeituraPerfil {
  id: number;
  prefeituraId: number;
  nome: string;
  email: string;
  area: PrefeituraArea;
  ativo: boolean;
  twofaEnabled: boolean;
  totpSecret?: string;
  criadoEm: string;
}

const _perfis: PrefeituraPerfil[] = [
  { id: 1, prefeituraId: 1, nome: "Coordenação RH", email: "rh@palhoca.sc.gov.br", area: "rh", ativo: true, twofaEnabled: true, totpSecret: "JBSWY3DPEHPK3PXP", criadoEm: new Date("2026-06-01T00:00:00Z").toISOString() },
  { id: 2, prefeituraId: 1, nome: "Setor Financeiro", email: "financeiro@palhoca.sc.gov.br", area: "financeiro", ativo: true, twofaEnabled: false, criadoEm: new Date("2026-06-01T00:00:00Z").toISOString() },
];
let _perfilSeq = 3;

export function listPerfis(prefeituraId: number): PrefeituraPerfil[] {
  return _perfis.filter((p) => p.prefeituraId === prefeituraId);
}

export function upsertPerfil(input: { id?: number; prefeituraId: number; nome: string; email: string; area: PrefeituraArea; ativo?: boolean }, now: string): PrefeituraPerfil {
  const existing = input.id ? _perfis.find((p) => p.id === input.id && p.prefeituraId === input.prefeituraId) : undefined;
  if (existing) {
    existing.nome = input.nome; existing.email = input.email; existing.area = input.area;
    if (input.ativo != null) existing.ativo = input.ativo;
    return existing;
  }
  const novo: PrefeituraPerfil = {
    id: _perfilSeq++, prefeituraId: input.prefeituraId, nome: input.nome, email: input.email,
    area: input.area, ativo: input.ativo ?? true, twofaEnabled: false, criadoEm: now,
  };
  _perfis.push(novo);
  return novo;
}

/** Nunca apaga — DESATIVA (ativo=false). Reativável via upsertPerfil. */
export function deletePerfil(prefeituraId: number, id: number): boolean {
  const p = _perfis.find((x) => x.id === id && x.prefeituraId === prefeituraId);
  if (!p) return false;
  p.ativo = false;
  return true;
}
/** Reativa (ativo=true). */
export function reactivatePerfil(prefeituraId: number, id: number): boolean {
  const p = _perfis.find((x) => x.id === id && x.prefeituraId === prefeituraId);
  if (!p) return false;
  p.ativo = true;
  return true;
}

/** Rotate the TOTP secret and return the otpauth URL for QR provisioning. */
export function rotateTotp(prefeituraId: number, id: number): { secret: string; otpauthUrl: string } | null {
  const p = _perfis.find((x) => x.id === id && x.prefeituraId === prefeituraId);
  if (!p) return null;
  const secret = randomBase32(16);
  p.totpSecret = secret;
  p.twofaEnabled = true;
  const label = encodeURIComponent(`Atlas Prefeitura:${p.email}`);
  return { secret, otpauthUrl: `otpauth://totp/${label}?secret=${secret}&issuer=Atlas` };
}

export function disable2FA(prefeituraId: number, id: number): boolean {
  const p = _perfis.find((x) => x.id === id && x.prefeituraId === prefeituraId);
  if (!p) return false;
  p.twofaEnabled = false;
  p.totpSecret = undefined;
  return true;
}

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function randomBase32(len: number): string {
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => B32[b % 32]).join("");
}

/** Sanitize a perfil for API responses (never leak the TOTP secret). */
export function sanitizePerfil(p: PrefeituraPerfil) {
  const { totpSecret, ...rest } = p;
  return { ...rest, hasTotp: !!totpSecret };
}
