import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, SelectField } from "@atlas/ui/web";
import { atlas } from "../../../lib/sdk";
import {
  getBancoConvenios,
  PRODUTO_LABEL,
  STATUS_LABEL,
  contratoToProposta,
  fmtBRL,
  getBancoPerfil,
  setBancoPerfil,
  BANCO_PERFIS,
  travaInfo,
  type BancoProduto,
  type BancoPropostaFromApi as PropostaRow,
  type BancoPropostaStatus,
} from "../../../lib/banco-propostas";

const STATUS_OPTS: BancoPropostaStatus[] = [
  "recebida", "em_analise", "aprovada", "aguardando_formalizacao",
  "formalizada", "averbada", "recusada", "mais_info", "expirada",
];

type TabKey = "todas" | "aguardando" | "aprovadas" | "recusadas";

function statusPertenceTab(s: BancoPropostaStatus, tab: TabKey): boolean {
  if (tab === "todas") return true;
  if (tab === "aguardando") return s === "recebida" || s === "em_analise" || s === "mais_info";
  if (tab === "aprovadas") return s === "aprovada" || s === "aguardando_formalizacao" || s === "formalizada" || s === "averbada";
  return s === "recusada" || s === "expirada";
}

export function BancoPropostas() {
  const nav = useNavigate();
  const [tab, setTab] = useState<TabKey>("todas");
  const [convenio, setConvenio] = useState("");
  const [produto, setProduto] = useState<"" | BancoProduto>("");
  const [status, setStatus] = useState<"" | BancoPropostaStatus>("");
  const [expirando, setExpirando] = useState(false);
  const [perfilId, setPerfilId] = useState(() => getBancoPerfil().id);

  // Re-render a cada segundo para os countdowns.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1_000);
    return () => clearInterval(t);
  }, []);

  const apiQ = useQuery({
    queryKey: ["banco", "propostas-api"],
    queryFn: () => atlas.banco.contratos(),
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });

  const todas: PropostaRow[] = useMemo(
    () => (apiQ.data?.contratos ?? []).map(contratoToProposta),
    [apiQ.data],
  );

  // Contadores por status pra header e tabs.
  const contadores = useMemo(() => {
    let aguardando = 0, aprovadas = 0, recusadas = 0, aprovadasNoMes = 0;
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();
    for (const p of todas) {
      if (statusPertenceTab(p.status, "aguardando")) aguardando++;
      else if (statusPertenceTab(p.status, "aprovadas")) {
        aprovadas++;
        const d = new Date(p.criadaEm);
        if (d.getMonth() === mesAtual && d.getFullYear() === anoAtual) aprovadasNoMes++;
      } else if (statusPertenceTab(p.status, "recusadas")) recusadas++;
    }
    return { total: todas.length, aguardando, aprovadas, aprovadasNoMes, recusadas };
  }, [todas]);

  const filtradas = useMemo(() => {
    const isPendente = (s: BancoPropostaStatus) => statusPertenceTab(s, "aguardando");
    const atividade = (p: PropostaRow) => new Date(p.criadaEm).getTime() || 0;
    return todas
      .filter((p) => {
        if (!statusPertenceTab(p.status, tab)) return false;
        if (convenio && p.convenio !== convenio) return false;
        if (produto && p.produto !== produto) return false;
        if (status && p.status !== status) return false;
        if (expirando) {
          const t = travaInfo(p);
          if (!t || t.expirada || !t.urgente) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const pa = isPendente(a.status) ? 0 : 1;
        const pb = isPendente(b.status) ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return atividade(b) - atividade(a);
      });
  }, [todas, tab, convenio, produto, status, expirando]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Marketplace
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem", letterSpacing: "-0.02em" }}>Minhas Propostas</h1>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6, display: "flex", flexWrap: "wrap", gap: 12 }}>
            <span><b style={{ color: "var(--gold-500)" }}>{contadores.aguardando}</b> aguardando análise</span>
            <span style={{ color: "var(--border-strong)" }}>·</span>
            <span><b style={{ color: "var(--emerald-500)" }}>{contadores.aprovadasNoMes}</b> aprovadas este mês</span>
            <span style={{ color: "var(--border-strong)" }}>·</span>
            <span><b style={{ color: "var(--danger-500)" }}>{contadores.recusadas}</b> recusadas</span>
          </div>
        </div>
        <PerfilSwitcher value={perfilId} onChange={(id) => { setBancoPerfil(id); setPerfilId(id); }} />
      </header>

      {/* Tabs de status */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Tab active={tab === "todas"} onClick={() => setTab("todas")} label={`Todas (${contadores.total})`} tone="neutro" />
        <Tab active={tab === "aguardando"} onClick={() => setTab("aguardando")} label={`Aguardando (${contadores.aguardando})`} tone="gold" />
        <Tab active={tab === "aprovadas"} onClick={() => setTab("aprovadas")} label={`Aprovadas (${contadores.aprovadas})`} tone="emerald" />
        <Tab active={tab === "recusadas"} onClick={() => setTab("recusadas")} label={`Recusadas (${contadores.recusadas})`} tone="danger" />
      </div>

      {/* Filtros preservados (convenio/produto/status/expirando) */}
      <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
        <SelectField
          label="Convênio"
          value={convenio}
          onChange={(e) => setConvenio(e.target.value)}
          options={[{ value: "", label: "Todos" }, ...getBancoConvenios().map((c) => ({ value: c, label: c }))]}
        />
        <SelectField
          label="Produto"
          value={produto}
          onChange={(e) => setProduto(e.target.value as "" | BancoProduto)}
          options={[
            { value: "", label: "Todos" },
            { value: "novo", label: PRODUTO_LABEL.novo },
            { value: "portabilidade", label: PRODUTO_LABEL.portabilidade },
          ]}
        />
        <SelectField
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as "" | BancoPropostaStatus)}
          options={[{ value: "", label: "Todos" }, ...STATUS_OPTS.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)", paddingBottom: 8 }}>
          <input type="checkbox" checked={expirando} onChange={(e) => setExpirando(e.target.checked)} />
          Só trava expirando (24h)
        </label>
      </div>

      {/* Cards de propostas */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filtradas.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14, border: "1px dashed var(--border)", borderRadius: 12 }}>
            Nenhuma proposta neste filtro.
          </div>
        ) : (
          filtradas.map((p) => (
            <PropostaCard
              key={p.idUnico}
              proposta={p}
              onAbrir={() => nav(`/banco/propostas/${p.idUnico}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PropostaCard({
  proposta: p,
  onAbrir,
}: {
  proposta: PropostaRow;
  onAbrir: () => void;
}) {
  const trava = travaInfo(p);
  const isPortabilidade = p.produto === "portabilidade";
  const temTroco = isPortabilidade && p.saldoDevedorOrigem != null && p.valor > p.saldoDevedorOrigem;
  const trocoValor = temTroco ? p.valor - (p.saldoDevedorOrigem ?? 0) : 0;
  const isPendente = p.status === "recebida" || p.status === "em_analise" || p.status === "mais_info";

  // Card grande destacado: portabilidade com troco, em analise, com trava.
  if (temTroco && isPendente) {
    return <FeaturedPortabilidadeCard proposta={p} trocoValor={trocoValor} trava={trava} onAbrir={onAbrir} />;
  }
  // Card padrao: aguardando analise.
  if (isPendente) {
    return <PendenteCard proposta={p} isPortabilidade={isPortabilidade} onAbrir={onAbrir} />;
  }
  // Card compacto: aprovadas/recusadas/averbadas.
  return <DecididaCard proposta={p} isPortabilidade={isPortabilidade} onAbrir={onAbrir} />;
}

/** Card destacado — portabilidade com troco, ainda em análise. */
function FeaturedPortabilidadeCard({
  proposta: p,
  trocoValor,
  trava,
  onAbrir,
}: {
  proposta: PropostaRow;
  trocoValor: number;
  trava: ReturnType<typeof travaInfo>;
  onAbrir: () => void;
}) {
  const diasRestantes = trava && !trava.expirada ? Math.max(0, Math.floor(trava.msRestantes / 86_400_000)) : 0;
  return (
    <article style={{
      background: "color-mix(in srgb, var(--gold-500) 6%, var(--surface))",
      border: "1px solid var(--gold-500)",
      borderRadius: 14,
      padding: 20,
      position: "relative",
    }}>
      {/* faixa do topo */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--gold-600, var(--gold-500))" }}>
          <span>🔒 Margem pré-reservada</span>
          <span style={{ color: "var(--border-strong)" }}>·</span>
          <span>Portabilidade com troco</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={pillStyle("gold")}>INTENCIONADO</span>
          {trava && !trava.expirada ? (
            <span style={{ ...pillStyle("gold"), background: "transparent" }}>
              ⏱ {diasRestantes > 0 ? `${diasRestantes} dia${diasRestantes > 1 ? "s" : ""} restantes` : "vence hoje"}
            </span>
          ) : null}
        </div>
      </div>

      {/* servidor */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text)" }}>{p.nome}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            Mat: <span style={{ fontFamily: "var(--font-mono)" }}>{p.matricula}</span>
            {" · "}CPF: <span style={{ fontFamily: "var(--font-mono)" }}>{p.cpfMasked}</span>
            {" · "}{p.convenio}
          </div>
        </div>
      </div>

      {/* 3 sub-cards: CONTRATO ATUAL / PROPOSTA / TROCO */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 14 }}>
        <SubCard
          label="CONTRATO ATUAL"
          banco={p.bancoOrigem ?? "Banco de origem"}
          detalhe={`${p.saldoDevedorOrigem != null ? "Saldo: " + fmtBRL(p.saldoDevedorOrigem) : "—"}`}
          tone="neutro"
        />
        <SubCard
          label="PROPOSTA"
          banco="Você"
          detalhe={`${p.taxaAm.toFixed(2)}% a.m. · ${fmtBRL(p.parcela)}/mês`}
          tone="info"
        />
        <SubCard
          label="TROCO LIBERADO"
          banco={fmtBRL(trocoValor)}
          detalhe="crédito adicional"
          tone="gold"
        />
      </div>

      <div style={{ padding: "10px 14px", borderRadius: 8, background: "color-mix(in srgb, var(--gold-500) 10%, transparent)", border: "1px dashed var(--gold-500)", fontSize: 12.5, color: "var(--text-muted)", marginBottom: 14 }}>
        Esta margem está <b style={{ color: "var(--text)" }}>bloqueada exclusivamente para você</b> pelos próximos {diasRestantes || 6} dias. Outras instituições não podem averbar durante este período.
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={onAbrir}>Ver mais →</Button>
      </div>
    </article>
  );
}

/** Card padrão pra propostas aguardando análise. */
function PendenteCard({
  proposta: p,
  isPortabilidade,
  onAbrir,
}: {
  proposta: PropostaRow;
  isPortabilidade: boolean;
  onAbrir: () => void;
}) {
  const tipoLabel = isPortabilidade
    ? p.saldoDevedorOrigem != null && p.valor > p.saldoDevedorOrigem
      ? "Portabilidade com troco"
      : "Portabilidade simples"
    : "Novo empréstimo";

  return (
    <article style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      padding: 18,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={pillStyle("gold")}>AGUARDANDO ANÁLISE</span>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{tipoLabel}</span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>
            {p.nome} <span style={{ fontWeight: 400, color: "var(--text-dim)" }}>· Mat: <span style={{ fontFamily: "var(--font-mono)" }}>{p.matricula}</span></span>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            {isPortabilidade && p.bancoOrigem ? (
              <>
                <b>{p.bancoOrigem}</b>
                {p.saldoDevedorOrigem != null ? <span> ({fmtBRL(p.saldoDevedorOrigem)} de saldo)</span> : null}
                {" → "}
                <b>Você</b> ({p.taxaAm.toFixed(2)}% a.m. · {fmtBRL(p.parcela)}/mês)
              </>
            ) : (
              <>
                {p.taxaAm.toFixed(2)}% a.m. · {fmtBRL(p.parcela)}/mês · {p.parcelas}x · {fmtBRL(p.valor)} liberado
              </>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <Button size="sm" onClick={onAbrir}>Ver mais →</Button>
        </div>
      </div>
    </article>
  );
}

/** Card compacto pra propostas já decididas. */
function DecididaCard({
  proposta: p,
  isPortabilidade,
  onAbrir,
}: {
  proposta: PropostaRow;
  isPortabilidade: boolean;
  onAbrir: () => void;
}) {
  const isAprovada = p.status === "aprovada" || p.status === "aguardando_formalizacao" || p.status === "formalizada" || p.status === "averbada";
  const tone = isAprovada ? "emerald" : "danger";
  const rotulo = isAprovada
    ? p.status === "averbada" ? "AVERBADA" : "APROVADA"
    : p.status === "expirada" ? "EXPIRADA" : "RECUSADA";
  const tipoLabel = isPortabilidade
    ? p.saldoDevedorOrigem != null && p.valor > p.saldoDevedorOrigem
      ? "Portabilidade com troco"
      : "Portabilidade simples"
    : "Novo empréstimo";

  const diasDesde = Math.floor((Date.now() - new Date(p.criadaEm).getTime()) / 86_400_000);
  const detalheStatus = isAprovada
    ? `Aprovada há ${diasDesde} dia${diasDesde === 1 ? "" : "s"}${p.status === "averbada" ? " · Averbação confirmada" : ""}`
    : p.status === "expirada" ? `Expirou há ${diasDesde} dia${diasDesde === 1 ? "" : "s"}` : `Recusada há ${diasDesde} dia${diasDesde === 1 ? "" : "s"}`;

  return (
    <article
      onClick={onAbrir}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "14px 18px",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={pillStyle(tone)}>{rotulo}</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
            {p.nome} — {tipoLabel}
            {isPortabilidade && p.bancoOrigem ? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> · {p.bancoOrigem}</span> : null}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{detalheStatus}</div>
        </div>
        <span style={{ color: "var(--text-dim)", fontSize: 18 }}>›</span>
      </div>
    </article>
  );
}

function SubCard({ label, banco, detalhe, tone }: { label: string; banco: string; detalhe: string; tone: "neutro" | "info" | "gold" }) {
  const bgColor = tone === "gold" ? "color-mix(in srgb, var(--gold-500) 10%, transparent)"
    : tone === "info" ? "color-mix(in srgb, var(--accent) 8%, transparent)"
    : "var(--bg-elev)";
  const borderColor = tone === "gold" ? "var(--gold-500)"
    : tone === "info" ? "color-mix(in srgb, var(--accent) 40%, var(--border))"
    : "var(--border)";
  return (
    <div style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginTop: 4 }}>{banco}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{detalhe}</div>
    </div>
  );
}

function Tab({ active, onClick, label, tone }: { active: boolean; onClick: () => void; label: string; tone: "neutro" | "gold" | "emerald" | "danger" }) {
  const activeColor =
    tone === "gold" ? "var(--gold-500)"
    : tone === "emerald" ? "var(--emerald-500)"
    : tone === "danger" ? "var(--danger-500)"
    : "var(--accent)";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        border: `1px solid ${active ? activeColor : "var(--border)"}`,
        background: active ? `color-mix(in srgb, ${activeColor} 12%, transparent)` : "transparent",
        color: active ? activeColor : "var(--text-muted)",
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
    padding: "3px 8px",
    textTransform: "uppercase",
  };
}

function PerfilSwitcher({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div style={{ minWidth: 220 }}>
      <SelectField
        label="Perfil do operador"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        options={BANCO_PERFIS.map((p) => ({ value: p.id, label: `${p.nome} (${p.papel})` }))}
      />
    </div>
  );
}
