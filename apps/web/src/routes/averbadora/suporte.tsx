import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, FormGrid, TextField, TextareaField } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

/** Editor da info de suporte que aparece no app/web do servidor
 *  em Conta > Suporte. E-mail, WhatsApp, horario e frase de abertura. */
export function AverbadoraSuporte() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "suporte-config"], queryFn: () => atlas.admin.suporteConfig() });

  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [horario, setHorario] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [okAt, setOkAt] = useState<Date | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!q.data) return;
    setEmail(q.data.email);
    setWhatsapp(q.data.whatsapp);
    setHorario(q.data.horario);
    setMensagem(q.data.mensagem);
  }, [q.data]);

  const salvar = useMutation({
    mutationFn: () => atlas.admin.suporteSave({ email, whatsapp, horario, mensagem }),
    onSuccess: () => {
      setOkAt(new Date()); setErro(null);
      qc.invalidateQueries({ queryKey: ["admin", "suporte-config"] });
    },
    onError: (e) => setErro((e as Error).message || "Nao foi possivel salvar."),
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>Averbadora</span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Suporte</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
          Informações que aparecem para o servidor quando ele clica em Suporte na tela de conta. Muda aqui, aparece lá — sem redeploy.
        </p>
      </header>

      <Card>
        {q.isPending ? (
          <div style={{ color: "var(--text-muted)" }}>Carregando…</div>
        ) : q.isError ? (
          <div style={{ color: "var(--danger-500)" }}>Erro ao carregar configuração.</div>
        ) : (
          <>
            <FormGrid cols={2}>
              <TextField
                label="E-mail de suporte"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="suporte@atlasaverbadora.com.br"
                required
              />
              <TextField
                label="WhatsApp (só dígitos, com DDI+DDD)"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
                placeholder="5511999999999"
                inputMode="numeric"
              />
            </FormGrid>
            <div style={{ marginTop: 12 }}>
              <TextField
                label="Horário de atendimento"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                placeholder="segunda a sexta, 09h às 18h"
              />
            </div>
            <div style={{ marginTop: 12 }}>
              <TextareaField
                label="Frase de abertura"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                rows={2}
                placeholder="Fale com a gente:"
              />
            </div>

            {erro ? (
              <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--danger-500)", background: "color-mix(in srgb, var(--danger-500) 12%, transparent)", fontSize: ".88rem" }}>
                {erro}
              </div>
            ) : null}

            <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
              <Button onClick={() => salvar.mutate()} disabled={salvar.isPending || !email.trim()}>
                {salvar.isPending ? "Salvando…" : "Salvar alterações"}
              </Button>
              {okAt ? (
                <span style={{ color: "var(--emerald-500)", fontSize: 13 }}>
                  ✓ Salvo em {okAt.toLocaleTimeString("pt-BR")}
                </span>
              ) : null}
            </div>
          </>
        )}
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: "1rem" }}>Prévia (como o servidor vai ver)</h3>
        <div style={{ padding: 14, borderRadius: 10, background: "var(--bg-elev-2)", fontSize: ".92rem" }}>
          <p style={{ marginTop: 0 }}>{mensagem || "Fale com a gente:"}</p>
          <ul style={{ paddingLeft: 20, marginBottom: 0, lineHeight: 1.7 }}>
            {email ? (
              <li>
                E-mail: <span style={{ color: "var(--accent)" }}>{email}</span>
              </li>
            ) : null}
            {whatsapp ? (
              <li>
                WhatsApp: <span style={{ color: "var(--accent)" }}>{formatWhatsappBR(whatsapp)}</span>
              </li>
            ) : null}
            {horario ? <li>Atendimento: {horario}.</li> : null}
          </ul>
        </div>
      </Card>
    </div>
  );
}

function formatWhatsappBR(w: string): string {
  const d = w.replace(/\D/g, "");
  const semDdi = d.startsWith("55") ? d.slice(2) : d;
  if (semDdi.length === 11) return `(${semDdi.slice(0, 2)}) ${semDdi.slice(2, 7)}-${semDdi.slice(7)}`;
  if (semDdi.length === 10) return `(${semDdi.slice(0, 2)}) ${semDdi.slice(2, 6)}-${semDdi.slice(6)}`;
  return w;
}
