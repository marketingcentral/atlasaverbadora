import { useEffect, useState } from "react";
import { Card } from "@atlas/ui/web";
import { useMutation, useQuery } from "@tanstack/react-query";
import { atlas } from "../../lib/sdk";
import type { MatriculaInfo } from "../../lib/matricula-data";
import { readActiveMatricula, STORAGE_KEY_META, STORAGE_KEY_ID } from "../../lib/matricula-data";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function ServidorSaude() {
  const [info, setInfo] = useState<MatriculaInfo | null>(() => readActiveMatricula());

  // Cotação de telemedicina: 3 estados no banner — Solicitar / Em análise / Plano Ativo.
  const [showCotar, setShowCotar] = useState(false);
  const minhasCotacoesQ = useQuery({
    queryKey: ["servidor", "telemedicina", "minhas-cotacoes"],
    queryFn: () => atlas.servidor.minhasCotacoesTelemedicina(),
  });
  const cotacoes = minhasCotacoesQ.data?.cotacoes ?? [];
  const cotacaoPendente = cotacoes.some((c) => c.situacao === "nova" || c.situacao === "contatado");
  const planoAtivo = cotacoes.find((c) => c.situacao === "fechado");
  const plano = planoAtivo?.ativadoEm
    ? (() => {
        const ini = new Date(planoAtivo.ativadoEm).getTime();
        const fim = ini + 12 * 30 * 24 * 3600 * 1000;
        const agora = Date.now();
        return {
          pct: Math.max(0, Math.min(1, (agora - ini) / (fim - ini))),
          restante: Math.max(0, Math.ceil((fim - agora) / (30 * 24 * 3600 * 1000))),
        };
      })()
    : null;
  const cotacao = useMutation({
    mutationFn: () => atlas.servidor.solicitarCotacaoTelemedicina({ matricula: info?.matricula }),
    onSuccess: () => { setShowCotar(false); minhasCotacoesQ.refetch(); },
  });
  // Texto oficial do termo — vem da tela Termos de aceite da averbadora, com as
  // variáveis já substituídas. Editar lá reflete aqui sem novo deploy.
  const termoQ = useQuery({
    queryKey: ["servidor", "termo", "telemedicina"],
    queryFn: () => atlas.servidor.getTermo("telemedicina", { meses: 12, valor: "R$ 50,00", banco: "Banco Atlas" }),
    enabled: showCotar,
  });

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
            Plano mínimo de 12 meses
          </span>
          {plano ? (
            <div style={{ background: "rgba(255,255,255,.18)", borderRadius: 10, padding: 14, minWidth: 240 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800 }}>
                <span>✓ Plano Ativo</span>
                <span>faltam {plano.restante} meses</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,.25)", overflow: "hidden", marginTop: 8 }}>
                <div style={{ width: `${plano.pct * 100}%`, height: "100%", background: "white" }} />
              </div>
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 6 }}>
                Plano de 12 meses · {Math.round(plano.pct * 100)}% concluído
              </div>
            </div>
          ) : cotacaoPendente ? (
            <span style={{
              padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: "rgba(255,255,255,.18)", color: "white", textAlign: "center", maxWidth: 280,
            }}>
              Cotação em análise. Em breve, a equipe da Atlas entrará em contato com você.
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setShowCotar(true)}
              style={{
                padding: "10px 18px", borderRadius: 10,
                background: "white", color: "var(--emerald-600, #059669)",
                fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,.15)",
              }}
            >
              Solicitar Cotação
            </button>
          )}
        </div>
      </article>

      {showCotar && (
        <div
          onClick={() => !cotacao.isPending && setShowCotar(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 16, padding: 24, maxWidth: 460, width: "100%" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: "1.25rem" }}>
              {termoQ.data?.termo.titulo ?? "Telemedicina — Solicitar Cotação"}
            </h3>
            {/* Corpo oficial do termo (averbadora). Fallback só se a rede falhar. */}
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 16px", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
              {termoQ.data?.termo.corpo
                ?? "Consultas online 24h com médicos parceiros. Plano com compromisso mínimo de 12 meses. Ao solicitar a cotação, o time da Atlas recebe seus dados de contato e entra em contato com você para formalizar a solicitação."}
            </p>
            {cotacao.isError && (
              <p style={{ color: "var(--danger, #dc2626)", fontSize: 13 }}>Não foi possível enviar. Tente novamente.</p>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowCotar(false)}
                disabled={cotacao.isPending}
                style={{ padding: "10px 16px", borderRadius: 10, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border-strong)", fontWeight: 600, cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => cotacao.mutate()}
                disabled={cotacao.isPending}
                style={{ padding: "10px 18px", borderRadius: 10, background: "var(--emerald-500)", color: "white", border: "none", fontWeight: 700, cursor: "pointer" }}
              >
                {cotacao.isPending ? "Enviando…" : "Solicitar Cotação"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                Compras em parceiros de saúde são debitadas do seu limite. Fatura vem na folha.
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
