import { useEffect, useRef, useState } from "react";
import { Button, Card, Input } from "@atlas/ui/web";
import { atlas } from "../lib/sdk";

interface Props {
  /** Titulo do modal, ex.: "Excluir banco". */
  titulo: string;
  /** O que esta sendo excluido, ex.: "Banco Atlas". Aparece no aviso. */
  alvo: string;
  /** Codigo da acao no backend, ex.: "excluir_banco". */
  acao: string;
  /** Id do recurso como string, ex.: String(banco.id). */
  recurso: string;
  /** Rotulo do botao de confirmacao. */
  confirmarLabel?: string;
  /** Executa a exclusao com o desafio validado. Pode lancar (codigo errado). */
  onConfirm: (challengeId: string, codigo: string) => Promise<void>;
  onClose: () => void;
}

/**
 * Step-up por email para acoes destrutivas. Solicita um codigo ao backend
 * (enviado ao email do operador; no modo demo o codigo e revelado na tela),
 * o usuario digita e confirma. Espelha o 2FA de acesso dos servidores.
 */
export function ConfirmDeleteModal({ titulo, alvo, acao, recurso, confirmarLabel = "Excluir definitivamente", onConfirm, onClose }: Props) {
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [emailMascarado, setEmailMascarado] = useState<string>("");
  const [codigoDemo, setCodigoDemo] = useState<string>("");
  const [code, setCode] = useState("");
  const [enviando, setEnviando] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function solicitar() {
    setEnviando(true);
    setError(null);
    setCode("");
    try {
      const r = await atlas.admin.solicitarConfirmacao(acao, recurso);
      setChallengeId(r.challengeId);
      setEmailMascarado(r.emailMascarado);
      setCodigoDemo(r.codigoDemo);
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao enviar codigo");
    } finally {
      setEnviando(false);
    }
  }

  useEffect(() => {
    void solicitar();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !confirmando) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirmar() {
    if (!challengeId) return;
    if (code.replace(/\D/g, "").length !== 6) { setError("O codigo precisa ter 6 digitos."); return; }
    setConfirmando(true);
    setError(null);
    try {
      await onConfirm(challengeId, code.replace(/\D/g, ""));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Codigo invalido");
      setConfirmando(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={titulo}
      style={{ position: "fixed", inset: 0, background: "color-mix(in srgb, var(--navy-900) 70%, transparent)", display: "grid", placeItems: "center", zIndex: 200, padding: 16 }}>
      <Card style={{ maxWidth: 440, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: 26 }}>🔐</span>
          <div>
            <h3 style={{ margin: 0 }}>{titulo}</h3>
            <p style={{ margin: "4px 0 0", fontSize: ".82rem", color: "var(--text-muted)" }}>
              Acao irreversivel — exige confirmacao por email.
            </p>
          </div>
        </div>

        <div style={{ margin: "12px 0", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--danger-500)", background: "color-mix(in srgb, var(--danger-500) 10%, transparent)", fontSize: ".88rem" }}>
          Voce esta prestes a excluir <b>{alvo}</b>. Isso nao pode ser desfeito.
        </div>

        <p style={{ fontSize: ".88rem", color: "var(--text-muted)", margin: "12px 0 8px" }}>
          {enviando ? "Enviando codigo…" : emailMascarado ? <>Enviamos um codigo para <b>{emailMascarado}</b>. Expira em 10 minutos.</> : ""}
        </p>

        {codigoDemo ? (
          <div style={{ margin: "0 0 12px", padding: "8px 12px", borderRadius: 8, border: "1px dashed var(--gold-500)", background: "color-mix(in srgb, var(--gold-500) 10%, transparent)", fontSize: ".8rem", color: "var(--text)" }}>
            <b>Modo demonstracao</b> (sem provedor de email): seu codigo e <b style={{ fontFamily: "var(--font-mono)", letterSpacing: 2 }}>{codigoDemo}</b>
          </div>
        ) : null}

        <Input
          ref={inputRef}
          label="Codigo de verificacao"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          disabled={enviando}
        />

        {error ? (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--danger-500)", background: "color-mix(in srgb, var(--danger-500) 10%, transparent)", fontSize: ".88rem" }}>
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
          <button type="button" onClick={() => void solicitar()} disabled={enviando || confirmando}
            style={{ background: "none", border: "none", color: "var(--accent)", cursor: enviando ? "default" : "pointer", fontSize: ".82rem", padding: 0 }}>
            Reenviar codigo
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" onClick={onClose} disabled={confirmando}>Cancelar</Button>
            <Button variant="ghost" onClick={confirmar} disabled={confirmando || enviando || code.length < 6}
              style={{ borderColor: "var(--danger-500)", color: "var(--danger-500)" }}>
              {confirmando ? "Excluindo…" : confirmarLabel}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
