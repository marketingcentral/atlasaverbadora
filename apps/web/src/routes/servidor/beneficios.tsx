import { useEffect, useMemo, useState } from "react";
import { Card } from "@atlas/ui/web";
import type { MatriculaInfo } from "../../lib/matricula-data";
import { readActiveMatricula, STORAGE_KEY_META, STORAGE_KEY_ID } from "../../lib/matricula-data";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

type Categoria = "todos" | "saude" | "alimentacao" | "educacao" | "lazer";

const CATEGORIAS: { id: Categoria; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "saude", label: "Saúde" },
  { id: "alimentacao", label: "Alimentação" },
  { id: "educacao", label: "Educação" },
  { id: "lazer", label: "Lazer" },
];

interface Parceiro {
  id: string;
  nome: string;
  categorias: Exclude<Categoria, "todos">[];
  local: string;
  icone: string;
  cor: string;
  descontoLabel: string; // "10% desconto"
  descontoComplemento: string; // "em medicamentos"
}

// Parceiros de exemplo — no futuro virao do backend (averbadora cadastra).
// Filtrados pela cidade da prefeitura do servidor.
function parceirosDaPrefeitura(cidade: string): Parceiro[] {
  return [
    { id: "farmacia-sj", nome: "Farmácia São João", categorias: ["saude"], local: `${cidade} Centro`, icone: "💊", cor: "#dc2626", descontoLabel: "10% desconto", descontoComplemento: "em medicamentos" },
    { id: "super-central", nome: "Supermercado Central", categorias: ["alimentacao"], local: cidade, icone: "🛒", cor: "#0891b2", descontoLabel: "5% desconto", descontoComplemento: "em compras" },
    { id: "bodyfit", nome: "Academia BodyFit", categorias: ["saude", "lazer"], local: cidade, icone: "💪", cor: "#f59e0b", descontoLabel: "20% desconto", descontoComplemento: "na mensalidade" },
    { id: "sabor", nome: "Restaurante Sabor", categorias: ["alimentacao"], local: cidade, icone: "🍽", cor: "#c2410c", descontoLabel: "15% desconto", descontoComplemento: "no almoço" },
    { id: "otica-vp", nome: "Ótica Visão Plus", categorias: ["saude"], local: `${cidade} Centro`, icone: "👓", cor: "#2563eb", descontoLabel: "25% desconto", descontoComplemento: "em armações" },
    { id: "plus-idiomas", nome: "Escola Plus Idiomas", categorias: ["educacao"], local: cidade, icone: "🎓", cor: "#7c3aed", descontoLabel: "30% desconto", descontoComplemento: "na matrícula" },
  ];
}

export function ServidorBeneficios() {
  const [info, setInfo] = useState<MatriculaInfo | null>(() => readActiveMatricula());
  const [tab, setTab] = useState<Categoria>("todos");

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_META || e.key === STORAGE_KEY_ID) {
        setInfo(readActiveMatricula());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const cidade = useMemo(() => {
    if (!info) return "";
    // info.prefeitura vem como "Prefeitura de Castro"
    return info.prefeitura.replace(/^Prefeitura de\s+/i, "");
  }, [info]);

  const parceiros = useMemo(() => parceirosDaPrefeitura(cidade), [cidade]);
  const filtrados = useMemo(() => {
    if (tab === "todos") return parceiros;
    return parceiros.filter((p) => p.categorias.includes(tab));
  }, [parceiros, tab]);

  if (!info) return null;

  const margemBeneficios = info.margem.margens_por_tipo.find((m) => m.tipo === "CARTAO_BENEFICIOS");
  const margemCartaoConsig = info.margem.margens_por_tipo.find((m) => m.tipo === "CARTAO_CONSIGNADO");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 1080, width: "100%", margin: "0 auto" }}>
      {/* Header — modelo */}
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Portal do servidor
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem", letterSpacing: "-0.02em" }}>Descontos e Benefícios</h1>
        </div>
        {/* Tabs de categoria */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CATEGORIAS.map((c) => (
            <CategoriaTab key={c.id} active={tab === c.id} onClick={() => setTab(c.id)} label={c.label} />
          ))}
        </div>
      </header>

      {/* Banner benefício exclusivo — Telemedicina Gratuita */}
      <article style={{
        background: "linear-gradient(120deg, var(--emerald-600, #059669), var(--emerald-500))",
        borderRadius: 16,
        padding: 22,
        display: "flex",
        alignItems: "center",
        gap: 18,
        flexWrap: "wrap",
        color: "white",
        boxShadow: "0 4px 14px rgba(16,185,129,.25)",
      }}>
        <div style={{
          width: 62,
          height: 62,
          borderRadius: 14,
          background: "rgba(255,255,255,.16)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 30,
          flexShrink: 0,
        }}>🩺</div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", opacity: 0.85, textTransform: "uppercase" }}>
            Benefício exclusivo · Servidor
          </div>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, marginTop: 2 }}>Telemedicina Gratuita</div>
          <div style={{ fontSize: 13, opacity: 0.92, marginTop: 4 }}>
            Consultas online 24h · Clínico Geral, Pediatria, Psicologia, Nutrição
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: 999,
            background: "rgba(255,255,255,.2)",
            color: "white",
            border: "1px solid rgba(255,255,255,.3)",
          }}>
            GRATUITO · Sem carência
          </span>
          <button
            type="button"
            onClick={() => alert("Fluxo de agendamento — em breve.")}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              background: "white",
              color: "var(--emerald-600, #059669)",
              fontWeight: 700,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,.15)",
            }}
          >
            Agendar consulta →
          </button>
        </div>
      </article>

      {/* Comércio local parceiro */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Comércio local parceiro
        </span>
        {filtrados.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 14, border: "1px dashed var(--border)", borderRadius: 12 }}>
            Nenhum parceiro nesta categoria — em breve mais opções.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {filtrados.map((p) => (
              <ParceiroCard key={p.id} parceiro={p} />
            ))}
          </div>
        )}
      </section>

      {/* Cartões (Consignado + Benefícios) — margens preservadas do fluxo antigo */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Meus cartões
        </span>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <CartaoResumo
            titulo="Cartão Consignado"
            descricao="Limite recorrente com desconto em folha das faturas."
            total={margemCartaoConsig?.total ?? 0}
            disponivel={margemCartaoConsig?.disponivel ?? 0}
            icon="💳"
          />
          <CartaoResumo
            titulo="Cartão Benefícios"
            descricao="Compras em farmácias, mercado e postos parceiros."
            total={margemBeneficios?.total ?? 0}
            disponivel={margemBeneficios?.disponivel ?? 0}
            icon="🎁"
          />
        </div>
      </section>

      <div style={{
        padding: "10px 14px",
        borderRadius: 10,
        background: "color-mix(in srgb, var(--gold-500) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--gold-500) 30%, transparent)",
        fontSize: 12.5,
        color: "var(--text-muted)",
        lineHeight: 1.5,
      }}>
        <b style={{ color: "var(--text)" }}>ℹ️ Importante:</b> a margem de cartão consignado e cartão benefícios é distinta da margem de empréstimo — não é possível usar limite de um produto no outro.
      </div>
    </div>
  );
}

function CategoriaTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 10,
        border: `1px solid ${active ? "var(--emerald-500)" : "var(--border)"}`,
        background: active ? "color-mix(in srgb, var(--emerald-500) 10%, transparent)" : "transparent",
        color: active ? "var(--emerald-500)" : "var(--text-muted)",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function ParceiroCard({ parceiro }: { parceiro: Parceiro }) {
  const catLabel = parceiro.categorias
    .map((c) => CATEGORIAS.find((x) => x.id === c)?.label)
    .filter(Boolean)
    .join(" · ");
  return (
    <article style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      padding: 16,
      display: "flex",
      gap: 14,
      alignItems: "flex-start",
    }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: `color-mix(in srgb, ${parceiro.cor} 15%, transparent)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        flexShrink: 0,
      }}>
        {parceiro.icone}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{parceiro.nome}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
          {catLabel} · {parceiro.local}
        </div>
        <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)" }}>
          <b style={{ color: "var(--emerald-500)", fontSize: 14 }}>{parceiro.descontoLabel}</b> {parceiro.descontoComplemento}
        </div>
      </div>
    </article>
  );
}

function CartaoResumo({
  titulo,
  descricao,
  total,
  disponivel,
  icon,
}: {
  titulo: string;
  descricao: string;
  total: number;
  disponivel: number;
  icon: string;
}) {
  const utilizado = Math.max(0, total - disponivel);
  const pct = total > 0 ? Math.min(100, Math.round((utilizado / total) * 100)) : 0;
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 26 }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 700 }}>{titulo}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{descricao}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 14, fontSize: ".82rem" }}>
        <Stat label="Total" value={fmtBRL(total)} />
        <Stat label="Utilizado" value={fmtBRL(utilizado)} muted />
        <Stat label="Disponível" value={fmtBRL(disponivel)} accent />
      </div>
      <div style={{ marginTop: 12, height: 6, background: "var(--bg-elev-2)", borderRadius: 999, overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: pct > 80 ? "var(--danger-500)" : pct > 60 ? "var(--gold-500)" : "var(--emerald-500)",
          }}
        />
      </div>
    </Card>
  );
}

function Stat({ label, value, accent, muted }: { label: string; value: string; accent?: boolean; muted?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase" }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 4,
          fontWeight: 700,
          color: accent ? "var(--emerald-500)" : muted ? "var(--text-muted)" : "var(--text)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
