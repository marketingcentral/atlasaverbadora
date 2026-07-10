import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Input } from "@atlas/ui/web";
import { atlas } from "../lib/sdk";
import { AtlasLogo } from "../components/AtlasBrand";

type Step = "identifier" | "codigo" | "senha" | "ok";

function looksLikeCpf(v: string): boolean {
  return v.replace(/\D/g, "").length >= 3 && !v.includes("@");
}
function formatCpf(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
/** Formata enquanto o usuario digita — CPF se so digitos, email se contem @/letras. */
function autoFormat(v: string): string {
  if (v.includes("@") || /[a-zA-Z]/.test(v)) return v.trim();
  return formatCpf(v);
}

export function EsqueciSenhaPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [destino, setDestino] = useState<string>("");
  const [perfilDetectado, setPerfilDetectado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /** Normaliza o identifier antes de mandar: CPF fica so digitos, email fica lowercase. */
  function normalizeIdentifier(v: string): string {
    const t = v.trim();
    if (t.includes("@")) return t.toLowerCase();
    const d = t.replace(/\D/g, "");
    return d.length === 11 ? d : t;
  }

  async function solicitar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const id = normalizeIdentifier(identifier);
      if (!id.includes("@") && id.length !== 11) {
        setError("Informe um CPF valido (11 digitos) ou um e-mail.");
        return;
      }
      const r = await atlas.esqueciSenha.universalSolicitar(id);
      setDestino(r.destino || "");
      setAviso(r.aviso ?? null);
      setPerfilDetectado(r.perfil ?? null);
      setStep("codigo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar codigo.");
    } finally { setLoading(false); }
  }

  async function reenviar() {
    setError(null); setLoading(true);
    try {
      const r = await atlas.esqueciSenha.universalSolicitar(normalizeIdentifier(identifier));
      setAviso(r.enviado ? "Codigo reenviado." : (r.aviso ?? null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao reenviar.");
    } finally { setLoading(false); }
  }

  function irParaSenha(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (codigo.replace(/\D/g, "").length !== 6) { setError("Codigo precisa ter 6 digitos."); return; }
    setStep("senha");
  }

  async function redefinir(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (senha.length < 8) { setError("A senha deve ter no minimo 8 caracteres."); return; }
    if (!/[a-zA-Z]/.test(senha) || !/\d/.test(senha)) { setError("A senha deve conter letras e numeros."); return; }
    if (senha !== senha2) { setError("As senhas nao conferem."); return; }
    setLoading(true);
    try {
      await atlas.esqueciSenha.universalRedefinir(normalizeIdentifier(identifier), codigo.replace(/\D/g, ""), senha);
      setStep("ok");
      setTimeout(() => nav("/login"), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Codigo invalido ou expirado.");
      setStep("codigo");
    } finally { setLoading(false); }
  }

  const perfilLabel = perfilDetectado === "servidor" ? "servidor"
    : perfilDetectado === "banco" ? "banco"
    : perfilDetectado === "prefeitura" ? "prefeitura"
    : perfilDetectado === "averbadora" ? "averbadora"
    : null;

  return (
    <div className="auth-shell">
      <Card style={{ background: "var(--surface)", maxWidth: 480 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 20, textAlign: "center" }}>
          <AtlasLogo height={72} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Recuperar senha</div>
            <div style={{ fontSize: ".82rem", color: "var(--text-dim)" }}>
              Servidor: use seu CPF. Banco, prefeitura ou averbadora: use seu e-mail.
            </div>
          </div>
        </div>

        {step === "identifier" ? (
          <form onSubmit={solicitar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input
              label="CPF ou e-mail"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(autoFormat(e.target.value))}
              placeholder="000.111.222-33 ou seu@email.com"
              autoComplete="username"
              maxLength={looksLikeCpf(identifier) ? 14 : 100}
              required
            />
            {error ? <ErrorBox>{error}</ErrorBox> : null}
            <Button type="submit" disabled={loading || !identifier}>
              {loading ? "Enviando..." : "Enviar codigo"}
            </Button>
            <Link to="/login" style={{ color: "var(--text-muted)", fontSize: ".88rem", textAlign: "center" }}>
              Voltar para o login
            </Link>
          </form>
        ) : null}

        {step === "codigo" ? (
          <form onSubmit={irParaSenha} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ color: "var(--text-muted)", fontSize: ".9rem", margin: 0 }}>
              {destino ? (
                <>Enviamos um codigo de 6 digitos para <b>{destino}</b>{perfilLabel ? <> (perfil <b>{perfilLabel}</b>)</> : null}. Ele expira em 10 minutos.</>
              ) : (
                "Se o identificador informado existir, um codigo foi enviado. Verifique seu e-mail (inclusive spam)."
              )}
            </p>
            {aviso ? <InfoBox>{aviso}</InfoBox> : null}
            <Input
              label="Codigo de verificacao"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
            />
            {error ? <ErrorBox>{error}</ErrorBox> : null}
            <Button type="submit" disabled={codigo.length < 6}>Continuar →</Button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button type="button" onClick={() => setStep("identifier")} style={linkBtn}>← Voltar</button>
              <button type="button" onClick={reenviar} disabled={loading} style={{ ...linkBtn, color: "var(--accent)" }}>Reenviar codigo</button>
            </div>
          </form>
        ) : null}

        {step === "senha" ? (
          <form onSubmit={redefinir} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ color: "var(--text-muted)", fontSize: ".9rem", margin: 0 }}>
              Crie uma nova senha. Minimo 8 caracteres, com letras e numeros.
            </p>
            <Input label="Nova senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" required />
            <Input label="Confirmar senha" type="password" value={senha2} onChange={(e) => setSenha2(e.target.value)} autoComplete="new-password" required />
            {error ? <ErrorBox>{error}</ErrorBox> : null}
            <Button type="submit" disabled={loading}>{loading ? "Redefinindo..." : "Redefinir senha"}</Button>
            <button type="button" onClick={() => setStep("codigo")} style={linkBtn}>← Voltar</button>
          </form>
        ) : null}

        {step === "ok" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "center" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "color-mix(in srgb, var(--emerald-500) 20%, transparent)",
              color: "var(--emerald-500)", display: "grid", placeItems: "center",
              fontSize: 32, fontWeight: 800, margin: "0 auto",
            }}>✓</div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Senha redefinida!</div>
            <p style={{ color: "var(--text-muted)", margin: 0 }}>Voce ja pode entrar com a nova senha.</p>
            <Button onClick={() => nav("/login")}>Ir para o login →</Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

const linkBtn: React.CSSProperties = { background: "transparent", border: 0, color: "var(--text-muted)", fontSize: ".88rem", cursor: "pointer", padding: 0 };
function ErrorBox({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--danger-500)", background: "color-mix(in srgb, var(--danger-500) 10%, transparent)", color: "var(--text)", fontSize: ".88rem" }}>{children}</div>;
}
function InfoBox({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "10px 14px", borderRadius: 10, border: "1px dashed var(--gold-500)", background: "color-mix(in srgb, var(--gold-500) 10%, transparent)", color: "var(--text)", fontSize: ".85rem" }}>{children}</div>;
}
