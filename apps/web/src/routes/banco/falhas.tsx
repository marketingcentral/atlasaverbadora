import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, FormActions, Pill, TextareaField } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

/** Fluxo F1-falha: averbadora reporta falha na ADF, banco recebe pendencia
 *  aqui e escolhe uma das 3 acoes: reenviar / cancelar / cobranca direta. */

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

type Acao = "reenviar" | "cancelar" | "cobranca_direta";

const ACAO_LABEL: Record<Acao, string> = {
  reenviar: "Reenviar (averbadora tenta de novo)",
  cancelar: "Cancelar contrato",
  cobranca_direta: "Cobrança direta (fora da folha)",
};

const ACAO_DESCR: Record<Acao, string> = {
  reenviar: "Volta ao estado anterior; averbadora aplica em folha novamente na próxima competência.",
  cancelar: "Contrato encerrado. Servidor liberado. Banco resolve o saldo por fora.",
  cobranca_direta: "Contrato existe mas sai da folha. Banco assume cobrança direta com o servidor.",
};

export function BancoFalhas() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["banco", "contratos-falha"],
    queryFn: () => atlas.banco.listContratosFalha(),
    refetchInterval: 15_000,
  });

  const [tratando, setTratando] = useState<{ adf: string; nome: string } | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Portal do banco
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem", letterSpacing: "-0.02em" }}>
          Falhas em folha
        </h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0" }}>
          Contratos que a averbadora tentou aplicar em folha mas rejeitou (motivo geralmente vem no email).
          Escolha uma ação para cada — <b>a margem do servidor já foi liberada</b>.
        </p>
      </header>

      {q.isLoading ? (
        <div style={{ color: "var(--text-muted)" }}>Carregando...</div>
      ) : (q.data?.contratos ?? []).length === 0 ? (
        <Card>
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✓</div>
            <div style={{ fontWeight: 700, color: "var(--text)" }}>Nenhuma falha pendente</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              Quando a averbadora reportar falha em uma ADF sua, o contrato aparece aqui pra você decidir.
            </div>
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(q.data?.contratos ?? []).map((c) => (
            <Card key={c.adf}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--danger-500)", textTransform: "uppercase" }}>
                    Falha em folha
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{c.nome}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                    ADF <code>{c.adf}</code> · matrícula <code>{c.matricula}</code> · CPF <code>{c.cpfMasked}</code>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <Pill variant="expirado">Ação necessária</Pill>
                  <div style={{ fontSize: 13, color: "var(--text)", marginTop: 8 }}>
                    <b>{fmtBRL(c.valorParcela)}</b> × {c.totalParcelas}
                  </div>
                </div>
              </div>
              {c.folhaMotivo ? (
                <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "color-mix(in srgb, var(--danger-500) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--danger-500) 30%, transparent)", fontSize: 13, color: "var(--text)" }}>
                  <b style={{ color: "var(--danger-500)" }}>Motivo:</b> {c.folhaMotivo}
                </div>
              ) : null}
              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                <Button size="sm" onClick={() => setTratando({ adf: c.adf, nome: c.nome })}>Tratar falha</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tratando ? (
        <TratarFalhaModal
          adf={tratando.adf}
          nome={tratando.nome}
          onClose={() => setTratando(null)}
          onDone={() => {
            setTratando(null);
            qc.invalidateQueries({ queryKey: ["banco", "contratos-falha"] });
            qc.invalidateQueries({ queryKey: ["banco", "propostas-api"] });
          }}
        />
      ) : null}
    </div>
  );
}

function TratarFalhaModal({
  adf, nome, onClose, onDone,
}: {
  adf: string; nome: string; onClose: () => void; onDone: () => void;
}) {
  const [acao, setAcao] = useState<Acao>("reenviar");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const tratar = useMutation({
    mutationFn: () => atlas.banco.tratarFalha(adf, acao, motivo.trim()),
    onSuccess: () => onDone(),
    onError: (e) => setErro((e as Error).message || "Falha ao registrar decisão"),
  });
  return (
    <div onClick={tratar.isPending ? undefined : onClose} style={{
      position: "fixed", inset: 0, background: "rgba(10,22,40,.6)",
      display: "grid", placeItems: "center", zIndex: 100, backdropFilter: "blur(6px)",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-elev)", border: "1px solid var(--border-strong)",
        borderRadius: 14, padding: 24, maxWidth: 560, width: "calc(100% - 48px)",
        display: "flex", flexDirection: "column", gap: 16, boxShadow: "var(--shadow-lg)",
      }}>
        <div>
          <h3 style={{ margin: 0 }}>Tratar falha em folha</h3>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            {nome} · ADF <code>{adf}</code>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Ação</label>
          {(["reenviar", "cancelar", "cobranca_direta"] as Acao[]).map((a) => {
            const on = acao === a;
            return (
              <button
                key={a}
                type="button"
                onClick={() => setAcao(a)}
                style={{
                  textAlign: "left", padding: 12, borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                  background: on ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
                  color: "var(--text)",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14 }}>{ACAO_LABEL[a]}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{ACAO_DESCR[a]}</div>
              </button>
            );
          })}
        </div>

        <TextareaField
          label="Motivo / observação"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          hint="Vai pro histórico do contrato e pra notificação do servidor. Mínimo 3 caracteres."
        />

        {erro ? <div style={{ fontSize: 13, color: "var(--danger-500)" }}>{erro}</div> : null}

        <FormActions>
          <Button variant="ghost" type="button" onClick={onClose} disabled={tratar.isPending}>Cancelar</Button>
          <Button
            type="button"
            disabled={motivo.trim().length < 3 || tratar.isPending}
            onClick={() => tratar.mutate()}
          >
            {tratar.isPending ? "Registrando..." : "Confirmar decisão"}
          </Button>
        </FormActions>
      </div>
    </div>
  );
}
