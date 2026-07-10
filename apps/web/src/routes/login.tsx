import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Input } from "@atlas/ui/web";
import { atlas, storeRole } from "../lib/sdk";
import { AtlasLogo } from "../components/AtlasBrand";

/** Estado quando o backend pede TOTP: nao ha access_token ainda, so o mfa_token
 *  que sera trocado no /v1/auth/verify-2fa. */
type Pending2FA = { mfa_token: string; hint?: string };

export function LoginPage() {
  const nav = useNavigate();
  const [identifier, setId] = useState("");
  const [password, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending2FA | null>(null);
  const [codigo, setCodigo] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await atlas.login({ identifier, password });
      if ("requires_2fa" in res && res.requires_2fa) {
        setPending({ mfa_token: res.mfa_token, hint: res.hint });
        setLoading(false);
        return;
      }
      // Aqui res e AuthSuccess (o narrowing do TS ja garante).
      finalize((res as { role: "servidor" | "banco" | "averbadora" | "prefeitura" }).role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  async function submit2FA(e: FormEvent) {
    e.preventDefault();
    if (!pending) return;
    setLoading(true);
    setError(null);
    try {
      const res = await atlas.verify2fa(pending.mfa_token, codigo.replace(/\D/g, ""));
      finalize(res.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Codigo invalido");
    } finally {
      setLoading(false);
    }
  }

  function finalize(role: "servidor" | "banco" | "averbadora" | "prefeitura") {
    storeRole(role);
    const target = role === "servidor" ? "/servidor/selecionar-matricula" : `/${role}/dashboard`;
    nav(target, { replace: true });
  }

  function cancelar2FA() {
    setPending(null);
    setCodigo("");
    setError(null);
  }

  return (
    <div className="auth-shell">
      <Card style={{ background: "var(--surface)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 24, textAlign: "center" }}>
          <AtlasLogo height={96} />
          <div style={{ fontSize: ".82rem", color: "var(--text-dim)" }}>
            {pending
              ? "Verificacao em duas etapas"
              : "Entre com seu CPF (servidor) ou e-mail (banco / averbadora / prefeitura)"}
          </div>
        </div>

        {pending ? (
          <form onSubmit={submit2FA} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ margin: 0, fontSize: ".9rem", color: "var(--text-muted)" }}>
              {pending.hint ?? "Informe o codigo de 6 digitos do seu aplicativo autenticador."}
            </p>
            <Input
              label="Codigo 2FA"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              autoFocus
            />
            {error ? (
              <div style={{ fontSize: ".88rem", color: "var(--danger-500)" }}>{error}</div>
            ) : null}
            <Button type="submit" disabled={loading || codigo.length < 6}>
              {loading ? "Verificando..." : "Entrar →"}
            </Button>
            <button
              type="button"
              onClick={cancelar2FA}
              style={{ background: "transparent", border: 0, color: "var(--text-muted)", fontSize: ".88rem", cursor: "pointer" }}
            >
              ← Voltar
            </button>
          </form>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input
              label="CPF ou e-mail"
              value={identifier}
              onChange={(e) => setId(e.target.value)}
              placeholder="000.111.222-33 ou voce@empresa.com"
              autoComplete="username"
              required
            />
            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPwd(e.target.value)}
              autoComplete="current-password"
              required
            />
            {error ? (
              <div style={{ fontSize: ".88rem", color: "var(--danger-500)" }}>{error}</div>
            ) : null}
            <Button type="submit" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: ".88rem" }}>
              <Link to="/esqueci-senha" style={{ color: "var(--text-muted)" }}>Esqueci minha senha</Link>
              <Link to="/primeiro-acesso" style={{ color: "var(--accent)", fontWeight: 600 }}>Primeiro acesso</Link>
            </div>
          </form>
        )}

        {!pending ? (
          <div style={{ marginTop: 20, fontSize: ".82rem", color: "var(--text-dim)", lineHeight: 1.5 }}>
            <b>Sandbox:</b><br />
            Servidor: <code style={{ fontFamily: "var(--font-mono)" }}>00011122233</code> / <code style={{ fontFamily: "var(--font-mono)" }}>teste123</code><br />
            Banco: <code style={{ fontFamily: "var(--font-mono)" }}>banco@atlas.test</code> / <code style={{ fontFamily: "var(--font-mono)" }}>teste123</code><br />
            Averbadora: <code style={{ fontFamily: "var(--font-mono)" }}>admin@atlas.test</code> / <code style={{ fontFamily: "var(--font-mono)" }}>teste123</code><br />
            Prefeitura: <code style={{ fontFamily: "var(--font-mono)" }}>prefeitura@atlas.test</code> / <code style={{ fontFamily: "var(--font-mono)" }}>teste123</code>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
