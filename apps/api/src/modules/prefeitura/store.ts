// Prefeitura portal — mutable in-memory stores for the data the prefeitura owns.
// Mirrors the portal-banco store pattern: arrays/maps + append-only events, English
// identifiers, PT-BR labels in the UI layer. All mutations are real and reflected
// across the platform (they touch the same servidores/folhas the bancos read).

import { SERVIDORES_BUSCA_MOCK, CONVENIOS_MOCK, prefeituraIdDe } from "../portal-banco/fixtures.js";
import { listContratos, setContratoFolhaStatus, setContratoDesligamento, listContratosAtivosDaMatricula } from "../portal-banco/store.js";
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
}, now: string): { ok: true; mov: Movimentacao; contratosAtingidos: string[]; servidorAtualizado?: import("../portal-banco/fixtures.js").ServidorBuscaMock } | { ok: false; error: string } {
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
  const contratosAtingidos: string[] = [];
  switch (input.tipo) {
    case "demissao":
    case "aposentadoria": {
      target.situacaoFuncional = input.tipo === "demissao" ? "DESLIGADO" : "APOSENTADO";
      // Cascade F6: servidor desligado -> ADFs param na folha + contratos viram
      // "Em cobranca direta". Banco assume cobranca fora da folha. Idempotente.
      const motivo = input.tipo === "demissao" ? "Servidor desligado" : "Servidor aposentado";
      const ativos = listContratosAtivosDaMatricula(target.matricula);
      for (const ct of ativos) {
        setContratoDesligamento(ct.adf, motivo);
        contratosAtingidos.push(ct.adf);
      }
      break;
    }
    case "promocao":
      if (input.cargoNovo) target.cargo = input.cargoNovo;
      if (input.salarioNovo != null) target.salarioLiquido = input.salarioNovo;
      break;
    case "alteracao":
      if (input.cargoNovo) target.cargo = input.cargoNovo;
      if (input.salarioNovo != null) target.salarioLiquido = input.salarioNovo;
      break;
    case "admissao":
      // Readmissao: se o servidor ja existe mas foi DESLIGADO/APOSENTADO,
      // reativa (situacaoFuncional -> TRABALHANDO). Antes era no-op, o que
      // impedia readmitir servidor demitido por engano.
      if (target.situacaoFuncional === "DESLIGADO" || target.situacaoFuncional === "APOSENTADO") {
        target.situacaoFuncional = "TRABALHANDO";
      }
      break;
  }

  const mov: Movimentacao = {
    id: `MOV-${String(_movSeq++).padStart(6, "0")}`,
    folhaId: input.folhaId, prefeituraId: input.prefeituraId, tipo: input.tipo,
    matricula: target.matricula, cpfMasked: target.cpfMasked, nome: target.nome,
    detalhe: input.detalhe ?? defaultDetalhe(input.tipo),
    cargoNovo: input.cargoNovo, salarioNovo: input.salarioNovo, criadoEm: now,
  };
  _movimentacoes.push(mov);
  // Callsite (handler /prefeitura/folhas/:id/movimentacao) precisa persistir
  // servidorAtualizado no PG — sem isso, mutacoes de situacaoFuncional (F6)
  // e salario ficam so no isolate que atendeu, outros isolates continuam
  // servindo dados antigos (bug F6: servidor demitido continuava logando).
  return { ok: true, mov, contratosAtingidos, servidorAtualizado: target };
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

export type AdfStatus = "recebida" | "aplicada" | "falha" | "interrompida_desligamento";

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
  /** Valor total financiado do contrato (parcela x total) — separado de
   *  valorParcela pra averbadora ver "R$ 231 x 12 = R$ 2.772,00" no lote. */
  valorFinanciado: number;
  /** Tipo do contrato do banco — EMPRESTIMO | REFIN | ECONSIGNADO. Serve
   *  pra averbadora rotular no lote como Emprestimo / Portabilidade / Cartao. */
  tipoContrato: string;
  /** Bucket de margem — distingue Cartao Consignado (CARTAO_CONSIGNADO) de
   *  Cartao Beneficio (CARTAO_BENEFICIOS). tipoContrato=ECONSIGNADO sozinho
   *  nao diferencia; sem esse campo os dois viravam "Cartao" generico. */
  tipoMargem?: string;
  status: AdfStatus;
  motivo?: string;
  atualizadoEm: string;
}

const _adfs: AdfEntry[] = [];

/** Zera in-memory de ADFs. Usado pelo /admin/db/purge-contratos apos o TRUNCATE
 *  dos contratos — sem isso, o proximo ensureAdfsGlobal encontraria as ADFs
 *  antigas ainda no array e nao rehidratariam do zero. */
export function clearAdfsMemoria(): void {
  _adfs.length = 0;
}

/** Elegivel pra virar ADF na averbadora. Inclui:
 *  - "Ativo"/averbado (fluxo antigo — banco confirmava direto).
 *  - "Aprovado" (fluxo novo — banco so aprova, averbadora que faz a ADF).
 *  Reservas ("Aguardando"), cancelados e quitados NAO viram ADF pendente. */
function isAverbado(situacao: string): boolean {
  const s = situacao.toLowerCase();
  // Inclui "cobranca direta" pra que a ADF continue visivel na averbadora
  // apos cascade de desligamento (com status interrompida_desligamento) —
  // sem isso o historico sumia da tela.
  return s === "ativo" || s.includes("averb") || s.includes("aprov") || s.includes("cobran");
}

/** Materializa ADFs a partir dos contratos AVERBADOS da prefeitura (1 ADF por contrato).
 *  O status do ADF é fonte-única do próprio contrato (ct.folhaStatus) — assim a
 *  confirmação da prefeitura persiste e o banco a enxerga. Requer refreshContratos
 *  antes (feito no endpoint) pra ver averbações de outros isolates. */
/** Converte "DD/MM/YYYY" (formato lancamento) pra ISO 8601 "YYYY-MM-DDT00:00:00Z".
 *  Usado como fallback pra `criadoEmIso` em contratos do seed (sem ISO exato).
 *  Retorna null se a string nao bate o formato — nesse caso o chamador cai em
 *  outra estrategia (ex.: `now`). */
function parseLancamentoAsIso(lancamento: string | undefined): string | null {
  if (!lancamento) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(lancamento);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}T00:00:00.000Z`;
}

/** Deduz tipoMargem quando o contrato nao gravou o campo explicito. Usa
 *  observacoes ("Cartao Beneficio" | "Cartao Consignado" — texto que o
 *  criarContratoOuReserva ja escreve) + tipoContrato como sinais.
 *  So retorna algo pra ECONSIGNADO (o unico caso em que a distincao importa). */
function deduceTipoMargem(ct: { tipoMargem?: string; tipoContrato?: string; observacoes?: string }): string | undefined {
  if (ct.tipoMargem) return ct.tipoMargem;
  if (ct.tipoContrato !== "ECONSIGNADO") return undefined;
  const obs = (ct.observacoes ?? "").toLowerCase();
  if (obs.includes("beneficio") || obs.includes("benefício")) return "CARTAO_BENEFICIOS";
  if (obs.includes("consignado")) return "CARTAO_CONSIGNADO";
  return undefined;
}

export function ensureAdfs(prefeituraId: number, competencia: string, bancoNomeById: (id: number) => string, now: string): void {
  const convenioIds = new Set(CONVENIOS_MOCK.filter((cv) => cv.prefeituraId === prefeituraId).map((cv) => cv.id));
  const contratos = listContratos().filter((ct) => convenioIds.has(ct.convenioId) && isAverbado(ct.situacao));
  for (const ct of contratos) {
    const status = (ct.folhaStatus ?? "recebida") as AdfStatus;
    const tipoMargemInferido = deduceTipoMargem(ct);
    // Um contrato so pode viver em UMA competencia por vez (dupla contagem
    // gerava R$ X aparecendo em julho E agosto). Se ja existe ADF pra esse
    // contrato em OUTRA competencia, remove — a competencia certa e a que
    // o `resolverCompetenciaAdf` decidiu chamar (respeita data corte).
    // Excecao: ADFs ja `aplicada` ou `falha` em competencia anterior sao
    // historico permanente — NAO removem (dinheiro ja passou pela folha).
    for (let i = _adfs.length - 1; i >= 0; i--) {
      const a = _adfs[i]!;
      if (a.adf === ct.adf && a.competencia !== competencia && a.status === "recebida") {
        _adfs.splice(i, 1);
      }
    }
    const already = _adfs.find((a) => a.adf === ct.adf && a.competencia === competencia);
    if (already) {
      // So atualiza atualizadoEm se o status realmente MUDOU. Antes atualizava
      // em toda chamada do ensureAdfs (a cada request GET /admin/adf), o que
      // fazia ordem cronologica ficar instavel — tudo mostrava o timestamp
      // do ultimo refresh, nao do evento real.
      if (already.status !== status) {
        already.status = status;
        already.motivo = ct.folhaMotivo;
        already.atualizadoEm = now;
      } else if (already.motivo !== ct.folhaMotivo) {
        already.motivo = ct.folhaMotivo;
      } else if (already.status === "recebida" && ct.criadoEmIso && already.atualizadoEm !== ct.criadoEmIso) {
        // Backfill: se essa ADF ainda esta em "recebida" (nunca teve mudanca de
        // status), atualizadoEm deveria ser a criacao do contrato. Se drifted
        // (bug antigo), corrige — assim a ordem cronologica se restaura sem
        // precisar purgar+re-materializar.
        already.atualizadoEm = ct.criadoEmIso;
      }
      // Preenche tipoMargem se veio depois (ADF criado antes desse campo existir).
      if (!already.tipoMargem && tipoMargemInferido) already.tipoMargem = tipoMargemInferido;
      continue;
    }
    // atualizadoEm inicial = criacao do contrato (garante que ADFs materializadas
    // no mesmo batch tenham ordem CRONOLOGICA correta). Quando o status mudar,
    // vira o `now` do evento de mudanca — sempre "quando entrou nesse estado".
    // Fallback: se nao tem criadoEmIso (contrato do seed), converte `lancamento`
    // (DD/MM/YYYY) pra ISO — assim contratos antigos NAO viram "novos" no
    // sort DESC. So cai em `now` se nem lancamento tem, o que nao deveria
    // acontecer nunca em contrato real.
    const iso = ct.criadoEmIso ?? parseLancamentoAsIso(ct.lancamento) ?? now;
    _adfs.push({
      id: `ADF-${competencia}-${ct.adf}`,
      competencia, prefeituraId, adf: ct.adf, idUnico: issueIdUnico(prefeituraId),
      cpfMasked: ct.cpfMasked, matricula: ct.matricula, nome: ct.nome,
      bancoNome: bancoNomeById(ct.bancoId), valorParcela: ct.valorParcela, totalParcelas: ct.totalParcelas,
      valorFinanciado: ct.valorFinanciado, tipoContrato: ct.tipoContrato,
      tipoMargem: tipoMargemInferido,
      status, motivo: ct.folhaMotivo, atualizadoEm: iso,
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

/** Averbadora: aplica/reporta falha sem filtrar por prefeituraId. */
export function setAdfStatusGlobal(adfIds: string[], status: AdfStatus, motivo: string | undefined, now: string): string[] {
  const contratoAdfs: string[] = [];
  for (const a of _adfs) {
    if (adfIds.includes(a.id)) {
      a.status = status; a.motivo = motivo; a.atualizadoEm = now;
      setContratoFolhaStatus(a.adf, status, motivo);
      contratoAdfs.push(a.adf);
    }
  }
  return contratoAdfs;
}

/** Todas as ADFs de todas as prefeituras (visao averbadora). */
export function listAdfsGlobal(competencia?: string): AdfEntry[] {
  return _adfs.filter((a) => !competencia || a.competencia === competencia);
}

/** Remove entradas de _adfs por lista de ADF ids (a chave `adf` do contrato,
 *  nao o `id` interno). Usado ao reverter cascade de desligamento — sem isso
 *  as ADFs stale com folhaStatus="interrompida_desligamento" nao rehidratam
 *  no proximo ensureAdfs. */
export function removeAdfsByContratoAdf(contratoAdfs: string[]): number {
  const set = new Set(contratoAdfs);
  let n = 0;
  for (let i = _adfs.length - 1; i >= 0; i--) {
    const a = _adfs[i];
    if (a && set.has(a.adf)) { _adfs.splice(i, 1); n++; }
  }
  return n;
}

/** Remove ADFs pertencentes a matriculas dadas (in-memory). Usado pelo purge
 *  admin apos deleteContratosByMatriculas + removeContratosByMatricula — sem
 *  isso o `_adfs` continuaria referenciando contratos que sumiram. */
export function removeAdfsByMatricula(matriculas: string[]): number {
  const set = new Set(matriculas);
  let n = 0;
  for (let i = _adfs.length - 1; i >= 0; i--) {
    const a = _adfs[i];
    if (a && set.has(a.matricula)) { _adfs.splice(i, 1); n++; }
  }
  return n;
}

/** Materializa ADFs para TODAS as prefeituras da competencia. Usado pela averbadora. */
export function ensureAdfsGlobal(competencia: string, bancoNomeById: (id: number) => string, now: string, prefeituraIds: number[]): void {
  for (const pid of prefeituraIds) ensureAdfs(pid, competencia, bancoNomeById, now);
}

/** Todas as competencias com resumo. Sem filtro por prefeitura. */
export function listAdfCompetenciasGlobal(): { competencia: string; total: number; aplicadas: number; falhas: number }[] {
  const map = new Map<string, { competencia: string; total: number; aplicadas: number; falhas: number }>();
  for (const a of _adfs) {
    const g = map.get(a.competencia) ?? { competencia: a.competencia, total: 0, aplicadas: 0, falhas: 0 };
    g.total++;
    if (a.status === "aplicada") g.aplicadas++;
    else if (a.status === "falha") g.falhas++;
    map.set(a.competencia, g);
  }
  return Array.from(map.values()).sort((a, b) => b.competencia.localeCompare(a.competencia));
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

// Seed de anuencias vigentes pras prefeituras seed — evita "Anuencia de dados
// pendente" aparecer como pendencia permanente no painel. Prefeituras
// cadastradas via UI (id > 2) nao tem seed, entao a pendencia aparece
// legitimamente ate elas assinarem em /prefeitura/anuencia.
// Cliente pediu (20/07/2026) remocao dos seeds hardcoded de anuencia — ANU-0001
// (Palhoça) e ANU-0002 (Florianopolis) apareciam como "vigente" pra qualquer
// prefeitura que reciclasse id=1 ou id=2 (Capistrano herdou id=1 apos delete
// da Palhoça). Anuencias novas entram exclusivamente via POST /prefeitura/anuencia.
// Persistidas em PG (admin_anuencias) pra sobreviver a redeploys da API.
import { loadCollection, upsertCollectionRow } from "../../db/repos.js";
import type { Env } from "../../env.js";

const ANU_TABLE = "admin_anuencias";
const _anuencias: Anuencia[] = [];
let _anuSeq = 3;

/** Recarrega TODAS as anuencias do PG pra memoria. Best-effort. */
export async function refreshAnuencias(env: Env): Promise<void> {
  try {
    const rows = await loadCollection<Anuencia>(env, ANU_TABLE);
    _anuencias.length = 0;
    _anuencias.push(...rows);
    // Sincroniza sequence com o maior id existente pra nao gerar duplicata.
    const nums = rows
      .map((a) => Number((a.id ?? "").replace(/^ANU-0*/, "")))
      .filter((n) => Number.isFinite(n));
    _anuSeq = Math.max(0, ...nums) + 1;
  } catch { /* fail-safe: mantem in-memory */ }
}

/** Write-through: persiste no PG apos criar. Best-effort. */
export async function persistAnuencia(env: Env, a: Anuencia): Promise<void> {
  try { await upsertCollectionRow(env, ANU_TABLE, a.id, a); } catch { /* fail-safe */ }
}

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

/** Remove uma anuencia por id (in-memory + retorna se existia). Admin use only. */
export function removeAnuenciaMemoria(id: string): boolean {
  const idx = _anuencias.findIndex((a) => a.id === id);
  if (idx < 0) return false;
  _anuencias.splice(idx, 1);
  return true;
}

// ============================================================
// Perfis por área (RH, financeiro, gestor) + 2FA TOTP
// ============================================================

/** Preset (label) — apenas display. Fonte de verdade da autorizacao e permissoes[].
 *  "gestor" mantido pra retrocompat. "personalizado" quando as caixas nao casam
 *  com nenhum preset. */
export type PrefeituraArea = "rh" | "financeiro" | "gestor" | "personalizado";
export const AREA_LABEL: Record<PrefeituraArea, string> = {
  rh: "Recursos Humanos",
  financeiro: "Financeiro",
  gestor: "Gestor",
  personalizado: "Personalizado",
};

/** Presets do portal prefeitura — pontos de partida pro checkbox matrix. */
export const PREFEITURA_PRESETS: Record<PrefeituraArea, string[]> = {
  gestor: ["*"],
  rh: [
    "dashboard", "servidores", "convenios", "contratos", "adf",
    "anuencia", "comunicados", "conta",
  ],
  financeiro: [
    "dashboard", "folhas", "contratos", "tombamento", "adf",
    "relatorios", "comunicados", "conta",
  ],
  personalizado: [],
};

export function detectarPrefeituraPreset(permissoes: string[]): PrefeituraArea {
  const set = new Set(permissoes);
  for (const [nome, keys] of Object.entries(PREFEITURA_PRESETS) as [PrefeituraArea, string[]][]) {
    if (nome === "personalizado") continue;
    if (keys.length !== set.size) continue;
    if (keys.every((k) => set.has(k))) return nome;
  }
  return "personalizado";
}

export interface PrefeituraPerfil {
  id: number;
  prefeituraId: number;
  nome: string;
  email: string;
  /** Label do preset. Fonte de verdade da autorizacao e `permissoes`. */
  area: PrefeituraArea;
  /** Fonte de verdade da autorizacao. "*" = wildcard (gestor). */
  permissoes: string[];
  ativo: boolean;
  twofaEnabled: boolean;
  totpSecret?: string;
  criadoEm: string;
}

// Cliente pediu remocao dos 2 perfis hardcoded (Coordenacao RH / Setor
// Financeiro, ambos com prefeituraId=1 apontando pra Palhoca ja removida) em
// 17/07/2026. Motivo: quando a prefeitura seed sumiu, esses perfis viraram
// orfaos e "vazaram" pra proxima prefeitura que herdasse id=1 (Capistrano).
// Perfis novos entram exclusivamente via UI (POST /prefeitura/perfis) atrelados
// ao prefeituraId do JWT — que corresponde ao CNPJ do login.
const _perfis: PrefeituraPerfil[] = [];
let _perfilSeq = 1;

/** Migra perfis hidratados do PG sem permissoes[] — deriva da area. Idempotente. */
export function ensurePerfilPermissoes(p: PrefeituraPerfil): void {
  if (Array.isArray(p.permissoes) && p.permissoes.length > 0) return;
  const preset = PREFEITURA_PRESETS[p.area];
  p.permissoes = preset ? [...preset] : [];
}

export function listPerfis(prefeituraId: number): PrefeituraPerfil[] {
  return _perfis.filter((p) => p.prefeituraId === prefeituraId);
}

export function upsertPerfil(input: { id?: number; prefeituraId: number; nome: string; email: string; area?: PrefeituraArea; permissoes?: string[]; ativo?: boolean }, now: string): PrefeituraPerfil {
  // Resolve permissoes: se veio explicito, usa; senao deriva do preset; senao "rh".
  const permissoes = Array.isArray(input.permissoes)
    ? [...input.permissoes]
    : input.area && PREFEITURA_PRESETS[input.area]
      ? [...PREFEITURA_PRESETS[input.area]]
      : [...PREFEITURA_PRESETS.rh];
  const areaResolvida: PrefeituraArea = input.area ?? detectarPrefeituraPreset(permissoes);
  const existing = input.id ? _perfis.find((p) => p.id === input.id && p.prefeituraId === input.prefeituraId) : undefined;
  if (existing) {
    existing.nome = input.nome; existing.email = input.email;
    existing.area = areaResolvida;
    existing.permissoes = permissoes;
    if (input.ativo != null) existing.ativo = input.ativo;
    return existing;
  }
  const novo: PrefeituraPerfil = {
    id: _perfilSeq++, prefeituraId: input.prefeituraId, nome: input.nome, email: input.email,
    area: areaResolvida, permissoes, ativo: input.ativo ?? true, twofaEnabled: false, criadoEm: now,
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
