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

/** Deriva label/cor/CTA/href do card de oferta a partir do tipo. Centraliza o
 *  roteamento pra manter o JSX enxuto e o comportamento consistente entre esta
 *  pagina e /servidor/marketplace. */
function tipoLabelHref(
  o: {
    id: string;
    tipo: "credito_novo" | "portabilidade" | "refinanciamento" | "cartao_consignado" | "cartao_beneficio";
    bancoNome: string;
    taxaAm: number;
    valorMax: number;
  },
  valorSug: number,
  parcelasSug: number,
): { label: string; cor: string; cta: string; href: string } {
  if (o.tipo === "portabilidade") {
    return {
      label: "🔁 Portabilidade",
      cor: "var(--gold-500)",
      cta: "Consolidar contratos →",
      href: `/servidor/portabilidade?banco=${encodeURIComponent(o.bancoNome)}`,
    };
  }
  if (o.tipo === "refinanciamento") {
    return {
      label: "🔄 Refinanciamento",
      cor: "var(--accent)",
      cta: "Refinanciar contrato →",
      // Modo refin: mesma pagina de portabilidade, mas so lista contratos com
      // este banco (a origem = destino) e libera troco/prazo estendido.
      href: `/servidor/portabilidade?modo=refin&banco=${encodeURIComponent(o.bancoNome)}`,
    };
  }
  if (o.tipo === "cartao_consignado" || o.tipo === "cartao_beneficio") {
    const label = o.tipo === "cartao_consignado" ? "💳 Cartão consignado" : "🎫 Cartão benefício";
    return {
      label,
      cor: "var(--gold-500)",
      cta: "Solicitar cartão →",
      // Fluxo proprio de cartao — mostra margem cartao correspondente + limite
      // proposto e faz POST /me/cartoes ao confirmar.
      href: `/servidor/solicitar-cartao?produto=${o.tipo}&banco=${encodeURIComponent(o.bancoNome)}&limite=${Math.round(o.valorMax)}&oferta=${encodeURIComponent(o.id)}`,
    };
  }
  return {
    label: "💰 Crédito novo",
    cor: "var(--emerald-500)",
    cta: "Aceitar oferta →",
    href: `/servidor/termo?tipo=novo&valor=${valorSug}&parcelas=${parcelasSug}&taxaAm=${(o.taxaAm * 100).toFixed(2)}&banco=${encodeURIComponent(o.bancoNome)}`,
  };
}

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

  // Ofertas: SO ofertas que o banco criou e publicou manualmente (marketing/
  // campanha). NAO as tabelas de emprestimo automaticas — o cliente disse:
  // "esse espaco e apenas para ofertas que o banco criar e publicar".
  // Backend ja filtra por perfil (convenio+prefeitura+vinculo+situacao+salario).
  const ofertasQ = useQuery({
    queryKey: ["servidor", "ofertas-banco", matAtiva],
    queryFn: () => atlas.servidor.getMyOfertasBanco(matAtiva),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    enabled: !!matAtiva,
  });

  const ofertas = ofertasQ.data?.ofertas ?? [];

  // Beneficios de saude (farmacia, clinica, laboratorio, etc). Categoria
  // "telemedicina" NAO entra aqui — vai na tela /servidor/saude exclusiva.
  // Cliente pediu: "os que for de saude e no marketplace, no telemedicina
  // e apenas telemedicina".
  const beneficiosSaudeQ = useQuery({
    queryKey: ["servidor", "beneficios", "saude", matAtiva],
    queryFn: () => atlas.servidor.getMyBeneficios("saude", matAtiva),
    enabled: !!matAtiva,
    refetchOnWindowFocus: true,
  });
  const beneficiosSaude = beneficiosSaudeQ.data?.beneficios ?? [];

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
              Este espaço mostra apenas ofertas que os bancos parceiros criam e publicam pra você.
              Assim que uma cair, aparece aqui.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {ofertas.map((o) => {
              const valorSug = Math.min(o.valorMax, 10000);
              const parcelasSug = Math.min(o.parcelasMax, 60);
              // CTA por tipo:
              //  credito_novo    → /servidor/termo (fluxo de aceite ja existente)
              //  portabilidade   → /servidor/portabilidade com este banco pre-selecionado
              //  refinanciamento → /servidor/portabilidade em modo refin, filtrado pelos contratos do banco desta oferta
              const tipoMeta = tipoLabelHref(o, valorSug, parcelasSug);
              return (
                <Card key={o.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent)", textTransform: "uppercase" }}>
                      {o.bancoNome}
                    </div>
                    <span style={{ fontSize: 10, letterSpacing: "0.06em", fontWeight: 700, color: tipoMeta.cor }}>
                      {tipoMeta.label}
                    </span>
                  </div>
                  <h3 style={{ margin: "6px 0", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 8 }}>
                    {o.icone ? <span style={{ fontSize: "1.3rem" }}>{o.icone}</span> : null}
                    <span>{o.titulo}</span>
                  </h3>
                  <p style={{ color: "var(--text-muted)", margin: "4px 0", fontSize: 14 }}>
                    {o.mensagem}
                  </p>
                  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={chip}>{pct(o.taxaAm)}</span>
                    <span style={chip}>Até {o.parcelasMax}×</span>
                    <span style={chip}>Até {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(o.valorMax)}</span>
                  </div>
                  <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                    <Button size="sm" variant="ghost" onClick={() => nav(tipoMeta.href)}>
                      {tipoMeta.cta}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. REDE DE SAUDE — beneficios de categoria "saude" (farmacia, clinica,
          laboratorio, etc.). Telemedicina exclusiva vive em /servidor/saude. */}
      {beneficiosSaude.length > 0 ? (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Rede de saúde parceira
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {beneficiosSaude.map((b) => (
              <Card key={b.id}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    background: `color-mix(in srgb, ${b.cor} 20%, transparent)`,
                    display: "grid", placeItems: "center", fontSize: 22,
                  }}>
                    {b.icone}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "var(--text)" }}>{b.nome}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {b.local}
                    </div>
                  </div>
                </div>
                {b.descontoLabel ? (
                  <div style={{ marginTop: 12, fontSize: 14 }}>
                    <b style={{ color: "var(--emerald-500)" }}>{b.descontoLabel}</b>
                    {b.descontoComplemento ? <span style={{ color: "var(--text-muted)" }}> {b.descontoComplemento}</span> : null}
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* 3. Botao de PORTABILIDADE (destaque medio) */}
      <AcaoCard
        icone="🔁"
        titulo="Solicitar portabilidade"
        descricao="Consolide seus contratos em outro banco com taxa menor e libere margem."
        cor="var(--gold-500)"
        onClick={() => nav("/servidor/portabilidade")}
      />

      {/* Cliente pediu que o Marketplace mostre SO Ofertas + Solicitar portabilidade.
          Simulador (era secao 3) foi removido — servidor simula pelos botoes "Simular"
          dos cards de margem no dashboard, nao aqui.
          Propostas de portabilidade dos bancos (era secao 4) tambem foi removida por
          pedido explicito ("so quero que apareca (Ofertas para voce e Solicitar Portabilidade)").
          As propostas seguem chegando via /servidor/portabilidade. */}
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
