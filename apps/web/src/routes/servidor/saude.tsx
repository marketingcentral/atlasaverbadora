import { useEffect, useMemo, useState } from "react";
import { Card } from "@atlas/ui/web";
import type { MatriculaInfo } from "../../lib/matricula-data";
import { readActiveMatricula, STORAGE_KEY_META, STORAGE_KEY_ID } from "../../lib/matricula-data";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

interface Parceiro {
  id: string;
  nome: string;
  local: string;
  icone: string;
  cor: string;
  descontoLabel: string;
  descontoComplemento: string;
}

/** Parceiros de saúde da prefeitura (banco disponibiliza via cartão consignado). */
function parceirosSaudeDaPrefeitura(cidade: string): Parceiro[] {
  return [
    { id: "farmacia-sj", nome: "Farmácia São João", local: `${cidade} Centro`, icone: "💊", cor: "#dc2626", descontoLabel: "10% desconto", descontoComplemento: "em medicamentos" },
    { id: "bodyfit", nome: "Academia BodyFit", local: cidade, icone: "💪", cor: "#f59e0b", descontoLabel: "20% desconto", descontoComplemento: "na mensalidade" },
    { id: "otica-vp", nome: "Ótica Visão Plus", local: `${cidade} Centro`, icone: "👓", cor: "#2563eb", descontoLabel: "25% desconto", descontoComplemento: "em armações" },
  ];
}

export function ServidorSaude() {
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

  const cidade = useMemo(() => {
    if (!info) return "";
    return info.prefeitura.replace(/^Prefeitura de\s+/i, "");
  }, [info]);

  const parceiros = useMemo(() => parceirosSaudeDaPrefeitura(cidade), [cidade]);

  if (!info) return null;

  const margemBeneficios = info.margem.margens_por_tipo.find((m) => m.tipo === "CARTAO_BENEFICIOS");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 1080, width: "100%", margin: "0 auto" }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Portal do servidor
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem", letterSpacing: "-0.02em" }}>Saúde e Bem-Estar</h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 640 }}>
          Benefícios de saúde disponibilizados pelo seu banco parceiro através do Cartão Benefício Consignado.
        </p>
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
          width: 62, height: 62, borderRadius: 14,
          background: "rgba(255,255,255,.16)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 30, flexShrink: 0,
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
            fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
            background: "rgba(255,255,255,.2)", color: "white",
            border: "1px solid rgba(255,255,255,.3)",
          }}>
            GRATUITO · Sem carência
          </span>
          <button
            type="button"
            onClick={() => alert("Fluxo de agendamento — em breve.")}
            style={{
              padding: "10px 18px", borderRadius: 10,
              background: "white", color: "var(--emerald-600, #059669)",
              fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,.15)",
            }}
          >
            Agendar consulta →
          </button>
        </div>
      </article>

      {/* Parceiros de saúde */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Rede de saúde parceira
        </span>
        {parceiros.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 14, border: "1px dashed var(--border)", borderRadius: 12 }}>
            Sem parceiros de saúde nesta região — em breve mais opções.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {parceiros.map((p) => <ParceiroCard key={p.id} parceiro={p} />)}
          </div>
        )}
      </section>

      {/* Cartão Benefícios — margem usada nos parceiros de saúde */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Cartão Benefício Consignado
        </span>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 26 }}>🎁</span>
            <div>
              <div style={{ fontWeight: 700 }}>Seu limite para saúde e bem-estar</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Compras nos parceiros acima são debitadas do seu limite. Fatura vem na folha.
              </div>
            </div>
          </div>
          <CartaoResumo margem={margemBeneficios ?? { total: 0, disponivel: 0 }} />
        </Card>
      </section>

      <div style={{
        padding: "10px 14px", borderRadius: 10,
        background: "color-mix(in srgb, var(--accent) 6%, transparent)",
        border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
        fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5,
      }}>
        <b style={{ color: "var(--text)" }}>ℹ️ Sobre esses benefícios:</b> os benefícios de saúde são oferecidos pelo <b>banco parceiro</b> que disponibiliza seu cartão consignado. Descontos comerciais (alimentação, educação, lazer) estão na aba <b>Descontos e Benefícios</b>.
      </div>
    </div>
  );
}

function ParceiroCard({ parceiro }: { parceiro: Parceiro }) {
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
        width: 44, height: 44, borderRadius: 10,
        background: `color-mix(in srgb, ${parceiro.cor} 15%, transparent)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, flexShrink: 0,
      }}>
        {parceiro.icone}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{parceiro.nome}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
          Saúde · {parceiro.local}
        </div>
        <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)" }}>
          <b style={{ color: "var(--emerald-500)", fontSize: 14 }}>{parceiro.descontoLabel}</b> {parceiro.descontoComplemento}
        </div>
      </div>
    </article>
  );
}

function CartaoResumo({ margem }: { margem: { total: number; disponivel: number } }) {
  const utilizado = Math.max(0, margem.total - margem.disponivel);
  const pct = margem.total > 0 ? Math.min(100, Math.round((utilizado / margem.total) * 100)) : 0;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 14 }}>
        <Stat label="Total" value={fmtBRL(margem.total)} />
        <Stat label="Utilizado" value={fmtBRL(utilizado)} muted />
        <Stat label="Disponível" value={fmtBRL(margem.disponivel)} accent />
      </div>
      <div style={{ marginTop: 12, height: 6, background: "var(--bg-elev-2)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: pct > 80 ? "var(--danger-500)" : pct > 60 ? "var(--gold-500)" : "var(--emerald-500)",
        }} />
      </div>
    </>
  );
}

function Stat({ label, value, accent, muted }: { label: string; value: string; accent?: boolean; muted?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 4, fontWeight: 700, color: accent ? "var(--emerald-500)" : muted ? "var(--text-muted)" : "var(--text)" }}>
        {value}
      </div>
    </div>
  );
}
