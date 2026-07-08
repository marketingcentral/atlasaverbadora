import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { readActiveMatricula, STORAGE_KEY_META, STORAGE_KEY_ID, type MatriculaInfo } from "../../lib/matricula-data";
import { SimuladorInline } from "./_simulador-inline";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const pct = (n: number) => `${(n * 100).toFixed(2)}% a.m.`;

type Proposta = {
  id: string; banco: string; valor: number; parcelas: number; parcela: number; taxaAm: number;
  situacao: string; tipoContrato?: string;
  bancoOrigem?: string; contratoOrigem?: string; saldoDevedorOrigem?: number;
  data: string; expira_em: string | null;
};

type Tab = "todas" | "com_troco" | "simples";

/** Portabilidade "viva" = REFIN ainda aguardando ou ativa. */
function ehPortabilidade(p: Proposta): boolean {
  const t = (p.tipoContrato ?? "").toUpperCase();
  const situ = p.situacao.toLowerCase();
  if (t !== "REFIN") return false;
  return situ.includes("aguard") || situ.includes("ativo") || situ.includes("libera") || situ.includes("averb");
}

/** "Com troco" = valor da proposta > saldo devedor de origem. */
function temTroco(p: Proposta): boolean {
  return p.saldoDevedorOrigem != null && p.valor > p.saldoDevedorOrigem;
}

function trocoValor(p: Proposta): number {
  return temTroco(p) ? p.valor - (p.saldoDevedorOrigem ?? 0) : 0;
}

/** Parseia "DD/MM/YYYY" → Date. */
function parseBrDate(s: string): Date {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : new Date();
}

/** Dias restantes até 7 dias após a criação (trava padrão de portabilidade). */
function diasRestantes(p: Proposta, agora: Date = new Date()): number {
  const criada = parseBrDate(p.data);
  const expira = new Date(criada.getTime() + 7 * 86_400_000);
  return Math.max(0, Math.ceil((expira.getTime() - agora.getTime()) / 86_400_000));
}

/** Formata "17/06/2026". */
function fmtDataBr(iso: string): string {
  const d = parseBrDate(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function ServidorMarketplacePortabilidade() {
  const nav = useNavigate();
  const [info, setInfo] = useState<MatriculaInfo | null>(() => readActiveMatricula());
  const [tab, setTab] = useState<Tab>("todas");

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_META || e.key === STORAGE_KEY_ID) {
        setInfo(readActiveMatricula());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Re-render a cada minuto pra atualizar countdown das propostas.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const matAtiva = info?.matricula;

  // Ofertas dos bancos parceiros (tabelas de emprestimo publicadas pro convenio).
  // O backend ja filtra por prefeituraId da matricula ativa — nao precisamos
  // mais do filtro por slug de cidade (fragil). Refetch quando trocar matricula.
  const ofertasQ = useQuery({
    queryKey: ["servidor", "ofertas", matAtiva],
    queryFn: () => atlas.servidor.ofertas(matAtiva),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    enabled: !!matAtiva,
  });

  const ofertas = ofertasQ.data?.ofertas ?? [];

  // Propostas de portabilidade que os bancos criaram pro servidor.
  const propostasQ = useQuery({
    queryKey: ["servidor", "propostas", matAtiva],
    queryFn: () => atlas.servidor.propostas(matAtiva),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    enabled: !!matAtiva,
  });

  const propostas = useMemo(() => (propostasQ.data?.propostas ?? []).filter(ehPortabilidade), [propostasQ.data]);
  const comTroco = useMemo(() => propostas.filter(temTroco), [propostas]);
  const simples = useMemo(() => propostas.filter((p) => !temTroco(p)), [propostas]);

  const filtradas = useMemo(() => {
    if (tab === "com_troco") return comTroco;
    if (tab === "simples") return simples;
    return [...comTroco, ...simples];
  }, [tab, comTroco, simples]);

  if (!info) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1080, width: "100%", margin: "0 auto" }}>
      {/* Header */}
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Portal do servidor
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem", letterSpacing: "-0.02em" }}>MarketPlace</h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0" }}>
          Ofertas dos bancos parceiros para o convênio da <b>{info.prefeitura}</b>. Simule ou solicite portabilidade abaixo.
        </p>
      </header>

      {/* 1. OFERTAS DOS BANCOS PARCEIROS (primeira secao — cards com tabelas) */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 11, letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Ofertas para você
        </span>
        {ofertasQ.isLoading ? (
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Carregando ofertas…</div>
        ) : ofertasQ.error ? (
          <div style={{ color: "var(--danger-500)", fontSize: 14 }}>Falha ao carregar ofertas.</div>
        ) : ofertas.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              border: "1px dashed var(--border-strong)",
              borderRadius: 12,
              color: "var(--text-muted)",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>📭</div>
            <div style={{ fontWeight: 600 }}>Nenhuma oferta ativa no momento</div>
            <p style={{ fontSize: 13, margin: "6px auto 0", maxWidth: 480 }}>
              Assim que um banco parceiro publicar uma tabela pro seu convênio, ela aparece aqui.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {ofertas.map((o) => (
              <Card key={o.id}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent)", textTransform: "uppercase" }}>
                  {o.bancoNome}
                </div>
                <h3 style={{ margin: "6px 0", fontSize: "1.1rem" }}>Crédito consignado</h3>
                <p style={{ color: "var(--text-muted)", margin: "4px 0", fontSize: 14 }}>
                  Convênio {o.convenio}. Vigência a partir de{" "}
                  {new Date(o.vigenciaInicio + "T00:00:00").toLocaleDateString("pt-BR")}
                  {o.vigenciaFim ? ` até ${new Date(o.vigenciaFim + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}.
                </p>
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={chip}>{pct(o.taxaMinAm)} a {pct(o.taxaMaxAm)}</span>
                  <span style={chip}>Até {o.prazoMaxMeses}×</span>
                </div>
                <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                  <Button
                    size="sm"
                    onClick={() =>
                      nav(
                        `/servidor/simular?valor=10000&parcelas=${Math.min(o.prazoMaxMeses, 60)}&taxa=${(o.taxaMinAm * 100).toFixed(2)}`,
                      )
                    }
                  >
                    Simular →
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      nav(
                        `/servidor/termo?tipo=novo&valor=10000&parcelas=${Math.min(o.prazoMaxMeses, 60)}&taxaAm=${(o.taxaMinAm * 100).toFixed(2)}&banco=${encodeURIComponent(o.bancoNome)}`,
                      )
                    }
                  >
                    Aceitar oferta →
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 2. Botao de PORTABILIDADE (destaque medio) */}
      <AcaoCard
        icone="🔁"
        titulo="Solicitar portabilidade"
        descricao="Consolide seus contratos em outro banco com taxa menor e libere margem."
        cor="var(--gold-500)"
        onClick={() => nav("/servidor/portabilidade")}
      />

      {/* 3. Simulador inline — o cliente pediu o "menuzinho" aqui em vez de um botao. */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>💰</span>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
              Simular empréstimo
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Ajuste valor e parcelas para ver se cabe na sua margem — a solicitação já sai daqui.
            </div>
          </div>
        </div>
        <SimuladorInline info={info} compact />
      </section>

      {/* 4. Propostas de portabilidade dos bancos (mantidas aqui por hierarquia — mais no fim) */}
      {propostas.length > 0 || propostasQ.isLoading ? (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 11, letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
              Propostas de portabilidade dos bancos
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <TabBtn active={tab === "todas"} tone="emerald" onClick={() => setTab("todas")} label={`Todas (${propostas.length})`} />
            <TabBtn active={tab === "com_troco"} tone="gold" onClick={() => setTab("com_troco")} label={`Com Troco (${comTroco.length})`} />
            <TabBtn active={tab === "simples"} tone="neutro" onClick={() => setTab("simples")} label={`Simples (${simples.length})`} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {propostasQ.isLoading ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Carregando propostas...</div>
            ) : filtradas.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 14, border: "1px dashed var(--border)", borderRadius: 12 }}>
                Nenhuma proposta nesta categoria.
              </div>
            ) : (
              filtradas.map((p) => (
                temTroco(p)
                  ? <FeaturedComTrocoCard key={p.id} proposta={p} onConfirmar={() => nav(`/servidor/termo?adf=${p.id}`)} />
                  : <SimplesCard key={p.id} proposta={p} onSolicitar={() => nav(`/servidor/termo?adf=${p.id}`)} />
              ))
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** Card destacado — portabilidade COM TROCO. */
function FeaturedComTrocoCard({ proposta: p, onConfirmar }: { proposta: Proposta; onConfirmar: () => void }) {
  const troco = trocoValor(p);
  const dias = diasRestantes(p);
  const parcelaAtualEstim = p.saldoDevedorOrigem != null && p.parcelas > 0
    ? (p.saldoDevedorOrigem * 0.024)
    : p.parcela;
  const economiaEstim = Math.max(0, parcelaAtualEstim - p.parcela);

  return (
    <article style={{
      background: "color-mix(in srgb, var(--gold-500) 6%, var(--surface))",
      border: "1px solid var(--gold-500)",
      borderRadius: 14,
      padding: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--gold-600, var(--gold-500))" }}>
          🔒 Margem pré-reservada
          <span style={{ color: "var(--border-strong)" }}>·</span>
          <span>Portabilidade com troco</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={pillStyle("gold")}>INTENCIONADO</span>
          <span style={{ ...pillStyle("gold"), background: "transparent" }}>
            ⏱ {dias > 0 ? `${dias} dia${dias > 1 ? "s" : ""} restante${dias > 1 ? "s" : ""}` : "vence hoje"}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
        Exclusivo para <b style={{ color: "var(--text)" }}>{p.banco}</b> durante o período de intenção · Outras instituições <b style={{ color: "var(--text)" }}>não podem averbar</b>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 14 }}>
        <SubCard
          label="CONTRATO ATUAL"
          titulo={p.bancoOrigem ?? "Banco de origem"}
          linhas={[
            p.saldoDevedorOrigem != null ? `${(2.29).toFixed(2)}% a.m.` : "",
            p.saldoDevedorOrigem != null ? `${fmtBRL(parcelaAtualEstim)} / mês` : "",
            `${p.parcelas} parcelas restantes`,
          ].filter(Boolean)}
          tone="neutro"
        />
        <SubCard
          label={`NOVA PROPOSTA · ${p.banco.split(" ").pop() ?? p.banco}`}
          titulo={p.banco}
          linhas={[
            `${p.taxaAm.toFixed(2)}% a.m.`,
            `${fmtBRL(p.parcela)} / mês`,
            economiaEstim > 0 ? `Economia: ${fmtBRL(economiaEstim)}/mês` : "",
          ].filter(Boolean)}
          tone="emerald"
          highlight
        />
        <SubCard
          label="TROCO LIBERADO"
          tituloGrande={fmtBRL(troco)}
          linhas={[
            "crédito adicional",
            `Margem: ${fmtBRL(troco)} disp.`,
          ]}
          tone="gold"
          highlight
        />
        <SubCard
          label="TEMPORIZADOR"
          tituloGrande={`${dias} dia${dias === 1 ? "" : "s"}`}
          tituloDangerCor
          linhas={[
            `Iniciado em ${fmtDataBr(p.data)}`,
          ]}
          tone="neutro"
        />
      </div>

      <div style={{ padding: "12px 14px", borderRadius: 8, background: "color-mix(in srgb, var(--accent) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", fontSize: 13, color: "var(--text-muted)", marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ color: "var(--accent)", fontSize: 16 }}>ℹ</span>
        <div>
          A margem de <b style={{ color: "var(--text)" }}>{fmtBRL(troco)}</b> está pré-reservada exclusivamente para o <b style={{ color: "var(--text)" }}>{p.banco}</b> pelos próximos <b style={{ color: "var(--text)" }}>{dias} dia{dias === 1 ? "" : "s"}</b>. Durante este período, <b style={{ color: "var(--text)" }}>nenhuma outra instituição</b> poderá averbar contratos nesta margem.
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => alert("Cancelamento de intenção precisa ser feito pelo próprio banco. Entre em contato com o " + p.banco + " para desistir da proposta.")}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: "1px solid var(--danger-500)",
            background: "transparent",
            color: "var(--danger-500)",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Cancelar intenção
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: "var(--emerald-500)",
            color: "white",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Confirmar Portabilidade →
        </button>
      </div>
    </article>
  );
}

/** Card compacto — portabilidade simples (sem troco). */
function SimplesCard({ proposta: p, onSolicitar }: { proposta: Proposta; onSolicitar: () => void }) {
  const parcelaAtualEstim = p.saldoDevedorOrigem != null
    ? p.saldoDevedorOrigem * 0.024
    : p.parcela + 37.50;
  const economia = Math.max(0, parcelaAtualEstim - p.parcela);
  return (
    <article style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      padding: 16,
      display: "flex",
      alignItems: "center",
      gap: 14,
      flexWrap: "wrap",
    }}>
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={pillStyle("emerald")}>PORTABILIDADE SIMPLES</span>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{p.banco} · Sem troco</span>
        </div>
        <div style={{ fontSize: 14, color: "var(--text)" }}>
          <b>{p.bancoOrigem ?? "Banco de origem"}</b> ({(2.15).toFixed(2)}% a.m. · {fmtBRL(parcelaAtualEstim)}/mês) → <b style={{ color: "var(--emerald-500)" }}>{p.banco}</b> ({p.taxaAm.toFixed(2)}% a.m. · {fmtBRL(p.parcela)}/mês)
          {economia > 0 ? <span style={{ color: "var(--text-muted)" }}> · Economia: <b style={{ color: "var(--emerald-500)" }}>{fmtBRL(economia)}/mês</b></span> : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onSolicitar}
        style={{
          padding: "10px 18px",
          borderRadius: 10,
          border: "none",
          background: "var(--emerald-500)",
          color: "white",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        Solicitar →
      </button>
    </article>
  );
}

function SubCard({
  label, titulo, tituloGrande, tituloDangerCor, linhas, tone, highlight,
}: {
  label: string;
  titulo?: string;
  tituloGrande?: string;
  tituloDangerCor?: boolean;
  linhas: string[];
  tone: "neutro" | "gold" | "emerald";
  highlight?: boolean;
}) {
  const cor = tone === "gold" ? "var(--gold-500)" : tone === "emerald" ? "var(--emerald-500)" : "var(--border-strong)";
  const bgHi = tone === "gold" ? "color-mix(in srgb, var(--gold-500) 10%, transparent)"
    : tone === "emerald" ? "color-mix(in srgb, var(--emerald-500) 8%, transparent)"
    : "var(--bg-elev)";
  return (
    <div style={{
      background: highlight ? bgHi : "var(--bg-elev)",
      border: `1px solid ${highlight ? cor : "var(--border)"}`,
      borderRadius: 10,
      padding: 12,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-dim)" }}>{label}</div>
      {titulo ? (
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginTop: 4 }}>{titulo}</div>
      ) : tituloGrande ? (
        <div style={{ fontSize: 22, fontWeight: 800, color: tituloDangerCor ? "var(--danger-500)" : cor, marginTop: 4, lineHeight: 1.1 }}>{tituloGrande}</div>
      ) : null}
      <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
        {linhas.map((l, i) => (
          <div key={i} style={i === 0 && (titulo || tituloGrande) ? { marginTop: 4, color: "var(--text)", fontSize: 13, fontWeight: 600 } : undefined}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, label, tone }: { active: boolean; onClick: () => void; label: string; tone: "neutro" | "gold" | "emerald" }) {
  const cor = tone === "gold" ? "var(--gold-500)" : tone === "emerald" ? "var(--emerald-500)" : "var(--accent)";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 10,
        border: `1px solid ${active ? cor : "var(--border)"}`,
        background: active ? `color-mix(in srgb, ${cor} 10%, transparent)` : "transparent",
        color: active ? cor : "var(--text-muted)",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function pillStyle(tone: "gold" | "emerald" | "danger" | "neutro"): React.CSSProperties {
  const c = tone === "gold" ? "var(--gold-500)"
    : tone === "emerald" ? "var(--emerald-500)"
    : tone === "danger" ? "var(--danger-500)"
    : "var(--text-muted)";
  return {
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: ".06em",
    color: c,
    border: `1px solid ${c}`,
    background: `color-mix(in srgb, ${c} 8%, transparent)`,
    borderRadius: 6,
    padding: "3px 10px",
    textTransform: "uppercase",
  };
}

/** Card grande de acao — usado agora so pra "Solicitar portabilidade". */
function AcaoCard({
  icone, titulo, descricao, cor, onClick,
}: {
  icone: string; titulo: string; descricao: string; cor: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 18,
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        cursor: "pointer",
        transition: "border-color .12s ease, transform .12s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = cor;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `color-mix(in srgb, ${cor} 15%, transparent)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, flexShrink: 0,
      }}>{icone}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{titulo}</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
          {descricao}
        </div>
      </div>
      <span style={{ fontSize: 22, color: cor, alignSelf: "center" }}>→</span>
    </button>
  );
}

const chip: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 999,
  background: "var(--bg-elev-2)",
  color: "var(--text-muted)",
  fontSize: 11,
  fontWeight: 600,
};
