import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Pill } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

const SITUACAO: Record<string, { label: string; variant: "pendente" | "aceita" | "averbado" | "expirado" }> = {
  nova: { label: "Em análise", variant: "pendente" },
  contatado: { label: "Em contato", variant: "aceita" },
  fechado: { label: "Plano ativo", variant: "averbado" },
  cancelado: { label: "Cancelada", variant: "expirado" },
};

/** Detalhe de uma cotação de telemedicina — mesma estrutura de uma proposta de
 *  empréstimo consignado em análise: cabeçalho + status + dados do servidor +
 *  ações (Ativar Plano / Cancelar). Ativar cria um contrato ativo de 12 meses. */
export function AverbadoraTelemedicinaCotacao() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();

  const cotacoesQ = useQuery({
    queryKey: ["admin", "telemedicina", "cotacoes"],
    queryFn: () => atlas.admin.listTelemedicinaCotacoes(),
  });
  const cot = cotacoesQ.data?.cotacoes.find((c) => c.id === id);

  const ativar = useMutation({
    mutationFn: () => atlas.admin.ativarCotacaoTelemedicina(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "telemedicina", "cotacoes"] }); nav("/averbadora/telemedicina"); },
  });
  const cancelar = useMutation({
    mutationFn: () => atlas.admin.cancelarCotacaoTelemedicina(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "telemedicina", "cotacoes"] }); nav("/averbadora/telemedicina"); },
  });

  const busy = ativar.isPending || cancelar.isPending;
  const st = cot ? (SITUACAO[cot.situacao] ?? { label: cot.situacao, variant: "pendente" as const }) : null;
  const encerrada = cot?.situacao === "fechado" || cot?.situacao === "cancelado";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
      <button
        type="button"
        onClick={() => nav("/averbadora/telemedicina")}
        style={{ background: "none", border: "none", color: "var(--emerald-500)", fontWeight: 700, cursor: "pointer", fontSize: 14, alignSelf: "flex-start", padding: 0 }}
      >
        ‹ Voltar para Telemedicina
      </button>

      {cotacoesQ.isLoading ? (
        <p style={{ color: "var(--text-muted)" }}>Carregando…</p>
      ) : !cot || !st ? (
        <p style={{ color: "var(--text-muted)" }}>Cotação não encontrada.</p>
      ) : (
        <>
          <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
                Cotação de Telemedicina
              </span>
              <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>{cot.nome}</h1>
            </div>
            {/* Indicador ao lado: ativa / cancelada / em análise */}
            <Pill variant={st.variant}>{st.label}</Pill>
          </header>

          <section style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: 24 }}>
            <h2 style={{ margin: "0 0 16px", fontSize: "1.1rem" }}>Dados do servidor</h2>
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "12px 20px", margin: 0, fontSize: 15 }}>
              <dt style={{ color: "var(--text-muted)" }}>Telefone</dt>
              <dd style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>{cot.telefone || "—"}</dd>
              <dt style={{ color: "var(--text-muted)" }}>E-mail</dt>
              <dd style={{ margin: 0 }}>{cot.email || "—"}</dd>
              <dt style={{ color: "var(--text-muted)" }}>CPF</dt>
              <dd style={{ margin: 0 }}>{cot.cpfMasked || "—"}</dd>
              <dt style={{ color: "var(--text-muted)" }}>Matrícula</dt>
              <dd style={{ margin: 0 }}>{cot.matricula}</dd>
              <dt style={{ color: "var(--text-muted)" }}>Prefeitura</dt>
              <dd style={{ margin: 0 }}>{cot.prefeitura}</dd>
              <dt style={{ color: "var(--text-muted)" }}>Solicitado em</dt>
              <dd style={{ margin: 0 }}>{new Date(cot.criadoEm).toLocaleString("pt-BR")}</dd>
              <dt style={{ color: "var(--text-muted)" }}>Plano</dt>
              <dd style={{ margin: 0 }}>Telemedicina · 12 meses · R$ 50,00/mês (margem de empréstimo consignado)</dd>
            </dl>
          </section>

          {!encerrada && (
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <Button variant="ghost" onClick={() => cancelar.mutate()} disabled={busy}>
                {cancelar.isPending ? "Cancelando…" : "Cancelar"}
              </Button>
              <Button onClick={() => ativar.mutate()} disabled={busy}>
                {ativar.isPending ? "Ativando…" : "Ativar Plano"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
