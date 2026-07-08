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
  if (t.includes("aguard confirm")) return "em_analise";
  if (t.includes("aguard")) return "em_analise";
  if (t.includes("cancel")) return "cancelada";
  if (t.includes("recus")) return "recusada";
  if (t.includes("suspens")) return "cancelada";
  if (t.includes("expir")) return "expirada";
  if (t.includes("quitad")) return "liberada";
  if (t.includes("ativo") || t.includes("averb")) return "liberada";
  return "em_analise";
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

export function ServidorContratos() {
  const [tab, setTab] = useState<"todos" | "ativos" | "quitados">("todos");
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

  const emAndamento = useMemo(() => {
    return (propostasQ.data?.propostas ?? [])
      .map((p) => ({
        id: p.id,
        banco: p.banco,
        estado: mapSituacao(p.situacao),
        valor: p.valor,
        parcelas: p.parcelas,
        parcela: p.parcela,
        taxaAm: p.taxaAm,
        data: p.data,
      }))
      .filter((p) => ehEmAndamento(p.estado));
  }, [propostasQ.data]);

  const contratos: Contrato[] = info?.contratos ?? [];
  const filtered = contratos.filter((c) => {
    if (tab === "ativos") return c.status !== "Quitado";
    if (tab === "quitados") return c.status === "Quitado";
    return true;
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
          {emAndamento.map((p) => (
            <Card key={p.id} style={{ borderColor: "var(--gold-500)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.banco}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
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
              {p.estado === "aprovada" || p.estado === "aguardando_formalizacao" ? (
                <div style={{
                  marginTop: 12, padding: "10px 12px", borderRadius: 8,
                  background: "color-mix(in srgb, var(--gold-500) 10%, transparent)",
                  border: "1px dashed var(--gold-500)",
                  fontSize: 12.5, color: "var(--text-muted)",
                }}>
                  <b style={{ color: "var(--text)" }}>Próximo passo:</b> o {p.banco} entrará em contato para assinar o contrato — a formalização é feita direto com ele.
                </div>
              ) : null}
            </Card>
          ))}
        </section>
      ) : null}

      {/* Contratos ativos e historico (fluxo antigo) */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Contratos averbados
          </span>
          <Tabs
            variant="pills"
            activeKey={tab}
            onChange={(k) => setTab(k as typeof tab)}
            tabs={[
              { key: "todos", label: "Todos" },
              { key: "ativos", label: "Ativos" },
              { key: "quitados", label: "Quitados" },
            ]}
          />
        </div>

        {filtered.length === 0 ? (
          <Card>
            <div style={{ textAlign: "center", padding: "24px 12px" }}>
              <div style={{ fontSize: 36, opacity: 0.5 }}>📄</div>
              <h3 style={{ marginTop: 12, marginBottom: 6 }}>Sem contratos nesta categoria</h3>
              <p style={{ color: "var(--text-muted)", fontSize: ".9rem", maxWidth: 380, margin: "0 auto" }}>
                {tab === "ativos"
                  ? "Você não tem contratos ativos nesta matrícula no momento."
                  : tab === "quitados"
                    ? "Você ainda não quitou nenhum contrato nesta matrícula."
                    : "Nenhum contrato registrado para esta matrícula."}
              </p>
            </div>
          </Card>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map((c) => {
              const pct = (c.parcelasPagas / c.total) * 100;
              const quitado = c.status === "Quitado";
              return (
                <Card key={c.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{c.banco}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
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
