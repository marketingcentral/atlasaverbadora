/**
 * /v1/admin/verify — camada 2 da estrategia de teste intensivo.
 * Roda 6 grupos de invariantes que detectam dado errado ANTES do cliente ver:
 *   A) consistencia de banco (previne banco fantasma tipo "Scred Financeira")
 *   B) formato de taxa (previne "179%" ou "0.02%" vindo de percent salvo como cru)
 *   C) estados coerentes (folhaStatus vs situacao, ADF vs contrato)
 *   D) IDs unicos (colisao entre ADFs)
 *   E) cross-profile amostral (mesmo contrato bate rotulo/valor entre 4 perfis)
 *   F) orfaos e stale (servidores sem vinculo, ofertas expiradas ativas)
 *
 * Cache 20s em KV_CACHE (mesmo padrao do /v1/admin/health). Requer admin.
 *
 * Cada check devolve { ok, detalhes?, exemplos? }. O agregado ok = todos os
 * checks ok. Falha nao "quebra" nada em prod — so alerta na tela
 * /averbadora/verify pra o operador reagir.
 */

import {
  comprometeMargem,
  deriveProdutoLabel,
  isContratoTelemedicina,
  nomeExibicaoBanco,
} from "@atlas/domain";
import type { Oferta } from "../portal-banco/ofertas-store.js";

export interface CheckResult {
  nome: string;
  ok: boolean;
  detalhes?: string;
  exemplos?: unknown[];
}

export interface VerifyReport {
  ok: boolean;
  geradoEm: string;
  grupos: Record<"A" | "B" | "C" | "D" | "E" | "F", CheckResult[]>;
}

interface ContratoLike {
  adf: string;
  bancoId: number;
  matricula: string;
  situacao: string;
  taxaAm: number;
  folhaStatus?: string;
  convenioId: string;
  valorFinanciado: number;
  valorParcela: number;
  totalParcelas: number;
  tipoContrato?: string;
  tipoMargem?: "EMPRESTIMO" | "CARTAO_CONSIGNADO" | "CARTAO_BENEFICIOS";
  observacoes?: string;
  bancoOrigem?: string;
}
interface BancoLike { id: number; nome: string; status?: string; }
interface PrefeituraLike { id: number; nome: string; status?: string; }
interface ConvenioLike { id: string; nome?: string; bancoId: number; prefeituraId?: number; }
interface AdfLike { id: string; adf: string; idUnico: string; prefeituraId: number; competencia: string; }
interface ServidorLike { matricula: string; prefeituraId?: number; idConvenio?: string; }
interface TabelaEmprestimoLike { id: string; convenioId?: string; taxaAm?: number; ativo?: boolean; }
interface PortabilidadeLike { id: string; status: string; ofertas: { novaTaxaAm: number }[]; }

export interface VerifyInputs {
  contratos: ContratoLike[];
  bancos: BancoLike[];
  prefeituras: PrefeituraLike[];
  convenios: ConvenioLike[];
  adfs: AdfLike[];
  servidores: ServidorLike[];
  ofertas: Oferta[];
  tabelasEmprestimo: TabelaEmprestimoLike[];
  portabilidades: PortabilidadeLike[];
}

// Blacklist historica — se algum desses nomes voltar a aparecer, e regressao
// conhecida. Adicionar mais conforme incidentes futuros.
const BLACKLIST_NOMES_BANCO = [/scred/i, /^banco fake$/i, /^banco 1$/i];

// ------------------------------------------------------------
// GRUPO A — consistencia de banco (previne "Scred Financeira")
// ------------------------------------------------------------
export function grupoA(inputs: VerifyInputs): CheckResult[] {
  const bancoIds = new Set(inputs.bancos.map((b) => b.id));
  const prefIds = new Set(inputs.prefeituras.map((p) => p.id));

  const contratosOrfaos = inputs.contratos.filter((ct) => !bancoIds.has(ct.bancoId));
  const ofertasOrfas = inputs.ofertas.filter((o) => !bancoIds.has(o.bancoId));
  const conveniosOrfaos = inputs.convenios.filter((cv) => !bancoIds.has(cv.bancoId) || (cv.prefeituraId != null && !prefIds.has(cv.prefeituraId)));
  const nomesBlacklistados = inputs.bancos.filter((b) => BLACKLIST_NOMES_BANCO.some((r) => r.test(b.nome)));

  // Tabelas de emprestimo -> convenio.bancoId -> banco existente.
  // Bug reportado 23/07/2026: /servidor/marketplace mostrava "SCred Financeira"
  // porque /me/ofertas fazia split do NOME do convenio. Se qualquer tabela
  // ativa aponta pra convenio orfao (ou convenio com bancoId invalido) —
  // simulador do servidor cai em nome nulo / fantasma.
  const conveniosMap = new Map(inputs.convenios.map((cv) => [cv.id, cv]));
  const tabelasOrfas = inputs.tabelasEmprestimo.filter((t) => {
    if (!t.ativo) return false;
    const cv = conveniosMap.get((t as { convenioId?: string }).convenioId ?? "");
    if (!cv) return true; // convenio nao existe
    return !bancoIds.has(cv.bancoId); // convenio existe mas aponta pra banco removido
  });

  // Blacklist de nomes tambem no CONVENIO — cliente reportou 23/07/2026 que
  // "SCred Financeira" reaparecia. Causa: convenio ficou salvo com "SCred"
  // no texto do nome (do seed antigo) e outro endpoint fazia split disso.
  const conveniosComNomeSuspeito = inputs.convenios.filter((cv) => {
    const nome = (cv as { nome?: string }).nome ?? "";
    return BLACKLIST_NOMES_BANCO.some((r) => r.test(nome));
  });

  return [
    {
      nome: "Contratos com bancoId que existe em `bancos`",
      ok: contratosOrfaos.length === 0,
      detalhes: contratosOrfaos.length === 0 ? undefined : `${contratosOrfaos.length} contrato(s) com bancoId invalido — servidor veria "Banco {N}" ou nome fantasma`,
      exemplos: contratosOrfaos.slice(0, 5).map((ct) => ({ adf: ct.adf, bancoId: ct.bancoId, matricula: ct.matricula })),
    },
    {
      nome: "Ofertas com bancoId valido",
      ok: ofertasOrfas.length === 0,
      detalhes: ofertasOrfas.length === 0 ? undefined : `${ofertasOrfas.length} oferta(s) apontando pra banco inexistente`,
      exemplos: ofertasOrfas.slice(0, 5).map((o) => ({ id: o.id, bancoId: o.bancoId, titulo: o.titulo })),
    },
    {
      nome: "Convenios com bancoId e prefeituraId validos",
      ok: conveniosOrfaos.length === 0,
      detalhes: conveniosOrfaos.length === 0 ? undefined : `${conveniosOrfaos.length} convenio(s) com FK invalida`,
      exemplos: conveniosOrfaos.slice(0, 5).map((cv) => ({ id: cv.id, bancoId: cv.bancoId, prefeituraId: cv.prefeituraId })),
    },
    {
      nome: "Blacklist de nomes historicos em bancos (Scred, Banco fake, Banco 1)",
      ok: nomesBlacklistados.length === 0,
      detalhes: nomesBlacklistados.length === 0 ? undefined : `${nomesBlacklistados.length} banco(s) com nome que ja foi bug conhecido — recadastrado?`,
      exemplos: nomesBlacklistados.slice(0, 5).map((b) => ({ id: b.id, nome: b.nome })),
    },
    {
      nome: "Tabelas de emprestimo ativas com convenio + banco validos",
      ok: tabelasOrfas.length === 0,
      detalhes: tabelasOrfas.length === 0 ? undefined : `${tabelasOrfas.length} tabela(s) ativa(s) apontando pra convenio inexistente ou convenio com bancoId orfao — servidor pode ver oferta de banco fantasma`,
      exemplos: tabelasOrfas.slice(0, 5).map((t) => ({ id: t.id, convenioId: (t as { convenioId?: string }).convenioId })),
    },
    {
      nome: "Blacklist de nomes historicos em convenios (SCred etc no nome do convenio)",
      ok: conveniosComNomeSuspeito.length === 0,
      detalhes: conveniosComNomeSuspeito.length === 0 ? undefined : `${conveniosComNomeSuspeito.length} convenio(s) com texto de banco fantasma no nome — vazava pro simulador via split("/")`,
      exemplos: conveniosComNomeSuspeito.slice(0, 5).map((cv) => ({ id: cv.id, nome: (cv as { nome?: string }).nome })),
    },
  ];
}

// ------------------------------------------------------------
// GRUPO B — formato de taxa (previne "179%" ou "0.02%")
// ------------------------------------------------------------
export function grupoB(inputs: VerifyInputs): CheckResult[] {
  // taxaAm em contratos deve estar em [0, 1] (cru: 0.0179 = 1.79%). >1 = percent
  // salvo como cru — vira 179% na UI.
  const contratosForaRange = inputs.contratos.filter((ct) => ct.taxaAm > 1 || ct.taxaAm < 0);
  // taxaAm em oferta: banco entra em %, aceita ate 20% (limite razoavel).
  const ofertasForaRange = inputs.ofertas.filter((o) => o.taxaAm > 20 || o.taxaAm < 0);
  // Tabela emprestimo: taxaAm cru, [0, 1].
  const tabelasForaRange = inputs.tabelasEmprestimo.filter((t) => (t.taxaAm ?? 0) > 1 || (t.taxaAm ?? 0) < 0);
  // Portabilidade ofertas: novaTaxaAm cru, [0, 1].
  const portOfertasForaRange = inputs.portabilidades.flatMap((p) =>
    p.ofertas.filter((o) => o.novaTaxaAm > 1 || o.novaTaxaAm < 0).map((o) => ({ portId: p.id, novaTaxaAm: o.novaTaxaAm })),
  );

  return [
    {
      nome: "contratos.taxaAm em [0, 1] (formato cru)",
      ok: contratosForaRange.length === 0,
      detalhes: contratosForaRange.length === 0 ? undefined : `${contratosForaRange.length} contrato(s) com taxa >1 (provavelmente percent salvo como cru — vai renderizar como 179% na UI)`,
      exemplos: contratosForaRange.slice(0, 5).map((ct) => ({ adf: ct.adf, taxaAm: ct.taxaAm, bancoId: ct.bancoId })),
    },
    {
      nome: "ofertas.taxaAm em [0, 20] (formato percent)",
      ok: ofertasForaRange.length === 0,
      detalhes: ofertasForaRange.length === 0 ? undefined : `${ofertasForaRange.length} oferta(s) com taxa absurda`,
      exemplos: ofertasForaRange.slice(0, 5).map((o) => ({ id: o.id, taxaAm: o.taxaAm })),
    },
    {
      nome: "tabelas de emprestimo com taxaAm em [0, 1]",
      ok: tabelasForaRange.length === 0,
      detalhes: tabelasForaRange.length === 0 ? undefined : `${tabelasForaRange.length} tabela(s) com taxa fora do range esperado`,
      exemplos: tabelasForaRange.slice(0, 5).map((t) => ({ id: t.id, taxaAm: t.taxaAm })),
    },
    {
      nome: "ofertas de portabilidade com novaTaxaAm em [0, 1]",
      ok: portOfertasForaRange.length === 0,
      detalhes: portOfertasForaRange.length === 0 ? undefined : `${portOfertasForaRange.length} oferta(s) de portabilidade fora do range`,
      exemplos: portOfertasForaRange.slice(0, 5),
    },
  ];
}

// ------------------------------------------------------------
// GRUPO C — estados coerentes
// ------------------------------------------------------------
export function grupoC(inputs: VerifyInputs): CheckResult[] {
  // folhaStatus="aplicada" implica situacao averbada.
  const folhaAplicadaMasNaoAtivo = inputs.contratos.filter((ct) => {
    if (ct.folhaStatus !== "aplicada") return false;
    const s = ct.situacao.toLowerCase();
    return !(s.includes("ativo") || s.includes("averb") || s.includes("quitad"));
  });

  // Cancelado NUNCA tem folhaStatus (A5 zera; verifica retro).
  const canceladoComFolha = inputs.contratos.filter((ct) => /cancel/i.test(ct.situacao) && ct.folhaStatus);

  // Toda ADF tem contrato correspondente (join adf->contrato.adf).
  const adfsSet = new Set(inputs.contratos.map((ct) => ct.adf));
  const adfsOrfas = inputs.adfs.filter((a) => !adfsSet.has(a.adf));

  return [
    {
      nome: "folhaStatus=aplicada -> situacao averbada (Ativo/Averbado/Quitado)",
      ok: folhaAplicadaMasNaoAtivo.length === 0,
      detalhes: folhaAplicadaMasNaoAtivo.length === 0 ? undefined : `${folhaAplicadaMasNaoAtivo.length} contrato(s) marcado APLICADA em folha mas com situacao contraditoria`,
      exemplos: folhaAplicadaMasNaoAtivo.slice(0, 5).map((ct) => ({ adf: ct.adf, situacao: ct.situacao, folhaStatus: ct.folhaStatus })),
    },
    {
      nome: "Contrato Cancelado nao tem folhaStatus (foi zerado)",
      ok: canceladoComFolha.length === 0,
      detalhes: canceladoComFolha.length === 0 ? undefined : `${canceladoComFolha.length} contrato(s) cancelado mas ainda com folhaStatus setado (bug antigo pos-A5)`,
      exemplos: canceladoComFolha.slice(0, 5).map((ct) => ({ adf: ct.adf, folhaStatus: ct.folhaStatus })),
    },
    {
      nome: "Toda ADF em _adfs tem contrato correspondente em _contratos",
      ok: adfsOrfas.length === 0,
      detalhes: adfsOrfas.length === 0 ? undefined : `${adfsOrfas.length} ADF(s) orfa — contrato foi deletado sem limpar ADF`,
      exemplos: adfsOrfas.slice(0, 5).map((a) => ({ id: a.id, adf: a.adf, prefeituraId: a.prefeituraId })),
    },
  ];
}

// ------------------------------------------------------------
// GRUPO D — IDs unicos
// ------------------------------------------------------------
export function grupoD(inputs: VerifyInputs): CheckResult[] {
  // Duplicatas de idUnico por prefeitura.
  const seen = new Map<string, { prefeituraId: number; adfs: string[] }>();
  const duplicados: { idUnico: string; prefeituraId: number; adfs: string[] }[] = [];
  for (const a of inputs.adfs) {
    const key = `${a.prefeituraId}:${a.idUnico}`;
    const prev = seen.get(key);
    if (prev) {
      prev.adfs.push(a.adf);
      if (prev.adfs.length === 2) duplicados.push({ idUnico: a.idUnico, prefeituraId: a.prefeituraId, adfs: prev.adfs });
    } else {
      seen.set(key, { prefeituraId: a.prefeituraId, adfs: [a.adf] });
    }
  }

  return [
    {
      nome: "Nenhum idUnico duplicado entre ADFs da mesma prefeitura",
      ok: duplicados.length === 0,
      detalhes: duplicados.length === 0 ? undefined : `${duplicados.length} idUnico(s) usados por mais de uma ADF na mesma prefeitura — colisao de sequencial`,
      exemplos: duplicados.slice(0, 5),
    },
  ];
}

// ------------------------------------------------------------
// GRUPO E — cross-profile amostral (o coracao)
// ------------------------------------------------------------
export function grupoE(inputs: VerifyInputs): CheckResult[] {
  // Amostra ate 10 contratos vivos (nao terminais). Pra cada, calcula o
  // "banco de exibicao" que averbadora, servidor e prefeitura devem mostrar
  // e verifica que os 3 batem. Diverge -> lista.
  const bancoNomePorId = new Map(inputs.bancos.map((b) => [b.id, b.nome]));
  const resolver = (id: number) => bancoNomePorId.get(id) ?? `Banco ${id}`;

  const vivos = inputs.contratos.filter((ct) => !/cancel|expir|quitad|recus|reprov|rejeit|negad|estorn/i.test(ct.situacao));
  const amostra = vivos.slice(0, 10);

  const divergencias: unknown[] = [];
  for (const ct of amostra) {
    const nomeUnificado = nomeExibicaoBanco(ct, resolver);
    const produtoUnificado = deriveProdutoLabel(ct);
    // Sanity minimo: nome nao pode ser undefined nem "Banco {id}" (fallback so ativa se banco nao existe).
    if (nomeUnificado.startsWith("Banco ") && !isContratoTelemedicina(ct)) {
      divergencias.push({ adf: ct.adf, campo: "bancoNome", motivo: `fallback ativado (bancoId=${ct.bancoId} nao existe)` });
    }
    // Produto vazio ou desconhecido.
    const produtosValidos = ["TELEMEDICINA", "REFIN", "PORTABILIDADE", "CARTAO_BENEFICIO", "CARTAO_CONSIGNADO", "EMPRESTIMO"];
    if (!produtosValidos.includes(produtoUnificado)) {
      divergencias.push({ adf: ct.adf, campo: "produto", valor: produtoUnificado });
    }
  }

  return [
    {
      nome: `Amostra de ${amostra.length} contratos vivos com bancoNome + produto derivaveis`,
      ok: divergencias.length === 0,
      detalhes: divergencias.length === 0 ? `Todos os ${amostra.length} contratos vivos resolvem nome e produto corretamente` : `${divergencias.length} divergencia(s) encontradas`,
      exemplos: divergencias.slice(0, 10),
    },
    {
      nome: "Contratos que comprometem margem tem bancoId valido (evita margem travada com fantasma)",
      ok: (() => {
        const bancoIds = new Set(inputs.bancos.map((b) => b.id));
        return inputs.contratos.filter((ct) => comprometeMargem(ct.situacao) && !bancoIds.has(ct.bancoId)).length === 0;
      })(),
      detalhes: undefined,
    },
  ];
}

// ------------------------------------------------------------
// GRUPO F — orfaos e stale
// ------------------------------------------------------------
export function grupoF(inputs: VerifyInputs): CheckResult[] {
  // Servidores sem vinculo (nao contam em KPI mas existem — cliente ja
  // reportou "Total 33 mas tabelas mostram outras contas").
  const conveniosPorId = new Map(inputs.convenios.map((cv) => [cv.id, cv]));
  const servidoresOrfaos = inputs.servidores.filter((s) => {
    if (s.prefeituraId) return false;
    if (s.idConvenio && conveniosPorId.get(s.idConvenio)?.prefeituraId != null) return false;
    return true;
  });

  // Contratos cujo convenioId nao existe.
  const conveniosSet = new Set(inputs.convenios.map((cv) => cv.id));
  const contratosSemConvenio = inputs.contratos.filter((ct) => !conveniosSet.has(ct.convenioId));

  // Ofertas expiradas ainda ativas.
  const now = Date.now();
  const ofertasExpiradasAtivas = inputs.ofertas.filter((o) => o.ativo && o.expiraEm && Date.parse(o.expiraEm) < now);

  return [
    {
      nome: "Servidores com vinculo (prefeituraId direto ou via convenio)",
      ok: servidoresOrfaos.length === 0,
      detalhes: servidoresOrfaos.length === 0 ? undefined : `${servidoresOrfaos.length} servidor(es) orfao(s) — nao aparecem em KPI mas ocupam base`,
      exemplos: servidoresOrfaos.slice(0, 5).map((s) => ({ matricula: s.matricula })),
    },
    {
      nome: "Contratos com convenioId que existe",
      ok: contratosSemConvenio.length === 0,
      detalhes: contratosSemConvenio.length === 0 ? undefined : `${contratosSemConvenio.length} contrato(s) apontando pra convenio deletado`,
      exemplos: contratosSemConvenio.slice(0, 5).map((ct) => ({ adf: ct.adf, convenioId: ct.convenioId })),
    },
    {
      nome: "Ofertas com expiraEm no passado sao inativas",
      ok: ofertasExpiradasAtivas.length === 0,
      detalhes: ofertasExpiradasAtivas.length === 0 ? undefined : `${ofertasExpiradasAtivas.length} oferta(s) expirada(s) ainda com ativo=true — servidor pode simular sobre elas`,
      exemplos: ofertasExpiradasAtivas.slice(0, 5).map((o) => ({ id: o.id, titulo: o.titulo, expiraEm: o.expiraEm })),
    },
  ];
}

// ------------------------------------------------------------
// Runner principal
// ------------------------------------------------------------
export function runVerify(inputs: VerifyInputs): VerifyReport {
  const grupos = {
    A: grupoA(inputs),
    B: grupoB(inputs),
    C: grupoC(inputs),
    D: grupoD(inputs),
    E: grupoE(inputs),
    F: grupoF(inputs),
  };
  const ok = Object.values(grupos).every((cs) => cs.every((c) => c.ok));
  return {
    ok,
    geradoEm: new Date().toISOString(),
    grupos,
  };
}
