import { useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Pill } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

const SITUACAO: Record<string, { label: string; variant: "pendente" | "aceita" | "averbado" | "rejeitada" }> = {
  nova: { label: "Em análise", variant: "pendente" },
  contatado: { label: "Em contato", variant: "aceita" },
  fechado: { label: "Ativa", variant: "averbado" },
  cancelado: { label: "Cancelada", variant: "rejeitada" },
};

/** Máscara de telefone: 48991073451 -> (48) 99107-3451. */
function maskPhone(v: string): string {
  const d = (v || "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v || "—";
}

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

  // Anexo do contrato — pré-requisito pra ativar o plano (mesma regra do CCB do banco).
  const fileRef = useRef<HTMLInputElement>(null);
  const anexar = useMutation({
    mutationFn: (file: File) => atlas.admin.uploadContratoTelemedicina(id!, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "telemedicina", "cotacoes"] }),
  });
  // Anexou o arquivo errado? Remove e volta a bloquear a ativação.
  const remover = useMutation({
    mutationFn: () => atlas.admin.removerContratoTelemedicina(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "telemedicina", "cotacoes"] }),
  });

  const busy = ativar.isPending || cancelar.isPending || anexar.isPending || remover.isPending;
  const st = cot ? (SITUACAO[cot.situacao] ?? { label: cot.situacao, variant: "pendente" as const }) : null;
  const encerrada = cot?.situacao === "fechado" || cot?.situacao === "cancelado";
  const temContrato = !!cot?.temContrato;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>
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

          <section style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 14, padding: 28 }}>
            <h2 style={{ margin: "0 0 20px", fontSize: "1.15rem" }}>Dados do servidor</h2>
            {/* Telefone em destaque — é o dado que a averbadora usa pra formalizar. */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginBottom: 24 }}>
              <div style={{ flex: "1 1 240px", background: "color-mix(in srgb, var(--emerald-500) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--emerald-500) 30%, transparent)", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700 }}>Telefone para contato</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{maskPhone(cot.telefone)}</div>
              </div>
              <div style={{ flex: "1 1 240px", background: "var(--bg-base, transparent)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700 }}>Plano</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 6, lineHeight: 1.4 }}>Telemedicina · 12 meses · R$ 50,00/mês</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Descontado da margem de empréstimo consignado</div>
              </div>
            </div>
            <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px 32px", margin: 0, fontSize: 15 }}>
              <Field label="E-mail" value={cot.email || "—"} />
              <Field label="CPF" value={cot.cpfMasked || "—"} />
              <Field label="Matrícula" value={cot.matricula} />
              <Field label="Prefeitura" value={cot.prefeitura} />
              <Field label="Solicitado em" value={new Date(cot.criadoEm).toLocaleString("pt-BR")} />
            </dl>
          </section>

          {/* PRÓXIMO PASSO — mesmo layout do anexo de contrato do banco (empréstimo). */}
          {!encerrada && (
            <section style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 14, padding: 24 }}>
              <span style={{ fontSize: 11, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
                Próximo passo
              </span>
              <p style={{ margin: "8px 0 16px", fontSize: 14, color: "var(--text-muted)" }}>
                {temContrato
                  ? "Contrato anexado. Você pode ativar o plano ou atualizar o arquivo antes."
                  : "Anexe o contrato do plano (PDF, DOCX, XLS ou XLSX, até 15 MB) para liberar a ativação."}
              </p>

              {temContrato && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                  border: "1px solid color-mix(in srgb, var(--emerald-500) 35%, transparent)",
                  background: "color-mix(in srgb, var(--emerald-500) 8%, transparent)",
                  borderRadius: 10, padding: "12px 16px", marginBottom: 16,
                }}>
                  <span style={{ fontSize: 20 }}>📄</span>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>Contrato atual</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{cot.contratoNome ?? "contrato"}</div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      const blob = await atlas.admin.fetchContratoTelemedicinaBlob(cot.id);
                      const url = URL.createObjectURL(blob);
                      window.open(url, "_blank");
                      setTimeout(() => URL.revokeObjectURL(url), 60_000);
                    }}
                  >
                    Abrir arquivo
                  </Button>
                  <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
                    Atualizar contrato
                  </Button>
                  <Button variant="ghost" onClick={() => remover.mutate()} disabled={busy}>
                    {remover.isPending ? "Removendo…" : "Remover"}
                  </Button>
                </div>
              )}

              {/* input escondido — acionado pelos botões acima (mesma UX do banco) */}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.xls,.xlsx"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) anexar.mutate(f);
                  e.target.value = "";
                }}
              />

              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
                  {anexar.isPending ? "Enviando…" : temContrato ? "Atualizar contrato →" : "Anexar contrato →"}
                </Button>
                <Button onClick={() => ativar.mutate()} disabled={busy || !temContrato}>
                  {ativar.isPending ? "Ativando…" : "Ativar Plano →"}
                </Button>
                <Button variant="ghost" onClick={() => cancelar.mutate()} disabled={busy} style={{ marginLeft: "auto" }}>
                  {cancelar.isPending ? "Cancelando…" : "Recusar"}
                </Button>
              </div>
              {anexar.isError && (
                <p style={{ color: "var(--danger, #dc2626)", fontSize: 13, marginTop: 10 }}>
                  {(anexar.error as Error)?.message ?? "Falha ao anexar o contrato."}
                </p>
              )}
            </section>
          )}
          {encerrada && temContrato && (
            <section style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 14, padding: 24, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>📄</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Contrato do plano</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{cot.contratoNome ?? "contrato"}</div>
              </div>
              <Button
                variant="ghost"
                onClick={async () => {
                  const blob = await atlas.admin.fetchContratoTelemedicinaBlob(cot.id);
                  const url = URL.createObjectURL(blob);
                  window.open(url, "_blank");
                  setTimeout(() => URL.revokeObjectURL(url), 60_000);
                }}
              >
                Abrir arquivo
              </Button>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt style={{ color: "var(--text-muted)", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 700 }}>{label}</dt>
      <dd style={{ margin: "4px 0 0", fontSize: 15 }}>{value}</dd>
    </div>
  );
}
