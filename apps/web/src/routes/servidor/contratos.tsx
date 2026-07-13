import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Pill, Tabs } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import {
  ContratoMock as Contrato,
  MatriculaInfo,
  readActiveMatricula,
  STORAGE_KEY_ID,
  STORAGE_KEY_META,
} from "../../lib/matricula-data";
import { buildSimplePdf, downloadPdf } from "../../lib/pdf";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

/** Estado agrupado da proposta pro servidor (view). */
type EstadoProposta = "em_analise" | "aprovada" | "aguardando_formalizacao" | "recusada" | "expirada" | "cancelada" | "liberada";

function mapSituacao(situacao: string): EstadoProposta {
  const t = situacao.toLowerCase();
  // ATENCAO: ordem importa — checagens negativas primeiro pra evitar que
  // "Cancelado" caia em "aguard" (nunca cairia, mas defensivo).
  if (t.includes("cancel") || t.includes("estorn")) return "cancelada";
  if (t.includes("recus") || t.includes("reprov") || t.includes("rejeit") || t.includes("negad")) return "recusada";
  if (t.includes("suspens")) return "cancelada";
  if (t.includes("expir")) return "expirada";
  if (t.includes("quitad")) return "liberada";
  if (t.includes("ativo") || t.includes("averb")) return "liberada";
  // Banco aprovou mas ainda nao averbou (situacao intermediaria "Aprovado")
  // — antes caia no fallback "em_analise" que iludia o servidor a achar que
  // ainda estava sob analise.
  if (t.includes("aprov")) return "aprovada";
  if (t.includes("formaliz")) return "aguardando_formalizacao";
  if (t.includes("aguard confirm")) return "em_analise";
  if (t.includes("aguard")) return "em_analise";
  return "em_analise";
}

/** Label do produto pro card do servidor. tipoContrato vem do backend
 *  (EMPRESTIMO | REFIN | ECONSIGNADO). Fallback pra "Empréstimo consignado"
 *  se vier undefined (dado antigo antes deste campo existir). */
function mapProduto(tipoContrato: string | undefined): string {
  const t = (tipoContrato ?? "").toUpperCase();
  if (t === "REFIN") return "Portabilidade";
  if (t === "ECONSIGNADO") return "Cartão consignado";
  return "Empréstimo consignado";
}

const ESTADO_LABEL: Record<EstadoProposta, string> = {
  em_analise: "Em análise pelo banco",
  aprovada: "Aprovada",
  aguardando_formalizacao: "Aguardando assinatura",
  recusada: "Recusada",
  expirada: "Expirada",
  cancelada: "Cancelada",
  liberada: "Averbada — virou contrato",
};

/** Rotulo do produto no card do contrato. ContratoMock nao tem tipoContrato
 *  explicito; deduz por substring no nome do banco (compat com codigo antigo:
 *  banco com "refin" no nome ⇒ Portabilidade). Quando o backend passar a mandar
 *  tipoContrato no contrato, so trocar por mapProduto(c.tipoContrato). */
function produtoContratoLabel(banco: string): string {
  if (banco.toLowerCase().includes("refin")) return "Portabilidade";
  return "Empréstimo consignado";
}

function estadoPillVariant(e: EstadoProposta): "aceita" | "pendente" | "expirado" | "averbado" {
  if (e === "liberada") return "averbado";
  if (e === "recusada" || e === "expirada" || e === "cancelada") return "expirado";
  if (e === "aprovada" || e === "aguardando_formalizacao") return "aceita";
  return "pendente";
}

/** Uma proposta ainda "viva" (nao virou contrato averbado ainda). */
function ehEmAndamento(estado: EstadoProposta): boolean {
  return estado === "em_analise" || estado === "aprovada" || estado === "aguardando_formalizacao";
}

/** Proposta que terminou negativa — vai pro Historico. */
function ehHistoricoProposta(estado: EstadoProposta): boolean {
  return estado === "recusada" || estado === "expirada" || estado === "cancelada";
}

export function ServidorContratos() {
  // Aba "Todos" foi removida a pedido do cliente. Ficou so Ativos (default)
  // e Historico. Historico inclui contratos quitados + propostas recusadas/
  // expiradas/canceladas.
  const [tab, setTab] = useState<"ativos" | "historico">("ativos");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [info, setInfo] = useState<MatriculaInfo | null>(() => readActiveMatricula());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_META || e.key === STORAGE_KEY_ID) {
        setInfo(readActiveMatricula());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Propostas em andamento (o servidor solicitou, o banco ainda nao averbou).
  // Poll de 10s pra o servidor ver quando muda de "em_analise" pra "aprovada" etc.
  const propostasQ = useQuery({
    queryKey: ["servidor", "propostas", info?.matricula],
    queryFn: () => atlas.servidor.propostas(info?.matricula),
    enabled: !!info?.matricula,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  // Todas as propostas mapeadas — separa em andamento e historico.
  const propostasMapeadas = useMemo(() => {
    return (propostasQ.data?.propostas ?? []).map((p) => ({
      id: p.id,
      banco: p.banco,
      estado: mapSituacao(p.situacao),
      // tipoContrato do backend: EMPRESTIMO | REFIN | ECONSIGNADO.
      // Usado pra mostrar "Empréstimo / Portabilidade / Cartão" no card
      // (senao o servidor nao sabe pra qual produto e a proposta).
      produto: mapProduto(p.tipoContrato),
      valor: p.valor,
      parcelas: p.parcelas,
      parcela: p.parcela,
      taxaAm: p.taxaAm,
      data: p.data,
      // Vem do backend quando existir — usado pra rotular o produto no card.
      tipoContrato: p.tipoContrato,
    }));
  }, [propostasQ.data]);

  const emAndamento = useMemo(
    () => propostasMapeadas.filter((p) => ehEmAndamento(p.estado)),
    [propostasMapeadas],
  );
  const propostasHistorico = useMemo(
    () => propostasMapeadas.filter((p) => ehHistoricoProposta(p.estado)),
    [propostasMapeadas],
  );

  const contratos: Contrato[] = info?.contratos ?? [];
  const filtered = contratos.filter((c) => {
    if (tab === "ativos") return c.status !== "Quitado";
    // historico
    return c.status === "Quitado";
  });

  async function baixarPdf(c: Contrato) {
    setDownloading(c.id);
    await new Promise((r) => setTimeout(r, 700));
    const valorTotal = c.parcela * c.total;
    const pdf = buildSimplePdf("COMPROVANTE DE CONTRATO CONSIGNADO", [
      { text: `Contrato: ${c.id}`, bold: true },
      `Banco credor: ${c.banco}`,
      `Situacao: ${c.status}`,
      "",
      { text: "SERVIDOR", bold: true },
      `Nome: ${info?.nome ?? "—"}`,
      `Matricula: ${info?.matricula ?? "—"}`,
      `Orgao: ${info?.prefeitura ?? "—"}`,
      "",
      { text: "OPERACAO", bold: true },
      `Valor financiado: ${fmtBRL(c.valorFinanciado)}`,
      `Taxa a.m.: ${(c.taxaAm * 100).toFixed(2)}%`,
      `Parcela: ${fmtBRL(c.parcela)}`,
      `Parcelas pagas: ${c.parcelasPagas} de ${c.total}`,
      `Valor total contratado: ${fmtBRL(valorTotal).replace(/\s/g, " ")}`,
      `Proxima parcela: ${c.proximaParcela}`,
      "",
      "Este comprovante e uma copia do contrato para conferencia.",
      "Para quitacao antecipada ou renegociacao, contate diretamente o banco credor.",
    ]);
    downloadPdf(`contrato-${c.id}.pdf`, pdf);
    setDownloading(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Meus contratos
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Contratos e propostas</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6, fontSize: ".9rem" }}>
          {info ? <>Matrícula <b>{info.matricula}</b> ({info.prefeitura}). </> : null}
          Uma proposta vira contrato quando o banco confirma a averbação em folha.
        </p>
      </header>

      {/* Propostas em andamento — o servidor ve o que solicitou virar contrato */}
      {emAndamento.length > 0 ? (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Em andamento ({emAndamento.length})
          </span>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
            Propostas que você criou e ainda estão sendo analisadas pelo banco. Quando forem averbadas, aparecem abaixo como contrato.
          </p>
          {emAndamento.map((p) => {
            return (
            <Card key={p.id} style={{ borderColor: "var(--gold-500)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700 }}>{p.banco}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--accent)", padding: "2px 8px", borderRadius: 999, border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)" }}>
                      {p.produto}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
                    Proposta {p.id} · criada em {p.data}
                  </div>
                </div>
                <Pill variant={estadoPillVariant(p.estado)}>{ESTADO_LABEL[p.estado]}</Pill>
              </div>
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: 12, marginTop: 14, fontSize: 13,
              }}>
                <KV label="Valor liberado" v={fmtBRL(p.valor)} accent />
                <KV label="Parcelas" v={`${p.parcelas}x de ${fmtBRL(p.parcela)}`} />
                <KV label="Taxa a.m." v={`${p.taxaAm.toFixed(2)}%`} />
              </div>

              {/* Linha de progresso — em que etapa a proposta esta agora. */}
              <ProgressoProposta estado={p.estado} />
            </Card>
            );
          })}
        </section>
      ) : null}

      {/* Contratos ativos e historico (fluxo antigo) */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            {tab === "ativos" ? "Contratos averbados" : "Histórico"}
          </span>
          <Tabs
            variant="pills"
            activeKey={tab}
            onChange={(k) => setTab(k as typeof tab)}
            tabs={[
              { key: "ativos", label: "Ativos" },
              { key: "historico", label: "Histórico" },
            ]}
          />
        </div>

        {/* Historico: propostas recusadas/expiradas/canceladas aparecem primeiro,
            depois os contratos quitados. */}
        {tab === "historico" && propostasHistorico.length > 0 ? (
          <div style={{ display: "grid", gap: 12 }}>
            {propostasHistorico.map((p) => {
              return (
              <Card key={p.id} style={{ opacity: 0.85 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700 }}>{p.banco}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--accent)", padding: "2px 8px", borderRadius: 999, border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)" }}>
                        {p.produto}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
                      Proposta {p.id} · criada em {p.data}
                    </div>
                  </div>
                  <Pill variant={estadoPillVariant(p.estado)}>{ESTADO_LABEL[p.estado]}</Pill>
                </div>
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: 12, marginTop: 14, fontSize: 13,
                }}>
                  <KV label="Valor solicitado" v={fmtBRL(p.valor)} />
                  <KV label="Parcelas" v={`${p.parcelas}x de ${fmtBRL(p.parcela)}`} />
                  <KV label="Taxa a.m." v={`${p.taxaAm.toFixed(2)}%`} />
                </div>
                {/* Mesma linha de progresso — pinta em vermelho onde parou. */}
                <ProgressoProposta estado={p.estado} />
              </Card>
              );
            })}
          </div>
        ) : null}

        {filtered.length === 0 && (tab === "ativos" || propostasHistorico.length === 0) ? (
          <Card>
            <div style={{ textAlign: "center", padding: "24px 12px" }}>
              <div style={{ fontSize: 36, opacity: 0.5 }}>📄</div>
              <h3 style={{ marginTop: 12, marginBottom: 6 }}>
                {tab === "ativos" ? "Sem contratos ativos" : "Sem histórico"}
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: ".9rem", maxWidth: 380, margin: "0 auto" }}>
                {tab === "ativos"
                  ? "Você não tem contratos ativos nesta matrícula no momento."
                  : "Ainda não há contratos quitados nem propostas recusadas/expiradas nesta matrícula."}
              </p>
            </div>
          </Card>
        ) : filtered.length === 0 ? null : (
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map((c) => {
              const pct = (c.parcelasPagas / c.total) * 100;
              const quitado = c.status === "Quitado";
              const produto = produtoContratoLabel(c.banco);
              return (
                <Card key={c.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700 }}>{c.banco}</span>
                        {/* Rotulo do produto — mesmo estilo dos cards de proposta. */}
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--accent)", padding: "2px 8px", borderRadius: 999, border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)" }}>
                          {produto}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
                        Contrato #{c.id}
                      </div>
                    </div>
                    <Pill variant={quitado ? "emdia" : c.status === "Averbado" ? "averbado" : "aceita"}>{c.status}</Pill>
                  </div>

                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: 12, marginTop: 16, fontSize: 13,
                  }}>
                    <KV label="Parcela" v={fmtBRL(c.parcela)} accent />
                    <KV label="Progresso" v={`${c.parcelasPagas}/${c.total}`} />
                    <KV label="Próxima" v={c.proximaParcela} />
                    <KV label="Taxa a.m." v={`${c.taxaAm.toFixed(2)}%`} />
                    <KV label="Valor financiado" v={fmtBRL(c.valorFinanciado)} />
                  </div>

                  <div style={{ marginTop: 12, height: 6, background: "var(--bg-elev-2)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${pct}%`,
                      background: quitado
                        ? "var(--emerald-500)"
                        : "linear-gradient(90deg, var(--gold-500), var(--emerald-500))",
                    }} />
                  </div>

                  <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Button size="sm" variant="ghost" onClick={() => baixarPdf(c)} disabled={downloading === c.id}>
                      {downloading === c.id ? "Gerando link…" : "📄 Baixar PDF"}
                    </Button>
                    {!quitado ? (
                      <span style={{ fontSize: ".82rem", color: "var(--text-muted)", alignSelf: "center" }}>
                        Para quitar: fale com o {c.banco}.
                      </span>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function KV({ label, v, accent }: { label: string; v: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ marginTop: 4, color: accent ? "var(--accent)" : "var(--text)", fontWeight: accent ? 700 : 500 }}>
        {v}
      </div>
    </div>
  );
}

/** Etapas do ciclo de vida da proposta pro servidor acompanhar (5 estagios).
 *  A etapa 2 tem label NEUTRO ("Analise pelo banco") — so vira "Recusada pelo
 *  banco" via labelEtapa2 quando a proposta for de fato recusada. Antes o
 *  label BASE dizia "Recusada" mesmo em propostas em analise, o que confundia
 *  o servidor (parecia que ja tinha sido recusada). */
const ETAPAS_BASE = [
  "Proposta enviada",
  "Análise pelo banco",
  "Aprovado pelo banco",
  "Aguardando ADF da averbadora",
  "Autorização completa",
] as const;

/** Retorna { atual, falha, labelEtapa2? }.
 *  - `atual`: indice (0..4) da etapa em curso.
 *  - `falha`: quando true, a etapa atual vira vermelha e as demais ficam cinza.
 *  - `labelEtapa2`: sobrescreve o label da etapa 2 quando o estado terminou negativo. */
function estadoParaEtapa(estado: EstadoProposta): { atual: number; falha: boolean; labelEtapa2?: string } {
  if (estado === "em_analise") return { atual: 1, falha: false };
  if (estado === "aprovada" || estado === "aguardando_formalizacao") return { atual: 2, falha: false };
  if (estado === "liberada") return { atual: 4, falha: false };
  if (estado === "recusada") return { atual: 1, falha: true, labelEtapa2: "Recusada pelo banco" };
  if (estado === "expirada") return { atual: 1, falha: true, labelEtapa2: "Expirada" };
  if (estado === "cancelada") return { atual: 1, falha: true, labelEtapa2: "Cancelada" };
  return { atual: 0, falha: false };
}

function ProgressoProposta({ estado }: { estado: EstadoProposta }) {
  const { atual, falha, labelEtapa2 } = estadoParaEtapa(estado);
  const labels = [...ETAPAS_BASE] as string[];
  if (labelEtapa2) labels[1] = labelEtapa2;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
        {labels.map((nome, i) => {
          const feita = i < atual;
          const ativa = i === atual;
          // Se a proposta falhou, a etapa "atual" (ponto de parada) vira vermelha.
          const corAtiva = falha && ativa ? "var(--danger-500)" : "var(--emerald-500)";
          const cor = feita || ativa ? corAtiva : "var(--border-strong)";
          const corTexto = feita || ativa ? corAtiva : "var(--text-dim)";
          return (
            <div key={nome + i} style={{ display: "flex", alignItems: "flex-start", flex: i < labels.length - 1 ? 1 : "0 0 auto", gap: 4, minWidth: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, gap: 4, minWidth: 0 }}>
                <div
                  style={{
                    width: ativa ? 14 : 10,
                    height: ativa ? 14 : 10,
                    borderRadius: "50%",
                    background: feita || ativa ? cor : "transparent",
                    border: `2px solid ${cor}`,
                    boxShadow: ativa ? `0 0 0 4px color-mix(in srgb, ${cor} 20%, transparent)` : "none",
                    transition: "all .2s ease",
                  }}
                  aria-hidden="true"
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: ativa ? 700 : 600,
                    color: corTexto,
                    textAlign: "center",
                    lineHeight: 1.2,
                    maxWidth: 92,
                  }}
                >
                  {nome}
                </span>
              </div>
              {i < labels.length - 1 ? (
                <div style={{
                  flex: 1,
                  height: 2,
                  background: i < atual ? "var(--emerald-500)" : "var(--border-strong)",
                  marginTop: 6, // alinha com o meio do circulo (o label vem abaixo)
                }} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
