import { useEffect, useRef, useState } from "react";
import { Button, Card, Input } from "@atlas/ui/web";
import { atlas } from "../lib/sdk";

interface Props {
  /** Texto curto explicando a acao que ativou o 2FA (ex.: "concluir pre-reserva"). */
  acao: string;
  /** Contexto opcional do recurso (aparece so no log/challenge). */
  recurso?: string;
  /** Mantido por compat; a verificacao e SEMPRE por email (sem SMS). */
  canal?: "email";
  /** Chamado APOS o codigo ser validado no backend. Recebe o code digitado. */
  onConfirm: (code: string) => void | Promise<void>;
  /** Quando o usuario cancela. */
  onCancel: () => void;
}

/**
 * Confirmacao em duas etapas por email, REAL. Ao abrir, pede ao backend um codigo
 * de 6 digitos — que e enviado para o e-mail CADASTRADO de quem esta operando — e
 * mostra para qual e-mail foi. O usuario digita o codigo; a validacao acontece no
 * backend (one-time). Sem provedor de e-mail, cai no modo demo (codigo na tela).
 */
export function TwoFactorModal({ acao, recurso, onConfirm, onCancel }: Props) {
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [destino, setDestino] = useState<string>("");
  const [codigoDemo, setCodigoDemo] = useState<string>("");
  const [enviando, setEnviando] = useState(true);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function solicitar() {
    setEnviando(true);
    setError(null);
    setCode("");
    try {
      const r = await atlas.confirmacao.solicitar(acao, recurso);
      setChallengeId(r.challengeId);
      setDestino(r.destino || r.emailMascarado);
      setCodigoDemo(r.enviado ? "" : r.codigoDemo);
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao enviar o codigo");
    } finally {
      setEnviando(false);
    }
  }

  useEffect(() => {
    void solicitar();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirmar() {
    if (code.replace(/\D/g, "").length !== 6) {
      setError("O código precisa ter 6 dígitos.");
      return;
    }
    if (!challengeId) {
      setError("Solicite um novo código.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await atlas.confirmacao.verificar(challengeId, code.replace(/\D/g, ""));
      await onConfirm(code.replace(/\D/g, ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Codigo invalido");
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Verificação em duas etapas"
      style={{
        position: "fixed",
        inset: 0,
        background: "color-mix(in srgb, var(--navy-900) 70%, transparent)",
        display: "grid",
        placeItems: "center",
        zIndex: 200,
        padding: 16,
      }}
    >
      <Card style={{ maxWidth: 420, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 28 }}>🔐</span>
          <div>
            <h3 style={{ margin: 0 }}>Confirmação em duas etapas</h3>
            <p style={{ margin: "4px 0 0", fontSize: ".82rem", color: "var(--text-muted)" }}>
              Para {acao}, precisamos validar sua identidade.
            </p>
          </div>
        </div>

        <p style={{ fontSize: ".88rem", color: "var(--text-muted)", margin: "12px 0" }}>
          {enviando ? (
            "Enviando o codigo de 6 digitos…"
          ) : destino ? (
            <>Enviamos um código de 6 dígitos para <b style={{ color: "var(--text)" }}>{destino}</b>. Ele expira em 10 minutos.</>
          ) : (
            "Digite o codigo de 6 digitos."
          )}
        </p>

        {codigoDemo ? (
          <div style={{ margin: "0 0 12px", padding: "8px 12px", borderRadius: 8, border: "1px dashed var(--gold-500)", background: "color-mix(in srgb, var(--gold-500) 10%, transparent)", fontSize: ".8rem", color: "var(--text)" }}>
            <b>Modo demonstracao</b> (sem provedor de e-mail configurado): seu codigo e{" "}
            <b style={{ fontFamily: "var(--font-mono)", letterSpacing: 2 }}>{codigoDemo}</b>
          </div>
        ) : null}

        <Input
          ref={inputRef}
          label="Código de verificação"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          disabled={enviando}
        />

        {error ? (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid var(--danger-500)",
              background: "color-mix(in srgb, var(--danger-500) 10%, transparent)",
              fontSize: ".88rem",
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
          <button
            type="button"
            onClick={() => void solicitar()}
            disabled={enviando || submitting}
            style={{ background: "none", border: "none", color: "var(--accent)", cursor: enviando ? "default" : "pointer", fontSize: ".82rem", padding: 0 }}
          >
            Reenviar codigo
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" onClick={onCancel} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={confirmar} disabled={submitting || enviando || code.length < 6}>
              {submitting ? "Validando…" : "Confirmar"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
