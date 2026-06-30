import { useEffect, useRef, useState } from "react";
import { Button, Card, Input } from "@atlas/ui/web";

interface Props {
  /** Texto curto explicando a acao que ativou o 2FA (ex.: "concluir pre-reserva"). */
  acao: string;
  /** Canal mockado pra exibir no UI. */
  canal?: "email" | "sms" | "ambos";
  /** Quando o usuario confirma o codigo. Recebe o code digitado. */
  onConfirm: (code: string) => void | Promise<void>;
  /** Quando o usuario cancela. */
  onCancel: () => void;
}

const MASCARADO = {
  email: "ana.car****@palhoca.sc.gov.br",
  sms: "(48) 9****-3210",
};

export function TwoFactorModal({ acao, canal = "ambos", onConfirm, onCancel }: Props) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onCancel();
    };
    window.addEventListener("keydown", onKey);
    // Auto-focus do input ao abrir.
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, submitting]);

  async function confirmar() {
    if (code.replace(/\D/g, "").length !== 6) {
      setError("O codigo precisa ter 6 digitos.");
      return;
    }
    setSubmitting(true);
    setError(null);
    // Mock: qualquer codigo de 6 digitos passa.
    await new Promise((r) => setTimeout(r, 800));
    await onConfirm(code);
    setSubmitting(false);
  }

  const canalLabel =
    canal === "email"
      ? `Enviamos um codigo para ${MASCARADO.email}`
      : canal === "sms"
        ? `Enviamos um codigo por SMS para ${MASCARADO.sms}`
        : `Enviamos um codigo para ${MASCARADO.email} e por SMS para ${MASCARADO.sms}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Verificacao em duas etapas"
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
            <h3 style={{ margin: 0 }}>Confirmacao em duas etapas</h3>
            <p style={{ margin: "4px 0 0", fontSize: ".82rem", color: "var(--text-muted)" }}>
              Para {acao}, precisamos validar sua identidade.
            </p>
          </div>
        </div>

        <p style={{ fontSize: ".88rem", color: "var(--text-muted)", margin: "12px 0" }}>
          {canalLabel}. O codigo expira em 10 minutos.
        </p>

        <Input
          ref={inputRef}
          label="Codigo de verificacao"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
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

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={submitting || code.length < 6}>
            {submitting ? "Validando…" : "Confirmar"}
          </Button>
        </div>

        <p style={{ fontSize: ".78rem", color: "var(--text-dim)", marginTop: 14, textAlign: "center" }}>
          Nao recebeu? Aguarde 60 segundos e tente novamente.
        </p>
      </Card>
    </div>
  );
}
