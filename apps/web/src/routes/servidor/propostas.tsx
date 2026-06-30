import { useState } from "react";
import { Button, Card, Pill } from "@atlas/ui/web";

type Estado =
  | "em_analise"
  | "aprovada"
  | "aguardando_formalizacao"
  | "formalizada"
  | "liberada"
  | "recusada"
  | "expirada"
  | "cancelada";

interface Proposta {
  id: string;
  banco: string;
  estado: Estado;
  valor: number;
  parcelas: number;
  parcela: number;
  taxaAm: number;
  criadaEm: string;
  expiraEm?: string;
  linkFormalizacao?: string;
  motivoRecusa?: string;
}

const PROPOSTAS_INICIAIS: Proposta[] = [
  {
    id: "PRO-9821",
    banco: "SCred Financeira",
    estado: "aguardando_formalizacao",
    valor: 25000,
    parcelas: 48,
    parcela: 750,
    taxaAm: 1.65,
    criadaEm: "29/06/2026 14:22",
    expiraEm: "01/07/2026 14:22",
    linkFormalizacao: "https://scred.test/formalizar/PRO-9821",
  },
  {
    id: "PRO-9805",
    banco: "Banco Y",
    estado: "em_analise",
    valor: 12000,
    parcelas: 36,
    parcela: 412.4,
    taxaAm: 1.72,
    criadaEm: "30/06/2026 09:10",
    expiraEm: "02/07/2026 09:10",
  },
  {
    id: "PRO-9803",
    banco: "Pan Credito",
    estado: "aprovada",
    valor: 8000,
    parcelas: 24,
    parcela: 380.5,
    taxaAm: 1.88,
    criadaEm: "30/06/2026 11:00",
    expiraEm: "01/07/2026 11:00",
    linkFormalizacao: "https://pan.test/contrato/PRO-9803",
  },
  {
    id: "PRO-9742",
    banco: "Pan Credito",
    estado: "expirada",
    valor: 6000,
    parcelas: 24,
    parcela: 320.1,
    taxaAm: 1.99,
    criadaEm: "20/06/2026 16:00",
  },
  {
    id: "PRO-9701",
    banco: "Banco Y",
    estado: "recusada",
    valor: 15000,
    parcelas: 60,
    parcela: 380,
    taxaAm: 1.72,
    criadaEm: "15/06/2026 10:30",
    motivoRecusa: "Comprometimento de renda acima do limite do convenio.",
  },
];

const ESTADO_LABEL: Record<Estado, string> = {
  em_analise: "Em analise pelo banco",
  aprovada: "Aprovada",
  aguardando_formalizacao: "Aguardando formalizacao",
  formalizada: "Formalizada",
  liberada: "Liberada",
  recusada: "Recusada",
  expirada: "Expirada",
  cancelada: "Cancelada",
};

const TIMELINE: Estado[] = ["em_analise", "aprovada", "aguardando_formalizacao", "formalizada", "liberada"];

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function ServidorPropostas() {
  const [propostas, setPropostas] = useState<Proposta[]>(PROPOSTAS_INICIAIS);

  function cancelar(id: string) {
    if (!window.confirm("Cancelar pre-reserva? Sua margem voltara a ficar disponivel.")) return;
    setPropostas((ps) => ps.map((p) => (p.id === id ? { ...p, estado: "cancelada" } : p)));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span className="eyebrow">Minhas propostas</span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Historico</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Acompanhe o ciclo de vida das suas propostas e formalize as aprovadas.
        </p>
      </header>

      <div style={{ display: "grid", gap: 16 }}>
        {propostas.map((p) => (
          <PropostaCard key={p.id} p={p} onCancelar={() => cancelar(p.id)} />
        ))}
      </div>
    </div>
  );
}

function PropostaCard({ p, onCancelar }: { p: Proposta; onCancelar: () => void }) {
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
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 700 }}>{p.banco}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {p.id} · criada em {p.criadaEm}
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
        {p.expiraEm && !terminal ? <KV label="Trava ate" v={p.expiraEm} /> : null}
      </div>

      {!terminal ? (
        <div style={{ marginTop: 18 }}>
          <Timeline atual={p.estado} />
        </div>
      ) : null}

      {p.motivoRecusa ? (
        <div
          style={{
            marginTop: 14, padding: "10px 14px", borderRadius: 10,
            border: "1px solid var(--danger-500)",
            background: "color-mix(in srgb, var(--danger-500) 10%, transparent)",
            fontSize: ".88rem",
          }}
        >
          <b>Motivo da recusa:</b> {p.motivoRecusa}
        </div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
        {(p.estado === "aprovada" || p.estado === "aguardando_formalizacao") && p.linkFormalizacao ? (
          <Button
            size="sm"
            onClick={() => window.open(p.linkFormalizacao, "_blank", "noopener,noreferrer")}
          >
            Formalizar no banco →
          </Button>
        ) : null}
        {!terminal && p.estado !== "formalizada" && p.estado !== "liberada" ? (
          <Button size="sm" variant="ghost" onClick={onCancelar}>
            Cancelar pre-reserva
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function Timeline({ atual }: { atual: Estado }) {
  const idxAtual = TIMELINE.indexOf(atual);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {TIMELINE.map((s, i) => {
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
            {i < TIMELINE.length - 1 ? (
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
