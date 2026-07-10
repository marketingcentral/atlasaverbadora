import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, ComunicadoCarrossel } from "@atlas/ui/web";
import type { Comunicado } from "@atlas/sdk";
import { atlas } from "../../lib/sdk";
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

/** Fallbacks locais mostrados quando a API ainda não retornou comunicados
 *  (primeiro render / offline / servidor sem comunicados cadastrados).
 *  Os do backend, quando chegam, substituem estes. */
const COMUNICADOS_FALLBACK: Comunicado[] = [
  {
    id: "COM-SRV-1",
    titulo: "Simule seu empréstimo em 1 minuto",
    corpo: "Use o simulador do Atlas e veja em segundos a parcela que cabe na sua margem. Sem burocracia, com taxas dos bancos parceiros da sua prefeitura.",
    linkLabel: "Simular agora",
    linkHref: "/servidor/simular",
    publico: "servidor",
  },
  {
    id: "COM-SRV-2",
    titulo: "Portabilidade: pague menos no seu consignado",
    corpo: "Já tem um contrato? Compare ofertas de portabilidade e reduza sua parcela mensal sem trocar de banco na folha.",
    linkLabel: "Ver portabilidade",
    linkHref: "/servidor/marketplace/portabilidade",
    publico: "servidor",
  },
  {
    id: "COM-SRV-3",
    titulo: "Telemedicina 24h incluída no seu cartão",
    corpo: "Consulta médica online sem sair de casa, sem custo adicional, para você e sua família. Descubra como ativar.",
    linkLabel: "Acessar Telemedicina",
    linkHref: "/servidor/saude",
    publico: "servidor",
  },
];

/** Converte o shape do SDK ({linkLabel, linkHref}) pra o shape que o
 *  ComunicadoCarrossel do @atlas/ui espera ({link: {label, href}}). */
function toCarrosselShape(c: Comunicado) {
  return {
    id: c.id,
    titulo: c.titulo,
    corpo: c.corpo,
    ...(c.linkHref ? { link: { label: c.linkLabel ?? "Saiba mais", href: c.linkHref } } : {}),
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

  // Comunicados publicados pela averbadora para publico=servidor.
  // Fallback local pra tela nunca ficar em branco em caso de rede/deploy sem seed.
  const comunicadosQ = useQuery({
    queryKey: ["servidor", "comunicados"],
    queryFn: () => atlas.servidor.comunicados(),
    staleTime: 5 * 60_000,
  });
  const comunicadosCarrossel = useMemo(() => {
    const fromApi = comunicadosQ.data?.comunicados ?? [];
    const base = fromApi.length > 0 ? fromApi : COMUNICADOS_FALLBACK;
    return base.map(toCarrosselShape);
  }, [comunicadosQ.data]);

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

      {/* Carrossel de comunicados publicados pela averbadora (publico=servidor).
          Substitui a antiga seção "Meus contratos" no dashboard — quem quiser ver
          contratos vai em /servidor/contratos pelo menu superior. */}
      <ComunicadoCarrossel comunicados={comunicadosCarrossel} />

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

      {/* Substituiu as "Ações rápidas" antigas — cliente pediu 2 blocos, um de
          Portabilidade e outro de Telemedicina. */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, 1fr)" }}>
        <AtalhoCard
          titulo="Portabilidade"
          descricao="Consolide em outro banco com taxa menor e reduza sua parcela mensal."
          icon="🔁"
          accent="gold"
          onClick={() => nav("/servidor/marketplace/portabilidade")}
        />
        <AtalhoCard
          titulo="Telemedicina"
          descricao="Consulta médica online sem custo, para você e sua família."
          icon="📱"
          accent="emerald"
          onClick={() => nav("/servidor/saude")}
        />
      </div>

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
      padding: 20,
      color: "#EAF0FA",
      boxShadow: "var(--shadow-md)",
    }}>
      {/* 3 quadrados lado a lado. repeat(3,1fr) força as 3 colunas mesmo em
          largura apertada — cliente pediu "um do lado do outro". */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
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
      padding: 18,
      display: "flex",
      flexDirection: "column",
      gap: 14,
      minWidth: 0,
    }}>
      {/* nome da modalidade */}
      <div style={{ fontSize: 14, fontWeight: 700, color: "#EAF0FA", lineHeight: 1.3 }}>{label}</div>

      {/* barra de progresso + percentuais */}
      <div>
        <div style={{ height: 5, background: "rgba(255,255,255,.08)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${pctUtilizado}%`, height: "100%", background: barra, transition: "width .4s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 11 }}>
          <span style={{ color: utilizado > 0 ? "#C9A961" : "#7A8CA8" }}>
            {utilizado === 0 ? "0%" : `${pctUtilizado.toFixed(1)}% util.`}
          </span>
          <span style={{ color: "#10B981" }}>{pctLivre.toFixed(1)}% livre</span>
        </div>
      </div>

      {/* Total / Utilizado / Disponivel — empilhados dentro do card */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
            padding: "10px 12px",
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
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
      <span style={{ fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: "#7A8CA8", fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: bold ? 800 : 700, color, textAlign: "right", whiteSpace: "nowrap" }}>{value}</span>
    </div>
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
