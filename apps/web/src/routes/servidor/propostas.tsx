import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, Pill } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import {
  ESTADO_LABEL,
  fmtDateTime,
  type EstadoProposta,
  type Proposta,
} from "../../lib/propostas-data";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

/** Mapeia a situação do contrato/reserva (backend) para o estado exibido ao servidor. */
function mapSituacao(situacao: string): EstadoProposta {
  const t = situacao.toLowerCase();
  if (t.includes("aguard")) return "em_analise";
  if (t.includes("cancel")) return "cancelada";
  if (t.includes("recus")) return "recusada";
  if (t.includes("suspens")) return "cancelada";
  if (t.includes("expir")) return "expirada";
  if (t.includes("quitad")) return "liberada";
  if (t.includes("ativo") || t.includes("averb")) return "liberada";
  return "em_analise";
}

// ---- Acompanhamento em tempo real (menuzinho de fases) --------------------
// Fases reais do fluxo servidor → banco → prefeitura, na ordem em que acontecem.
const FASES = [
  { key: "enviada", label: "Proposta enviada", hint: "Sua solicitação chegou ao banco." },
  { key: "aguardando_banco", label: "Aguardando aprovação", hint: "O banco está analisando a proposta." },
  { key: "aprovado_banco", label: "Aprovado pelo banco", hint: "O banco liberou o crédito e vai enviar o dinheiro." },
  { key: "aguardando_adf", label: "Aguardando ADF da prefeitura", hint: "A prefeitura vai confirmar o desconto em folha." },
  { key: "completa", label: "Autorização completa", hint: "Desconto confirmado em folha. Tudo certo!" },
] as const;

type FaseInfo = {
  ativo: number; // índice do passo em andamento (0..4)
  concluido: boolean; // true quando a autorização está 100% completa
  falha?: { passo: number; label: string; motivo?: string };
};

/** Proposta enriquecida com os campos crus do backend usados pelo acompanhamento. */
type PropostaView = Proposta & {
  situacaoRaw: string;
  folhaStatus?: "recebida" | "aplicada" | "falha";
  folhaMotivo?: string;
};

/** Deriva a fase atual do fluxo a partir da situação do banco + status da ADF na prefeitura. */
function faseChain(situacao: string, folhaStatus?: string, motivo?: string): FaseInfo {
  const s = situacao.toLowerCase();
  if (s.includes("cancel") || s.includes("recus") || s.includes("suspens"))
    return { ativo: 1, concluido: false, falha: { passo: 1, label: "Recusada pelo banco", motivo } };
  if (s.includes("expir"))
    return { ativo: 1, concluido: false, falha: { passo: 1, label: "Proposta expirada sem resposta" } };
  if (s.includes("aguard")) return { ativo: 1, concluido: false }; // aguardando aprovação do banco
  // Banco aprovou (Ativo/averbado/quitado) — agora depende da ADF da prefeitura.
  if (folhaStatus === "aplicada") return { ativo: 4, concluido: true };
  if (folhaStatus === "falha")
    return { ativo: 3, concluido: false, falha: { passo: 3, label: "ADF negada pela prefeitura", motivo } };
  return { ativo: 3, concluido: false }; // aprovado, aguardando ADF
}

export function ServidorPropostas() {
  const location = useLocation();
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Fonte única = backend (mesma que o banco lê). Poll a cada 5s pra ver a decisão do banco.
  // placeholderData mantem os cards visiveis entre refetches — sem isso, um
  // hiato entre polls (ex.: isolate frio revalidando KV) piscaria pra
  // "Voce ainda nao tem propostas" mesmo com propostas existindo.
  const q = useQuery({
    queryKey: ["servidor", "propostas"],
    queryFn: () => atlas.servidor.propostas(),
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
  });

  const propostas: PropostaView[] = useMemo(
    () =>
      (q.data?.propostas ?? []).map((p) => ({
        id: p.id,
        banco: p.banco,
        estado: mapSituacao(p.situacao),
        valor: p.valor,
        parcelas: p.parcelas,
        parcela: p.parcela,
        taxaAm: p.taxaAm,
        criadaEm: p.data,
        expiraEm: p.expira_em ?? undefined,
        situacaoRaw: p.situacao,
        folhaStatus: p.folhaStatus,
        folhaMotivo: p.folhaMotivo,
      })),
    [q.data],
  );

  // Scroll + destaque quando a URL tem hash (#9001234) — usado pelas notificacoes.
  useEffect(() => {
    const hash = location.hash?.replace(/^#/, "");
    if (!hash) return;
    let highlightTimer: ReturnType<typeof setTimeout> | undefined;
    const t = setTimeout(() => {
      const el = document.getElementById(`proposta-${hash}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(hash);
      highlightTimer = setTimeout(() => setHighlightId(null), 3000);
    }, 100);
    return () => {
      clearTimeout(t);
      if (highlightTimer) clearTimeout(highlightTimer);
    };
  }, [location.hash, propostas]);

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

function PropostaCard({ p, highlighted }: { p: PropostaView; highlighted?: boolean }) {
  const terminal = p.estado === "recusada" || p.estado === "expirada" || p.estado === "cancelada";
  const fase = faseChain(p.situacaoRaw, p.folhaStatus, p.folhaMotivo);
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

      <div style={{ marginTop: 18 }}>
        <FaseMenu fase={fase} />
      </div>
    </Card>
  );
}

/** "Menuzinho" vertical que mostra o processo em tempo real: enviada → aprovação do
 *  banco → ADF da prefeitura → autorização completa. Reflete o poll de 5s. */
function FaseMenu({ fase }: { fase: FaseInfo }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 10 }}>
        Acompanhamento em tempo real
      </div>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
        {FASES.map((f, i) => {
          const isFalha = fase.falha?.passo === i;
          const done = !isFalha && (fase.concluido || i < fase.ativo);
          const active = !isFalha && !fase.concluido && i === fase.ativo;
          const label = isFalha ? fase.falha!.label : f.label;
          const cor = isFalha ? "var(--rose-500)" : done ? "var(--emerald-500)" : active ? "var(--gold-500)" : "var(--bg-elev-2)";
          const corTexto = isFalha ? "var(--rose-500)" : active ? "var(--text)" : done ? "var(--text)" : "var(--text-muted)";
          const last = i === FASES.length - 1;
          return (
            <li key={f.key} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              {/* trilha: bolinha + linha vertical conectando */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", alignSelf: "stretch" }}>
                <div
                  style={{
                    width: 20, height: 20, borderRadius: "50%", background: cor,
                    color: isFalha || done ? "var(--navy-900)" : active ? "var(--navy-900)" : "var(--text-muted)",
                    display: "grid", placeItems: "center", fontWeight: 700, fontSize: ".68rem", flexShrink: 0,
                    boxShadow: active ? "0 0 0 4px color-mix(in srgb, var(--gold-500) 22%, transparent)" : "none",
                    animation: active ? "pulseFase 1.6s ease-in-out infinite" : "none",
                  }}
                >
                  {isFalha ? "!" : done ? "✓" : i + 1}
                </div>
                {!last ? (
                  <div style={{ width: 2, flex: 1, minHeight: 18, background: done ? "var(--emerald-500)" : "var(--border)", margin: "2px 0" }} />
                ) : null}
              </div>
              <div style={{ paddingBottom: last ? 0 : 12, minWidth: 0 }}>
                <div style={{ fontSize: ".82rem", fontWeight: active || isFalha ? 700 : done ? 600 : 400, color: corTexto }}>
                  {label}
                  {active ? <span style={{ marginLeft: 8, fontSize: ".66rem", fontWeight: 700, color: "var(--gold-500)" }}>● agora</span> : null}
                </div>
                <div style={{ fontSize: ".72rem", color: "var(--text-muted)", marginTop: 2 }}>
                  {isFalha ? (fase.falha!.motivo ? `Motivo: ${fase.falha!.motivo}` : "Entre em contato com o banco para resolver.") : FASES[i]!.hint}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
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
