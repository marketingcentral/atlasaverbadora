import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Card, Pill } from "@atlas/ui/web";
import {
  readActiveIdMatricula,
  STORAGE_KEY_ID,
  STORAGE_KEY_META,
} from "../../lib/matricula-data";
import {
  ESTADO_LABEL,
  ESTADOS_TIMELINE,
  PROPOSTAS_KEY,
  fmtDateTime,
  getAllPropostasForMatricula,
  type EstadoProposta,
  type Proposta,
} from "../../lib/propostas-data";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

// Estados visiveis em /propostas — pedido do usuario.
// Mostra apenas a primeira proposta em_analise + todas as expiradas.
const ESTADOS_VISIVEIS: EstadoProposta[] = ["em_analise", "expirada"];

function filtrarVisiveis(list: Proposta[]): Proposta[] {
  const filtradas = list.filter((p) => ESTADOS_VISIVEIS.includes(p.estado));
  let viuEmAnalise = false;
  return filtradas.filter((p) => {
    if (p.estado === "em_analise") {
      if (viuEmAnalise) return false;
      viuEmAnalise = true;
      return true;
    }
    return true; // expirada sempre passa
  });
}

export function ServidorPropostas() {
  const location = useLocation();
  const [idMatricula, setIdMatricula] = useState<string | null>(() => readActiveIdMatricula());
  const [propostas, setPropostas] = useState<Proposta[]>(() =>
    filtrarVisiveis(getAllPropostasForMatricula(readActiveIdMatricula())),
  );
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    setPropostas(filtrarVisiveis(getAllPropostasForMatricula(idMatricula)));
  }, [idMatricula]);

  // Scroll + destaque quando a URL tem hash (#PRO-9803) — usado pelas
  // notificacoes ao clicar.
  useEffect(() => {
    const hash = location.hash?.replace(/^#/, "");
    if (!hash) return;
    // Pequeno delay pra dar tempo do DOM renderizar os cards.
    const t = setTimeout(() => {
      const el = document.getElementById(`proposta-${hash}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(hash);
      // Tira o destaque depois de 3s.
      setTimeout(() => setHighlightId(null), 3000);
    }, 100);
    return () => clearTimeout(t);
  }, [location.hash, propostas]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_META || e.key === STORAGE_KEY_ID) {
        setIdMatricula(readActiveIdMatricula());
      } else if (e.key === PROPOSTAS_KEY) {
        setPropostas(filtrarVisiveis(getAllPropostasForMatricula(idMatricula)));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [idMatricula]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span className="eyebrow">Minhas propostas</span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Historico</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Acompanhe o ciclo de vida das suas propostas e formalize as aprovadas.
        </p>
      </header>

      {propostas.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "24px 12px" }}>
            <div style={{ fontSize: 36, opacity: 0.5 }}>📭</div>
            <h3 style={{ marginTop: 12, marginBottom: 6 }}>Voce ainda nao tem propostas</h3>
            <p style={{ color: "var(--text-muted)", fontSize: ".9rem", maxWidth: 380, margin: "0 auto" }}>
              Quando voce simular um emprestimo ou consolidar contratos via portabilidade, suas propostas
              aparecerao aqui.
            </p>
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {propostas.map((p) => (
            <PropostaCard
              key={p.id}
              p={p}
              highlighted={highlightId === p.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PropostaCard({ p, highlighted }: { p: Proposta; highlighted?: boolean }) {
  const terminal = p.estado === "recusada" || p.estado === "expirada" || p.estado === "cancelada";
  const pillVariant: "aceita" | "pendente" | "expirado" | "averbado" =
    p.estado === "liberada" || p.estado === "formalizada"
      ? "averbado"
      : terminal
        ? "expirado"
        : p.estado === "aprovada" || p.estado === "aguardando_formalizacao"
          ? "aceita"
          : "pendente";

  return (
    <Card
      id={`proposta-${p.id}`}
      style={
        highlighted
          ? {
              borderColor: "var(--gold-500)",
              boxShadow: "0 0 0 3px color-mix(in srgb, var(--gold-500) 25%, transparent)",
              transition: "border-color .3s, box-shadow .3s",
            }
          : { transition: "border-color .3s, box-shadow .3s" }
      }
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 700 }}>{p.banco}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {p.id} · criada em {fmtDateTime(p.criadaEm)}
          </div>
        </div>
        <Pill variant={pillVariant}>{ESTADO_LABEL[p.estado]}</Pill>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginTop: 16,
          fontSize: 13,
        }}
      >
        <KV label="Valor liberado" v={fmtBRL(p.valor)} accent />
        <KV label="Parcelas" v={`${p.parcelas}x de ${fmtBRL(p.parcela)}`} />
        <KV label="Taxa mensal" v={`${p.taxaAm.toFixed(2)}%`} />
        {p.expiraEm && !terminal ? <KV label="Trava ate" v={fmtDateTime(p.expiraEm)} /> : null}
      </div>

      {!terminal ? (
        <div style={{ marginTop: 18 }}>
          <Timeline atual={p.estado} />
        </div>
      ) : null}
    </Card>
  );
}

function Timeline({ atual }: { atual: EstadoProposta }) {
  const idxAtual = ESTADOS_TIMELINE.indexOf(atual);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {ESTADOS_TIMELINE.map((s, i) => {
        const done = i < idxAtual;
        const active = i === idxAtual;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, flex: "1 1 auto", minWidth: 0 }}>
            <div
              style={{
                width: 22, height: 22, borderRadius: "50%",
                background: done ? "var(--emerald-500)" : active ? "var(--gold-500)" : "var(--bg-elev-2)",
                color: done || active ? "var(--navy-900)" : "var(--text-muted)",
                display: "grid", placeItems: "center", fontWeight: 700, fontSize: ".72rem",
                flexShrink: 0,
              }}
            >
              {done ? "✓" : i + 1}
            </div>
            <span
              style={{
                fontSize: ".75rem",
                color: active ? "var(--text)" : "var(--text-muted)",
                fontWeight: active ? 600 : 400,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {ESTADO_LABEL[s]}
            </span>
            {i < ESTADOS_TIMELINE.length - 1 ? (
              <div style={{ flex: 1, height: 1, background: "var(--border)", minWidth: 12 }} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function KV({ label, v, accent }: { label: string; v: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ marginTop: 4, color: accent ? "var(--emerald-500)" : "var(--text)", fontWeight: accent ? 700 : 500 }}>
        {v}
      </div>
    </div>
  );
}
