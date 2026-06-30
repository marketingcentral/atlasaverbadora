import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Input } from "@atlas/ui/web";
import { atlas, storeRole } from "../lib/sdk";

export function LoginPage() {
  const nav = useNavigate();
  const [identifier, setId] = useState("");
  const [password, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await atlas.login({ identifier, password });
      storeRole(res.role);
      nav(`/${res.role}/dashboard`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <Card style={{ background: "var(--surface)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <span
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, var(--gold-500), var(--gold-400) 40%, var(--emerald-500))",
              display: "grid", placeItems: "center", color: "var(--navy-900)", fontWeight: 800,
              boxShadow: "var(--shadow-gold)",
            }}
          >
            A
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Atlas Averbadora</div>
            <div style={{ fontSize: ".82rem", color: "var(--text-dim)" }}>Entre com seu CPF (servidor) ou e-mail (banco / averbadora / prefeitura)</div>
          </div>
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
        </form>
        <div style={{ marginTop: 20, fontSize: ".82rem", color: "var(--text-dim)", lineHeight: 1.5 }}>
          <b>Sandbox:</b><br />
          Servidor: <code style={{ fontFamily: "var(--font-mono)" }}>00011122233</code> / <code style={{ fontFamily: "var(--font-mono)" }}>teste123</code><br />
          Banco: <code style={{ fontFamily: "var(--font-mono)" }}>banco@atlas.test</code> / <code style={{ fontFamily: "var(--font-mono)" }}>teste123</code><br />
          Averbadora: <code style={{ fontFamily: "var(--font-mono)" }}>admin@atlas.test</code> / <code style={{ fontFamily: "var(--font-mono)" }}>teste123</code><br />
          Prefeitura: <code style={{ fontFamily: "var(--font-mono)" }}>prefeitura@atlas.test</code> / <code style={{ fontFamily: "var(--font-mono)" }}>teste123</code>
        </div>
      </Card>
    </div>
  );
}
