import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Pill } from "@atlas/ui/web";
import type { MatriculaInfo } from "../../lib/matricula-data";
import { readActiveMatricula, STORAGE_KEY_META, STORAGE_KEY_ID } from "../../lib/matricula-data";

const PRODUTO_LABEL: Record<string, string> = {
  EMPRESTIMO: "Empréstimo Consignado",
  CARTAO_CONSIGNADO: "Cartão de Crédito Consignado",
  CARTAO_BENEFICIOS: "Cartão Benefício Consignado",
};

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const MESES_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_PT_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Iniciais do banco pro avatar (Banco do Brasil -> BB). */
function iniciaisBanco(nome: string): string {
  const partes = nome.split(/\s+/).filter((p) => !/^(do|da|de|das|dos|de|s\.a\.|sa)$/i.test(p));
  if (partes.length === 1) return partes[0]!.slice(0, 2).toUpperCase();
  return partes.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

/** Cor de tinta pro badge do banco — determinística por hash simples. */
function corBanco(nome: string): string {
  const paleta = ["#2563eb", "#0e7490", "#059669", "#c2410c", "#7c3aed", "#be185d", "#0891b2", "#a16207"];
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = (hash * 31 + nome.charCodeAt(i)) >>> 0;
  return paleta[hash % paleta.length]!;
}

/** Próximo dia 15 (dia de corte típico) a partir de hoje. */
function proximoDesconto(): { dia: string; mes: string; iso: Date; extenso: string } {
  const hoje = new Date();
  const dia = 15;
  const ref = hoje.getDate() >= dia
    ? new Date(hoje.getFullYear(), hoje.getMonth() + 1, dia)
    : new Date(hoje.getFullYear(), hoje.getMonth(), dia);
  return {
    dia: String(ref.getDate()).padStart(2, "0"),
    mes: MESES_PT_SHORT[ref.getMonth()]!,
    iso: ref,
    extenso: `${ref.getDate()} de ${MESES_PT[ref.getMonth()]} de ${ref.getFullYear()}`,
  };
}

export function ServidorDashboard() {
  const nav = useNavigate();
  const [info, setInfo] = useState<MatriculaInfo | null>(() => readActiveMatricula());

  useLayoutEffect(() => {
    const active = readActiveMatricula();
    if (!active) {
      nav("/servidor/selecionar-matricula", { replace: true });
    } else {
      setInfo(active);
    }
  }, [nav]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_META || e.key === STORAGE_KEY_ID) {
        setInfo(readActiveMatricula());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const primeiroNome = useMemo(() => (info?.nome ?? "").split(" ")[0] ?? "", [info?.nome]);
  const contratosAtivos = useMemo(() => (info?.contratos ?? []).filter((c) => c.status !== "Quitado"), [info?.contratos]);
  const totalMensal = useMemo(() => contratosAtivos.reduce((acc, c) => acc + c.parcela, 0), [contratosAtivos]);
  const desconto = useMemo(() => proximoDesconto(), []);

  if (!info) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1000, margin: "0 auto", width: "100%" }}>
      {/* Header no modelo */}
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Meu painel
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "2rem", letterSpacing: "-0.02em" }}>Olá, {primeiroNome}</h1>
        <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
          Matrícula <b style={{ color: "var(--text)" }}>{info.matricula}</b> · {info.prefeitura}
        </div>
      </header>

      {/* Card grande — MINHA MARGEM POR MODALIDADE */}
      <MinhaMargemPorModalidade info={info} />

      {/* Meus contratos */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Meus contratos
          </span>
          {contratosAtivos.length > 0 ? (
            <button
              type="button"
              onClick={() => nav("/servidor/contratos")}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid var(--border-strong)",
                background: "transparent",
                color: "var(--text)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              ↓ Exportar todos PDF
            </button>
          ) : null}
        </div>

        {contratosAtivos.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 14, border: "1px dashed var(--border)", borderRadius: 12 }}>
            Nenhum contrato ativo nesta matrícula.
          </div>
        ) : (
          contratosAtivos.map((c) => <ContratoCard key={c.id} contrato={c} />)
        )}
      </section>

      {/* Próximo desconto em folha */}
      <article style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 18,
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}>
        <div style={{
          width: 60,
          height: 60,
          borderRadius: 12,
          background: "color-mix(in srgb, var(--gold-500) 15%, transparent)",
          border: "1px solid var(--gold-500)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--gold-500)",
          fontWeight: 800,
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 20, lineHeight: 1 }}>{desconto.dia}</div>
          <div style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase" }}>{desconto.mes}</div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Próximo desconto em folha</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
            {desconto.extenso} · {info.prefeitura}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{fmtBRL(totalMensal)}</div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em" }}>total</div>
        </div>
      </article>

      {/* Em roadmap — Autenticação por Senha/Token */}
      <article style={{
        background: "color-mix(in srgb, var(--accent) 5%, var(--surface))",
        border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))",
        borderRadius: 14,
        padding: 18,
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: "color-mix(in srgb, var(--accent) 15%, transparent)",
          color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, flexShrink: 0,
        }}>ℹ</div>
        <div>
          <div style={{ fontSize: 10, letterSpacing: ".08em", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", marginBottom: 3 }}>
            Em roadmap
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
            Autenticação por Senha/Token para Averbação
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
            Algumas prefeituras poderão exigir que o servidor forneça uma senha ou token para que as instituições financeiras possam averbar a margem.
          </div>
        </div>
      </article>

      {/* Ações rápidas — preservado do fluxo anterior */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Ações rápidas
        </span>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          {/* Atalhos apontam pro MarketPlace unificado — la em cima ficam as
              ofertas dos bancos + botao de portabilidade + simulador inline. */}
          <AtalhoCard titulo="Simular" descricao="Calcule parcelas e veja ofertas." icon="💰" accent="emerald" onClick={() => nav("/servidor/marketplace/portabilidade")} />
          <AtalhoCard titulo="Portabilidade" descricao="Consolide em outro banco com taxa menor." icon="🔁" accent="gold" onClick={() => nav("/servidor/marketplace/portabilidade")} />
          <AtalhoCard titulo="Meus contratos" descricao="Veja progresso e baixe PDFs." icon="📄" accent="navy" onClick={() => nav("/servidor/contratos")} />
          <AtalhoCard titulo="Benefícios" descricao="Cartão benefícios e ofertas." icon="🎁" accent="emerald" onClick={() => nav("/servidor/beneficios")} />
        </div>
      </section>

      {/* Warning existente — pré-aprovação */}
      <div style={{
        padding: "12px 16px",
        borderRadius: 10,
        background: "color-mix(in srgb, var(--gold-500) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--gold-500) 30%, transparent)",
        fontSize: 13,
        color: "var(--text-muted)",
        lineHeight: 1.5,
      }}>
        <div><b style={{ color: "var(--text)" }}>⚠️ Pré-aprovação:</b> os valores são pré-aprovados e podem variar conforme coeficiente diário e taxas.</div>
        <div style={{ marginTop: 4 }}>
          <b style={{ color: "var(--text)" }}>ℹ️ Margem por produto:</b> a margem de empréstimo não pode ser usada para cartão e vice-versa — cada produto tem seu próprio limite.
        </div>
      </div>

      {/* Fonte da margem — info técnica preservada */}
      <Card>
        <span className="eyebrow">Fonte</span>
        <div style={{ marginTop: 12, fontSize: ".9rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
          <div>Tipo: {info.margem.fonte.tipo}</div>
          <div>Sincronizado: {new Date(info.margem.fonte.sincronizado_em).toLocaleString("pt-BR")}</div>
          <div>
            Cache: <b style={{ color: "var(--accent)" }}>{info.margem.fonte.cache_status}</b>
          </div>
        </div>
      </Card>
    </div>
  );
}

/** Card grande dark com 3 linhas de margem (Empréstimo, Cartão Crédito, Cartão Benefício). */
function MinhaMargemPorModalidade({ info }: { info: MatriculaInfo }) {
  // Garante as 3 modalidades na ordem do modelo, mesmo que o backend só devolva EMPRESTIMO.
  const porTipo = new Map(info.margem.margens_por_tipo.map((m) => [m.tipo, m]));
  const ordem = ["EMPRESTIMO", "CARTAO_CONSIGNADO", "CARTAO_BENEFICIOS"] as const;
  const linhas = ordem.map((t) => porTipo.get(t) ?? { tipo: t, total: 0, disponivel: 0 });

  return (
    <article style={{
      background: "linear-gradient(160deg, var(--navy-700), var(--navy-900))",
      border: "1px solid var(--navy-700)",
      borderRadius: 16,
      padding: 24,
      color: "#EAF0FA",
      boxShadow: "var(--shadow-md)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9BAAC2", marginBottom: 18 }}>
        Minha margem por modalidade
      </div>
      {/* 3 quadrados lado a lado — cada modalidade em seu proprio card.
          auto-fit + minmax garante quebra pra 2 e depois 1 coluna em telas menores. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
        {linhas.map((m) => (
          <MargemCard key={m.tipo} data={m} />
        ))}
      </div>
    </article>
  );
}

/** Configuracao do botao de acao por modalidade — Emprestimo/Cartao credito abrem
 *  simulador; Cartao Beneficio manda direto para ofertas (nao simula). */
const ACAO_POR_TIPO: Record<string, { label: string; href: string } | undefined> = {
  EMPRESTIMO: { label: "Simular →", href: "/servidor/simular" },
  CARTAO_CONSIGNADO: { label: "Simular →", href: "/servidor/simular" },
  CARTAO_BENEFICIOS: { label: "Ver ofertas →", href: "/servidor/marketplace" },
};

function MargemCard({ data }: { data: { tipo: string; total: number; disponivel: number } }) {
  const nav = useNavigate();
  const utilizado = Math.max(0, data.total - data.disponivel);
  const pctUtilizado = data.total > 0 ? (utilizado / data.total) * 100 : 0;
  const pctLivre = 100 - pctUtilizado;
  const barra = utilizado === 0 ? "#10B981" : pctUtilizado > 80 ? "#EF4444" : "#C9A961";
  const label = PRODUTO_LABEL[data.tipo] ?? data.tipo;
  const acao = ACAO_POR_TIPO[data.tipo];

  return (
    <div style={{
      background: "rgba(255,255,255,.04)",
      border: "1px solid rgba(255,255,255,.08)",
      borderRadius: 14,
      padding: 22,
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      {/* nome da modalidade */}
      <div style={{ fontSize: 15, fontWeight: 700, color: "#EAF0FA" }}>{label}</div>

      {/* barra de progresso + percentuais */}
      <div>
        <div style={{ height: 5, background: "rgba(255,255,255,.08)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${pctUtilizado}%`, height: "100%", background: barra, transition: "width .4s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12 }}>
          <span style={{ color: utilizado > 0 ? "#C9A961" : "#7A8CA8" }}>
            {utilizado === 0 ? "0%" : `${pctUtilizado.toFixed(1)}% utilizado`}
          </span>
          <span style={{ color: "#10B981" }}>{pctLivre.toFixed(1)}% livre</span>
        </div>
      </div>

      {/* Total / Utilizado / Disponivel — empilhados dentro do card */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <ValorLinha label="Total" value={fmtBRL(data.total)} color="#EAF0FA" />
        <ValorLinha label="Utilizado" value={fmtBRL(utilizado)} color={utilizado > 0 ? "#C9A961" : "#7A8CA8"} />
        <ValorLinha label="Disponível" value={fmtBRL(data.disponivel)} color="#10B981" bold />
      </div>

      {/* Botao de acao — Simular (emprestimo/cartao credito) ou Ver ofertas (cartao beneficio). */}
      {acao ? (
        <button
          type="button"
          onClick={() => nav(acao.href)}
          style={{
            marginTop: 4,
            padding: "10px 14px",
            borderRadius: 10,
            border: "none",
            background: "var(--emerald-500)",
            color: "white",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            width: "100%",
          }}
        >
          {acao.label}
        </button>
      ) : null}
    </div>
  );
}

function ValorLinha({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
      <span style={{ fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: "#7A8CA8", fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: bold ? 800 : 700, color, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function ContratoCard({ contrato }: { contrato: MatriculaInfo["contratos"][number] }) {
  const iniciais = iniciaisBanco(contrato.banco);
  const cor = corBanco(contrato.banco);
  const tipoLabel = contrato.banco.toLowerCase().includes("refin") ? "REFINANCIAMENTO" : "EMPRESTIMO";
  return (
    <article style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      padding: 14,
      display: "flex",
      alignItems: "center",
      gap: 14,
      flexWrap: "wrap",
    }}>
      {/* avatar */}
      <div style={{
        width: 42, height: 42, borderRadius: "50%",
        background: `color-mix(in srgb, ${cor} 18%, transparent)`,
        color: cor, fontWeight: 800, fontSize: 14,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `1px solid color-mix(in srgb, ${cor} 40%, transparent)`,
        flexShrink: 0,
      }}>
        {iniciais}
      </div>

      {/* info */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{contrato.banco}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
          {tipoLabel} · {contrato.parcelasPagas} / {contrato.total} parcelas
        </div>
      </div>

      {/* pill */}
      <Pill variant={contrato.status === "Averbado" ? "averbado" : "aceita"}>
        {contrato.status}
      </Pill>

      {/* valor */}
      <div style={{ textAlign: "right", minWidth: 100 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{fmtBRL(contrato.parcela)}</div>
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>/mês</div>
      </div>

      {/* PDF */}
      <a
        href={contrato.pdfUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid var(--border-strong)",
          background: "transparent",
          color: "var(--text)",
          fontSize: 12,
          fontWeight: 600,
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        ↓ PDF
      </a>
    </article>
  );
}

function AtalhoCard({
  titulo,
  descricao,
  icon,
  accent,
  onClick,
}: {
  titulo: string;
  descricao: string;
  icon: string;
  accent: "emerald" | "gold" | "navy";
  onClick: () => void;
}) {
  const accentColor =
    accent === "emerald" ? "var(--emerald-500)" : accent === "gold" ? "var(--gold-500)" : "var(--accent)";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left", cursor: "pointer",
        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
        padding: 16, display: "flex", flexDirection: "column", gap: 6,
        transition: "transform .12s ease, border-color .12s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accentColor;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span style={{ fontWeight: 700, fontSize: ".98rem", color: "var(--text)" }}>{titulo}</span>
      <span style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>{descricao}</span>
    </button>
  );
}
