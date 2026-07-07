import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Input } from "@atlas/ui/web";
import { atlas } from "../lib/sdk";
import { AtlasLogo } from "../components/AtlasBrand";

type Step = "cpf" | "codigo" | "senha" | "ok";

function formatCpf(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function EsqueciSenhaPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>("cpf");
  const [cpf, setCpf] = useState("");
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [destino, setDestino] = useState<string>("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function solicitar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const digits = cpf.replace(/\D/g, "");
      if (digits.length !== 11) { setError("CPF deve ter 11 dígitos."); return; }
      const r = await atlas.esqueciSenha.solicitar(digits);
      setDestino(r.destino || "");
      setAviso(r.aviso ?? null);
      setStep("codigo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar código.");
    } finally { setLoading(false); }
  }

  async function reenviar() {
    setError(null); setLoading(true);
    try {
      const r = await atlas.esqueciSenha.solicitar(cpf.replace(/\D/g, ""));
      setAviso(r.enviado ? "Código reenviado." : (r.aviso ?? null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao reenviar.");
    } finally { setLoading(false); }
  }

  function irParaSenha(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (codigo.replace(/\D/g, "").length !== 6) { setError("Código precisa ter 6 dígitos."); return; }
    setStep("senha");
  }

  async function redefinir(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (senha.length < 8) { setError("A senha deve ter no mínimo 8 caracteres."); return; }
    if (!/[a-zA-Z]/.test(senha) || !/\d/.test(senha)) { setError("A senha deve conter letras e números."); return; }
    if (senha !== senha2) { setError("As senhas não conferem."); return; }
    setLoading(true);
    try {
      await atlas.esqueciSenha.redefinir(cpf.replace(/\D/g, ""), codigo.replace(/\D/g, ""), senha);
      setStep("ok");
      setTimeout(() => nav("/login"), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido ou expirado.");
      setStep("codigo");
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-shell">
      <Card style={{ background: "var(--surface)", maxWidth: 480 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 20, textAlign: "center" }}>
          <AtlasLogo height={72} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Recuperar senha</div>
            <div style={{ fontSize: ".82rem", color: "var(--text-dim)" }}>
              Enviaremos um código para o e-mail cadastrado pela prefeitura
            </div>
          </div>
        </div>

        {step === "cpf" ? (
          <form onSubmit={solicitar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input
              label="CPF"
              type="text"
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              placeholder="000.111.222-33"
              inputMode="numeric"
              autoComplete="username"
              maxLength={14}
              required
            />
            {error ? <ErrorBox>{error}</ErrorBox> : null}
            <Button type="submit" disabled={loading || !cpf}>
              {loading ? "Enviando..." : "Enviar código"}
            </Button>
            <Link to="/login" style={{ color: "var(--text-muted)", fontSize: ".88rem", textAlign: "center" }}>
              Voltar para o login
            </Link>
          </form>
        ) : null}

        {step === "codigo" ? (
          <form onSubmit={irParaSenha} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ color: "var(--text-muted)", fontSize: ".9rem", margin: 0 }}>
              {destino ? <>Enviamos um código de 6 dígitos para <b>{destino}</b>. Ele expira em 10 minutos.</> : "Digite o código enviado por e-mail."}
            </p>
            {aviso ? <InfoBox>{aviso}</InfoBox> : null}
            <Input
              label="Código de verificação"
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
              <button type="button" onClick={() => setStep("cpf")} style={linkBtn}>← Voltar</button>
              <button type="button" onClick={reenviar} disabled={loading} style={{ ...linkBtn, color: "var(--accent)" }}>Reenviar código</button>
            </div>
          </form>
        ) : null}

        {step === "senha" ? (
          <form onSubmit={redefinir} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ color: "var(--text-muted)", fontSize: ".9rem", margin: 0 }}>
              Crie uma nova senha. Mínimo 8 caracteres, com letras e números.
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
            <p style={{ color: "var(--text-muted)", margin: 0 }}>Você já pode entrar com o CPF e a nova senha.</p>
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
