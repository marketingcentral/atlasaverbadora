import { useEffect, useState } from "react";
import { Button, Card, Pill } from "@atlas/ui/web";
import {
  readActiveIdMatricula,
  STORAGE_KEY_ID,
  STORAGE_KEY_META,
} from "../../lib/matricula-data";

const PROPOSTAS_KEY = "atlas:propostas:userCriadas";

interface StoredProposta {
  id: string;
  banco: string;
  estado: Estado;
  valor: number;
  parcelas: number;
  parcela: number;
  taxaAm: number;
  tipo: "novo" | "portabilidade" | "refinanciamento";
  criadaEm: string;
  expiraEm?: string;
  idMatricula?: string;
}

const fmtDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
};

function readUserPropostas(idMatricula: string | null): Proposta[] {
  try {
    const raw = window.localStorage.getItem(PROPOSTAS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as StoredProposta[];
    return list
      .filter((p) => !idMatricula || !p.idMatricula || p.idMatricula === idMatricula)
      .map((p) => ({
        id: p.id,
        banco: p.banco,
        estado: p.estado,
        valor: p.valor,
        parcelas: p.parcelas,
        parcela: p.parcela,
        taxaAm: p.taxaAm,
        criadaEm: fmtDateTime(p.criadaEm),
        expiraEm: p.expiraEm ? fmtDateTime(p.expiraEm) : undefined,
        idMatricula: p.idMatricula,
      }));
  } catch {
    return [];
  }
}

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
  idMatricula?: string;
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
    idMatricula: "MAT-852029100",
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
    idMatricula: "MAT-852029100",
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
    idMatricula: "MAT-009821",
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
    idMatricula: "MAT-852029100",
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
    idMatricula: "MAT-009821",
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

function buildLista(idMatricula: string | null): Proposta[] {
  const filteredIniciais = idMatricula
    ? PROPOSTAS_INICIAIS.filter((p) => !p.idMatricula || p.idMatricula === idMatricula)
    : PROPOSTAS_INICIAIS;
  return [...readUserPropostas(idMatricula), ...filteredIniciais];
}

export function ServidorPropostas() {
  const [idMatricula, setIdMatricula] = useState<string | null>(() => readActiveIdMatricula());
  const [propostas, setPropostas] = useState<Proposta[]>(() => buildLista(readActiveIdMatricula()));

  // Re-le do localStorage ao montar e quando matricula muda.
  useEffect(() => {
    setPropostas(buildLista(idMatricula));
  }, [idMatricula]);

  // Reage a troca de matricula em outra aba.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_META || e.key === STORAGE_KEY_ID) {
        setIdMatricula(readActiveIdMatricula());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function cancelar(id: string) {
    if (!window.confirm("Cancelar pre-reserva? Sua margem voltara a ficar disponivel.")) return;
    setPropostas((ps) => ps.map((p) => (p.id === id ? { ...p, estado: "cancelada" } : p)));
    // Persiste a mudanca pras propostas que vieram do localStorage.
    try {
      const raw = window.localStorage.getItem(PROPOSTAS_KEY);
      if (!raw) return;
      const list = JSON.parse(raw) as StoredProposta[];
      const next = list.map((p) => (p.id === id ? { ...p, estado: "cancelada" as Estado } : p));
      window.localStorage.setItem(PROPOSTAS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
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
            <PropostaCard key={p.id} p={p} onCancelar={() => cancelar(p.id)} />
          ))}
        </div>
      )}
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
