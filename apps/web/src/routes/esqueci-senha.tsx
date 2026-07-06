import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Input } from "@atlas/ui/web";
import { AtlasLogo } from "../components/AtlasBrand";

export function EsqueciSenhaPage() {
  const [cpf, setCpf] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Mock: pretend to send a recovery code via e-mail.
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="auth-shell">
      <Card style={{ background: "var(--surface)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 24, textAlign: "center" }}>
          <AtlasLogo height={72} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Recuperar senha</div>
            <div style={{ fontSize: ".82rem", color: "var(--text-dim)" }}>
              Enviaremos um codigo para o e-mail cadastrado pela prefeitura
            </div>
          </div>
        </div>

        {sent ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 10,
                border: "1px solid var(--emerald-500)",
                background: "color-mix(in srgb, var(--emerald-500) 12%, transparent)",
                color: "var(--text)",
                fontSize: ".95rem",
              }}
            >
              <b>Codigo enviado.</b> Verifique seu e-mail. O codigo expira em 10 minutos.
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: ".88rem", margin: 0 }}>
              Nao recebeu? Aguarde 60 segundos antes de tentar novamente.
            </p>
            <Link to="/login" style={{ color: "var(--accent)", fontSize: ".9rem" }}>
              Voltar para o login →
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input
              label="CPF"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.111.222-33"
              inputMode="numeric"
              autoComplete="username"
              required
            />
            <Button type="submit" disabled={loading || !cpf}>
              {loading ? "Enviando..." : "Enviar codigo"}
            </Button>
            <Link to="/login" style={{ color: "var(--text-muted)", fontSize: ".88rem", textAlign: "center" }}>
              Voltar para o login
            </Link>
          </form>
        )}
      </Card>
    </div>
  );
}
