import { useEffect, useState } from "react";
import { Button, Card, Input } from "@atlas/ui/web";
import { atlas } from "../lib/sdk";

/** Componente reutilizavel de gerenciamento de 2FA. Mostra:
 *  - Status atual (ativado / desativado)
 *  - Botao "Ativar" que dispara /me/2fa/setup e mostra o secret + link otpauth
 *  - Campo pra colar o codigo e chamar /confirm
 *  - Se ja ativo: botao "Desativar" que pede codigo TOTP atual
 *
 *  QR code fica fora de escopo desta fatia (evita dep externa). O secret e
 *  mostrado em texto pra digitar manualmente no autenticador, e um link
 *  otpauth:// que abre o app diretamente em mobile. */
export function GerenciarDoisFA() {
  const [status, setStatus] = useState<{ enabled: boolean; account: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<{ secret: string; otpauth: string } | null>(null);
  const [code, setCode] = useState("");
  const [modo, setModo] = useState<"idle" | "setup" | "disable">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const s = await atlas.me.twoFactor.status();
      setStatus(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar status");
    } finally { setLoading(false); }
  }

  async function iniciarSetup() {
    setError(null); setBusy(true);
    try {
      const r = await atlas.me.twoFactor.setup();
      setSetupData({ secret: r.secret, otpauth: r.otpauth });
      setModo("setup");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao iniciar setup");
    } finally { setBusy(false); }
  }

  async function confirmar() {
    setError(null); setBusy(true);
    try {
      await atlas.me.twoFactor.confirm(code.replace(/\D/g, ""));
      setSetupData(null);
      setCode("");
      setModo("idle");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Codigo invalido");
    } finally { setBusy(false); }
  }

  async function desativar() {
    setError(null); setBusy(true);
    try {
      await atlas.me.twoFactor.disable(code.replace(/\D/g, ""));
      setCode("");
      setModo("idle");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Codigo invalido");
    } finally { setBusy(false); }
  }

  function cancelar() {
    setSetupData(null);
    setCode("");
    setModo("idle");
    setError(null);
  }

  if (loading) return <Card><p style={{ color: "var(--text-muted)", margin: 0 }}>Carregando…</p></Card>;

  return (
    <Card>
      <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 10 }}>
        Verificação em duas etapas (2FA)
        {status?.enabled ? (
          <span style={{
            fontSize: 11, padding: "3px 8px", borderRadius: 999,
            background: "color-mix(in srgb, var(--emerald-500) 15%, transparent)",
            color: "var(--emerald-500)", fontWeight: 700,
          }}>
            ATIVADO
          </span>
        ) : (
          <span style={{
            fontSize: 11, padding: "3px 8px", borderRadius: 999,
            background: "var(--bg-elev-2)", color: "var(--text-muted)", fontWeight: 700,
          }}>
            DESATIVADO
          </span>
        )}
      </h3>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>
        {status?.enabled
          ? "A cada login voce vai precisar de um codigo de 6 digitos do seu aplicativo autenticador (Google Authenticator, Authy, 1Password)."
          : "Ative pra exigir um codigo do seu aplicativo autenticador a cada login. Recomendado."}
      </p>

      {modo === "idle" ? (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {status?.enabled ? (
            <Button variant="ghost" onClick={() => setModo("disable")}>Desativar 2FA</Button>
          ) : (
            <Button onClick={iniciarSetup} disabled={busy}>
              {busy ? "Iniciando…" : "Ativar 2FA"}
            </Button>
          )}
        </div>
      ) : null}

      {modo === "setup" && setupData ? (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{
            padding: "12px 14px", borderRadius: 10,
            background: "var(--bg-elev-2)", border: "1px solid var(--border-strong)",
          }}>
            <div style={{ fontSize: 11, letterSpacing: "0.06em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 6 }}>
              Passo 1 — Adicione ao seu autenticador
            </div>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-muted)" }}>
              Abra o Google Authenticator, Authy ou 1Password. Toque em "Adicionar conta" e escolha "Digitar chave manualmente". Cole a chave:
            </p>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700,
              padding: "10px 12px", borderRadius: 8,
              background: "var(--surface)", border: "1px dashed var(--gold-500)",
              wordBreak: "break-all", letterSpacing: "0.05em",
            }}>
              {setupData.secret}
            </div>
            <div style={{ marginTop: 10 }}>
              <a
                href={setupData.otpauth}
                style={{ fontSize: 12, color: "var(--accent)", textDecoration: "underline" }}
              >
                No celular? Abra este link — o autenticador vai receber a conta automaticamente.
              </a>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.06em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 6 }}>
              Passo 2 — Digite o codigo atual
            </div>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-muted)" }}>
              O aplicativo vai mostrar um codigo de 6 digitos que muda a cada 30 segundos. Digite o codigo atual pra confirmar.
            </p>
            <Input
              label="Codigo 2FA"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
            />
          </div>

          {error ? <div style={{ color: "var(--danger-500)", fontSize: 13 }}>{error}</div> : null}

          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={confirmar} disabled={busy || code.length < 6}>
              {busy ? "Confirmando…" : "Confirmar e ativar"}
            </Button>
            <Button variant="ghost" onClick={cancelar} disabled={busy}>Cancelar</Button>
          </div>
        </div>
      ) : null}

      {modo === "disable" ? (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
            Pra desativar, digite o codigo de 6 digitos do seu autenticador. Isso confirma que voce e voce.
          </p>
          <Input
            label="Codigo 2FA"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
          />
          {error ? <div style={{ color: "var(--danger-500)", fontSize: 13 }}>{error}</div> : null}
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={desativar} disabled={busy || code.length < 6}>
              {busy ? "Desativando…" : "Confirmar desativacao"}
            </Button>
            <Button variant="ghost" onClick={cancelar} disabled={busy}>Cancelar</Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
