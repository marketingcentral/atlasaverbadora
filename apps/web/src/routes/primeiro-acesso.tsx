import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Input } from "@atlas/ui/web";
import { atlas } from "../lib/sdk";
import { AtlasLogo } from "../components/AtlasBrand";

type Step = "cpf" | "email" | "codigo" | "ok";

interface PrefeituraInfo {
  nome: string;
  cargo: string;
  matricula: string;
}

function formatCpf(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// Formata (48) 99101-2233 (11 digitos) ou (48) 3234-5678 (10 digitos).
function formatTelefone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function PrimeiroAcessoPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>("cpf");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [codigo, setCodigo] = useState("");
  const [aceitouTermos, setAceitou] = useState(false);
  const [aceitouLgpd, setAceitouLgpd] = useState(false);
  const [profile, setProfile] = useState<PrefeituraInfo | null>(null);
  const [destinoMasked, setDestinoMasked] = useState<string>("");
  const [avisoCodigo, setAvisoCodigo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function validarCpf(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const digits = cpf.replace(/\D/g, "");
      if (digits.length !== 11) { setError("CPF deve ter 11 dígitos."); return; }
      const r = await atlas.primeiroAcesso.buscar(digits);
      if (!r.encontrado) {
        setError("CPF não encontrado na base da sua prefeitura. Entre em contato com o RH para regularizar o cadastro.");
        return;
      }
      if (r.ja_tem_senha) {
        setError("Esta conta já foi ativada. Use 'Já tenho conta — entrar' abaixo. Se esqueceu a senha, use 'Esqueci minha senha'.");
        return;
      }
      setProfile({ nome: r.nome ?? "", cargo: r.cargo ?? "", matricula: r.matricula ?? "" });
      setStep("email");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao verificar CPF.");
    } finally {
      setLoading(false);
    }
  }

  async function enviarCodigo(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError("Informe um e-mail válido."); return; }
    const telDigits = telefone.replace(/\D/g, "");
    if (telDigits.length < 10 || telDigits.length > 11) { setError("Informe um telefone com DDD (10 ou 11 dígitos)."); return; }
    if (senha.length < 8) { setError("A senha deve ter no mínimo 8 caracteres."); return; }
    if (!/[a-zA-Z]/.test(senha) || !/\d/.test(senha)) { setError("A senha deve conter letras e números."); return; }
    if (senha !== senha2) { setError("As senhas não conferem."); return; }
    if (!aceitouTermos || !aceitouLgpd) { setError("É preciso aceitar os Termos e a Política de Privacidade."); return; }
    setLoading(true);
    try {
      const digits = cpf.replace(/\D/g, "");
      const r = await atlas.primeiroAcesso.codigo(digits, email.trim().toLowerCase(), senha, telDigits);
      setDestinoMasked(r.destino || email);
      setAvisoCodigo(r.enviado ? null : (r.aviso || `Código de teste: ${r.codigo_teste ?? "—"}`));
      setStep("codigo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar o código.");
    } finally {
      setLoading(false);
    }
  }

  async function reenviarCodigo() {
    setError(null);
    setLoading(true);
    try {
      const digits = cpf.replace(/\D/g, "");
      const telDigits = telefone.replace(/\D/g, "");
      const r = await atlas.primeiroAcesso.codigo(digits, email.trim().toLowerCase(), senha, telDigits);
      setAvisoCodigo(r.enviado ? "Código reenviado." : (r.aviso || `Código de teste: ${r.codigo_teste ?? "—"}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao reenviar.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (codigo.replace(/\D/g, "").length !== 6) { setError("Código precisa ter 6 dígitos."); return; }
    setLoading(true);
    try {
      const digits = cpf.replace(/\D/g, "");
      await atlas.primeiroAcesso.confirmar(digits, codigo.replace(/\D/g, ""));
      setStep("ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido ou expirado.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (step !== "ok") return;
    const t = setTimeout(() => nav("/login"), 4000);
    return () => clearTimeout(t);
  }, [step, nav]);

  return (
    <div className="auth-shell">
      <Card style={{ background: "var(--surface)", maxWidth: 520 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 20, textAlign: "center" }}>
          <AtlasLogo height={72} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Primeiro acesso</div>
            <div style={{ fontSize: ".82rem", color: "var(--text-dim)" }}>
              Ative sua conta a partir da base cadastrada pela sua prefeitura
            </div>
          </div>
        </div>

        <Stepper step={step} />

        <div style={{ marginTop: 20 }}>
          {step === "cpf" ? (
            <form onSubmit={validarCpf} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ color: "var(--text-muted)", fontSize: ".9rem", margin: 0 }}>
                Vamos verificar se seu CPF está cadastrado na sua prefeitura.
              </p>
              <Input
                label="CPF"
                type="text"
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                placeholder="000.111.222-33"
                inputMode="numeric"
                autoComplete="off"
                maxLength={14}
                required
              />
              {error ? <ErrorBox>{error}</ErrorBox> : null}
              <Button type="submit" disabled={loading || !cpf}>
                {loading ? "Verificando..." : "Continuar →"}
              </Button>
            </form>
          ) : null}

          {step === "email" && profile ? (
            <form onSubmit={enviarCodigo} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <InfoCard>
                <div style={{ fontWeight: 600 }}>{profile.nome}</div>
                <div style={{ fontSize: ".85rem", color: "var(--text-muted)" }}>
                  {profile.cargo}{profile.matricula ? ` · Matrícula ${profile.matricula}` : ""}
                </div>
              </InfoCard>
              <p style={{ color: "var(--text-muted)", fontSize: ".9rem", margin: 0 }}>
                Informe um <b>e-mail seu</b> — pode ser pessoal, não precisa ser o institucional. Vamos enviar um código para confirmar que é seu.
                Escolha também uma senha para acessar a plataforma.
              </p>
              <Input
                label="Seu e-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="você@gmail.com"
                autoComplete="email"
                required
              />
              <Input
                label="Seu telefone (com DDD)"
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                placeholder="(48) 99101-2233"
                autoComplete="tel"
                inputMode="tel"
                maxLength={16}
                required
              />
              <p style={{ margin: "-6px 0 0", fontSize: ".76rem", color: "var(--text-dim)" }}>
                Ficará no seu cadastro para que os bancos parceiros possam entrar em contato quando necessário.
              </p>
              <Input
                label="Nova senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                required
              />
              <Input
                label="Confirmar senha"
                type="password"
                value={senha2}
                onChange={(e) => setSenha2(e.target.value)}
                autoComplete="new-password"
                required
              />
              <div
                style={{
                  maxHeight: 140, overflow: "auto", padding: 12,
                  background: "var(--bg-elev-2)", border: "1px solid var(--border)", borderRadius: 10,
                  fontSize: ".78rem", color: "var(--text-muted)", lineHeight: 1.55,
                }}
              >
                <b>Termos.</b> Ao ativar, você autoriza a Atlas a consultar sua margem e intermediar averbações junto à prefeitura e bancos parceiros.
                <br /><b>LGPD.</b> Seus dados (nome, CPF, e-mail, telefone, matrícula, salário, contratos) são tratados conforme a Lei 13.709/2018. Você pode pedir exclusão a qualquer momento.
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: ".85rem" }}>
                <input type="checkbox" checked={aceitouTermos} onChange={(e) => setAceitou(e.target.checked)} />
                Li e aceito os Termos de uso
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: ".85rem" }}>
                <input type="checkbox" checked={aceitouLgpd} onChange={(e) => setAceitouLgpd(e.target.checked)} />
                Concordo com a Política de Privacidade (LGPD)
              </label>
              {error ? <ErrorBox>{error}</ErrorBox> : null}
              <Button type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Enviar código para meu e-mail →"}
              </Button>
              <button type="button" onClick={() => setStep("cpf")} style={linkBtn}>← Voltar</button>
            </form>
          ) : null}

          {step === "codigo" ? (
            <form onSubmit={confirmar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ color: "var(--text-muted)", fontSize: ".9rem", margin: 0 }}>
                Enviamos um código de 6 dígitos para <b style={{ color: "var(--text)" }}>{destinoMasked}</b>. Ele expira em 10 minutos.
              </p>
              {avisoCodigo ? <InfoBox>{avisoCodigo}</InfoBox> : null}
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
              <Button type="submit" disabled={loading || codigo.length < 6}>
                {loading ? "Confirmando..." : "Ativar minha conta"}
              </Button>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button type="button" onClick={() => setStep("email")} style={linkBtn}>← Voltar</button>
                <button type="button" onClick={reenviarCodigo} disabled={loading} style={{ ...linkBtn, color: "var(--accent)" }}>
                  Reenviar código
                </button>
              </div>
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
              <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Conta ativada!</div>
              <p style={{ color: "var(--text-muted)", margin: 0 }}>
                Você já pode entrar com seu CPF e a senha que acabou de criar.
              </p>
              <p style={{ color: "var(--text-dim)", fontSize: ".82rem", margin: 0 }}>
                Redirecionando em alguns segundos…
              </p>
              <Button onClick={() => nav("/login")}>Ir para o login agora →</Button>
            </div>
          ) : null}

          {step !== "ok" ? (
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <Link to="/login" style={{ color: "var(--text-muted)", fontSize: ".88rem" }}>
                Já tenho conta — entrar
              </Link>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "cpf", label: "CPF" },
    { key: "email", label: "Dados" },
    { key: "codigo", label: "Código" },
  ];
  const currentIdx = step === "ok" ? steps.length : steps.findIndex((s) => s.key === step);
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {steps.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <div
              style={{
                width: 28, height: 28, borderRadius: "50%",
                background: done ? "var(--emerald-500)" : active ? "var(--gold-500)" : "var(--bg-elev-2)",
                color: done || active ? "var(--navy-900)" : "var(--text-muted)",
                display: "grid", placeItems: "center", fontWeight: 700, fontSize: ".82rem",
              }}
            >
              {done ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: ".82rem", color: active ? "var(--text)" : "var(--text-muted)" }}>{s.label}</span>
            {i < steps.length - 1 ? (
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

const linkBtn: React.CSSProperties = { background: "transparent", border: 0, color: "var(--text-muted)", fontSize: ".88rem", cursor: "pointer", padding: 0 };

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--danger-500)", background: "color-mix(in srgb, var(--danger-500) 10%, transparent)", color: "var(--text)", fontSize: ".88rem" }}>
      {children}
    </div>
  );
}
function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "10px 14px", borderRadius: 10, border: "1px dashed var(--gold-500)", background: "color-mix(in srgb, var(--gold-500) 10%, transparent)", color: "var(--text)", fontSize: ".85rem" }}>
      {children}
    </div>
  );
}
function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 14, borderRadius: 10, background: "var(--bg-elev-2)", border: "1px solid var(--border)" }}>
      {children}
    </div>
  );
}
