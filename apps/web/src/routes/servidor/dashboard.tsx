import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ComunicadoCarrossel } from "@atlas/ui/web";
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
    titulo: "Descontos exclusivos pra servidores",
    corpo: "Farmácia, mercado, saúde, educação e mais — parceiros negociados pela averbadora com descontos em todas as prefeituras parceiras.",
    linkLabel: "Ver benefícios",
    linkHref: "/servidor/beneficios",
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
      {/* Header */}
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Meu painel
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "2rem", letterSpacing: "-0.02em" }}>Olá, {primeiroNome}</h1>
        <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
          Matrícula <b style={{ color: "var(--text)" }}>{info.matricula}</b> · {info.prefeitura}
        </div>
      </header>

      {/* 3 cards de margem lado a lado — botao de acao em cada. */}
      <MinhaMargemPorModalidade info={info} />

      {/* Carrossel de comunicados/vitrine da averbadora — publico=servidor.
          Cliente pediu explicitamente o carrossel NO MEIO, entre os cards de
          margem e os 2 blocos de atalho abaixo. Autoplay 3s (default do
          componente e 6s) — cliente pediu mais rapido. */}
      <ComunicadoCarrossel comunicados={comunicadosCarrossel} autoplayMs={3000} />

      {/* 2 blocos grandes lado a lado — Telemedicina (esquerda) e Portabilidade (direita).
          Cliente pediu essa ordem: "Telemedicina e a Portabilidade".
          Portabilidade vai DIRETO pra /servidor/portabilidade (rota curta configurada
          em outra sessao pra pular o hub do MarketPlace). */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, 1fr)" }}>
        <AtalhoCard
          titulo="Telemedicina"
          descricao="Consulta médica online sem custo, para você e sua família."
          icon="🏥"
          accent="emerald"
          onClick={() => nav("/servidor/saude")}
        />
        <AtalhoCard
          titulo="Portabilidade"
          descricao="Consolide em outro banco com taxa menor e reduza sua parcela mensal."
          icon="🔁"
          accent="gold"
          onClick={() => nav("/servidor/portabilidade")}
        />
      </div>
    </div>
  );
}

/** Card grande dark com 3 quadrados de margem lado a lado. Herdado do trabalho
 *  do colega: cliente aprovou o formato — mantido como esta. */
function MinhaMargemPorModalidade({ info }: { info: MatriculaInfo }) {
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {linhas.map((m) => (
          <MargemCard key={m.tipo} data={m} />
        ))}
      </div>
    </article>
  );
}

const ACAO_POR_TIPO: Record<string, { label: string; href: string } | undefined> = {
  EMPRESTIMO: { label: "Simular →", href: "/servidor/simular?produto=emprestimo" },
  CARTAO_CONSIGNADO: { label: "Simular →", href: "/servidor/simular?produto=cartao_consignado" },
  CARTAO_BENEFICIOS: { label: "Simular →", href: "/servidor/simular?produto=cartao_beneficio" },
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
      <div style={{ fontSize: 14, fontWeight: 700, color: "#EAF0FA", lineHeight: 1.3 }}>{label}</div>

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

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <ValorLinha label="Total" value={fmtBRL(data.total)} color="#EAF0FA" />
        <ValorLinha label="Utilizado" value={fmtBRL(utilizado)} color={utilizado > 0 ? "#C9A961" : "#7A8CA8"} />
        <ValorLinha label="Disponível" value={fmtBRL(data.disponivel)} color="#10B981" bold />
      </div>

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
  titulo, descricao, icon, accent, onClick,
}: {
  titulo: string; descricao: string; icon: string;
  accent: "emerald" | "gold" | "navy"; onClick: () => void;
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
        padding: 18, display: "flex", flexDirection: "column", gap: 8,
        // height:100% + parent grid align-items:stretch (default) faz o botao
        // esticar pra altura do card mais alto; assim marginTop:auto no "Ver mais"
        // realmente empurra ele pro rodape e alinha as 2 pills horizontalmente.
        height: "100%",
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
      <span style={{ fontSize: 28 }}>{icon}</span>
      <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text)" }}>{titulo}</span>
      <span style={{ fontSize: ".88rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{descricao}</span>
      {/* "Ver mais" com aparencia de botao (mesmo estando dentro de um <button> pai —
          html-wise vira <span> visualmente estilizado, e o clique cai no pai).
          marginTop: auto empurra o Ver mais pro fim do card, garantindo que os 2
          botoes fiquem alinhados na mesma baseline mesmo com descricoes de tamanhos diferentes. */}
      <span
        style={{
          alignSelf: "flex-start",
          marginTop: "auto",
          padding: "6px 14px",
          borderRadius: 999,
          background: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
          border: `1px solid ${accentColor}`,
          color: accentColor,
          fontWeight: 700,
          fontSize: ".85rem",
        }}
      >
        Ver mais →
      </span>
    </button>
  );
}
