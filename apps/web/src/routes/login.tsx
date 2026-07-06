import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Input } from "@atlas/ui/web";
import { atlas, storeRole } from "../lib/sdk";
import { TwoFactorModal } from "../components/TwoFactorModal";
import { AtlasLogo } from "../components/AtlasBrand";

type PendingLogin = {
  role: "servidor" | "banco" | "averbadora" | "prefeitura";
  target: string;
};

export function LoginPage() {
  const nav = useNavigate();
  const [identifier, setId] = useState("");
  const [password, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingLogin | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await atlas.login({ identifier, password });
      const target = res.role === "servidor" ? "/servidor/selecionar-matricula" : `/${res.role}/dashboard`;
      // Banco exige 2FA obrigatorio (spec passo 1). Servidor tem biometria no
      // mobile; averbadora e prefeitura seguem direto neste mockup.
      if (res.role === "banco") {
        // storeRole so ocorre APOS validar 2FA.
        setPending({ role: res.role, target });
        setLoading(false);
        return;
      }
      storeRole(res.role);
      nav(target, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  async function on2FAConfirm() {
    if (!pending) return;
    storeRole(pending.role);
    nav(pending.target, { replace: true });
    setPending(null);
  }

  return (
    <div className="auth-shell">
      <Card style={{ background: "var(--surface)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 24, textAlign: "center" }}>
          <AtlasLogo height={96} />
          <div style={{ fontSize: ".82rem", color: "var(--text-dim)" }}>Entre com seu CPF (servidor) ou e-mail (banco / averbadora / prefeitura)</div>
        </div>
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
        <div style={{ marginTop: 20, fontSize: ".82rem", color: "var(--text-dim)", lineHeight: 1.5 }}>
          <b>Sandbox:</b><br />
          Servidor: <code style={{ fontFamily: "var(--font-mono)" }}>00011122233</code> / <code style={{ fontFamily: "var(--font-mono)" }}>teste123</code><br />
          Banco: <code style={{ fontFamily: "var(--font-mono)" }}>banco@atlas.test</code> / <code style={{ fontFamily: "var(--font-mono)" }}>teste123</code><br />
          Averbadora: <code style={{ fontFamily: "var(--font-mono)" }}>admin@atlas.test</code> / <code style={{ fontFamily: "var(--font-mono)" }}>teste123</code><br />
          Prefeitura: <code style={{ fontFamily: "var(--font-mono)" }}>prefeitura@atlas.test</code> / <code style={{ fontFamily: "var(--font-mono)" }}>teste123</code>
        </div>
      </Card>

      {pending ? (
        <TwoFactorModal
          acao="acessar o portal do banco"
          canal="email"
          onCancel={() => setPending(null)}
          onConfirm={on2FAConfirm}
        />
      ) : null}
    </div>
  );
}
