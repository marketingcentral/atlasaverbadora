import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card } from "@atlas/ui/web";
import type { MatriculaInfo } from "../../lib/matricula-data";
import { readActiveMatricula, STORAGE_KEY_META, STORAGE_KEY_ID } from "../../lib/matricula-data";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function ServidorBeneficios() {
  const nav = useNavigate();
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

  if (!info) return null;

  const margemBeneficios = info.margem.margens_por_tipo.find((m) => m.tipo === "CARTAO_BENEFICIOS");
  const margemCartaoConsig = info.margem.margens_por_tipo.find((m) => m.tipo === "CARTAO_CONSIGNADO");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 960, width: "100%", margin: "0 auto" }}>
      <header>
        <span className="eyebrow">Cartões e benefícios</span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Benefícios do convênio</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6, maxWidth: 640 }}>
          Cartão Consignado e Cartão Benefícios da <b>{info.prefeitura}</b>. Limites independentes da margem de empréstimo.
        </p>
      </header>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <CartaoResumo
          titulo="Cartão Consignado"
          descricao="Limite recorrente com desconto em folha das faturas."
          total={margemCartaoConsig?.total ?? 0}
          disponivel={margemCartaoConsig?.disponivel ?? 0}
          icon="💳"
        />
        <CartaoResumo
          titulo="Cartão Benefícios"
          descricao="Compras em farmácias, mercado e postos parceiros do convênio."
          total={margemBeneficios?.total ?? 0}
          disponivel={margemBeneficios?.disponivel ?? 0}
          icon="🎁"
        />
      </div>

      <Card>
        <span className="eyebrow">Ofertas de benefícios</span>
        <div style={{ marginTop: 12, padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: ".9rem" }}>
          <div style={{ fontSize: 32, opacity: 0.5 }}>🛒</div>
          <div style={{ marginTop: 8, fontWeight: 600, color: "var(--text)" }}>
            Ofertas exclusivas dos bancos parceiros
          </div>
          <p style={{ margin: "6px auto 0", maxWidth: 460, lineHeight: 1.5 }}>
            Em breve — os bancos parceiros publicam aqui as tabelas de cartão consignado e cartão benefícios
            específicas do convênio de <b>{info.prefeitura}</b>.
          </p>
        </div>
      </Card>

      <div
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          background: "color-mix(in srgb, var(--gold-500) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--gold-500) 30%, transparent)",
          fontSize: ".82rem",
          color: "var(--text-muted)",
          lineHeight: 1.5,
        }}
      >
        <b style={{ color: "var(--text)" }}>ℹ️ Importante:</b> a margem de cartão consignado e cartão benefícios é
        distinta da margem de empréstimo — não é possível usar limite de um produto no outro.
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="ghost" onClick={() => nav("/servidor/dashboard")}>← Voltar ao início</Button>
      </div>
    </div>
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
