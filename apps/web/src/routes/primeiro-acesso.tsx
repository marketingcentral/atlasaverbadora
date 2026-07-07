import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Input } from "@atlas/ui/web";
import { atlas } from "../lib/sdk";
import { AtlasLogo } from "../components/AtlasBrand";

type Step = "cpf" | "codigo" | "senha" | "termos" | "ok";

interface PrefeituraInfo {
  nome: string;
  cargo: string;
  matricula: string;
  emailMasked: string;
  telefoneMasked: string;
}

// Formata dígitos como 000.111.222-33 (max 11 dígitos).
function formatCpf(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function PrimeiroAcessoPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>("cpf");
  const [cpf, setCpf] = useState("");
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [aceitouTermos, setAceitou] = useState(false);
  const [aceitouLgpd, setAceitouLgpd] = useState(false);
  const [profile, setProfile] = useState<PrefeituraInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [avisoCodigo, setAvisoCodigo] = useState<string | null>(null);

  async function validarCpf(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const digits = cpf.replace(/\D/g, "");
      if (digits.length !== 11) {
        setError("CPF deve ter 11 dígitos.");
        return;
      }
      const r = await atlas.primeiroAcesso.buscar(digits);
      if (!r.encontrado) {
        setError("CPF nao encontrado na base da sua prefeitura. Entre em contato com o RH da prefeitura para regularizar o cadastro.");
        return;
      }
      if (r.ja_tem_senha) {
        setError("Esta conta ja foi ativada. Use 'Ja tenho conta — entrar' abaixo. Se esqueceu a senha, va em 'Esqueci minha senha'.");
        return;
      }
      setProfile({
        nome: r.nome ?? "",
        cargo: r.cargo ?? "",
        matricula: r.matricula ?? "",
        emailMasked: r.email_masked ?? "",
        telefoneMasked: r.telefone_masked ?? "",
      });
      // Ja dispara o envio do codigo pro e-mail do servidor.
      const env = await atlas.primeiroAcesso.codigo(digits);
      if (!env.enviado) {
        setAvisoCodigo(env.aviso || `E-mail nao pode ser enviado agora. Codigo de teste: ${env.codigo_teste ?? "—"}`);
      } else {
        setAvisoCodigo(null);
      }
      setStep("codigo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao verificar CPF.");
    } finally {
      setLoading(false);
    }
  }

  async function reenviarCodigo() {
    if (!profile) return;
    setError(null);
    setLoading(true);
    try {
      const digits = cpf.replace(/\D/g, "");
      const env = await atlas.primeiroAcesso.codigo(digits);
      setAvisoCodigo(env.enviado ? "Codigo reenviado." : (env.aviso || `Codigo de teste: ${env.codigo_teste ?? "—"}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao reenviar codigo.");
    } finally {
      setLoading(false);
    }
  }

  function irParaSenha(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (codigo.replace(/\D/g, "").length !== 6) {
      setError("Codigo invalido. Verifique seu e-mail.");
      return;
    }
    setStep("senha");
  }

  async function criarSenha(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (senha.length < 8) {
      setError("A senha deve ter no minimo 8 caracteres.");
      return;
    }
    if (!/[a-zA-Z]/.test(senha) || !/\d/.test(senha)) {
      setError("A senha deve conter pelo menos uma letra e um numero.");
      return;
    }
    if (senha !== senha2) {
      setError("As senhas nao conferem.");
      return;
    }
    setStep("termos");
  }

  async function finalizar() {
    setError(null);
    setLoading(true);
    try {
      const digits = cpf.replace(/\D/g, "");
      await atlas.primeiroAcesso.senha(digits, codigo.replace(/\D/g, ""), senha);
      setStep("ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Codigo invalido ou expirado.");
      setStep("codigo");
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
                Vamos verificar se seu CPF esta cadastrado na sua prefeitura.
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

          {step === "codigo" && profile ? (
            <form onSubmit={irParaSenha} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <InfoCard>
                <div style={{ fontWeight: 600 }}>{profile.nome}</div>
                <div style={{ fontSize: ".85rem", color: "var(--text-muted)" }}>
                  {profile.cargo}{profile.matricula ? ` · Matricula ${profile.matricula}` : ""}
                </div>
              </InfoCard>
              <p style={{ color: "var(--text-muted)", fontSize: ".9rem", margin: 0 }}>
                Enviamos um codigo de 6 digitos por e-mail para:<br />
                <b>{profile.emailMasked}</b>
              </p>
              {avisoCodigo ? <InfoBox>{avisoCodigo}</InfoBox> : null}
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
              <Button type="submit" disabled={loading || codigo.length < 6}>
                Continuar →
              </Button>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setStep("cpf")}
                  style={{ background: "transparent", border: 0, color: "var(--text-muted)", fontSize: ".88rem", cursor: "pointer" }}
                >
                  ← Voltar
                </button>
                <button
                  type="button"
                  onClick={reenviarCodigo}
                  disabled={loading}
                  style={{ background: "transparent", border: 0, color: "var(--accent)", fontSize: ".88rem", cursor: loading ? "not-allowed" : "pointer" }}
                >
                  Reenviar codigo
                </button>
              </div>
            </form>
          ) : null}

          {step === "senha" ? (
            <form onSubmit={criarSenha} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ color: "var(--text-muted)", fontSize: ".9rem", margin: 0 }}>
                Crie uma senha forte. Minimo 8 caracteres, com letras e numeros.
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
              {error ? <ErrorBox>{error}</ErrorBox> : null}
              <Button type="submit">Continuar →</Button>
              <button
                type="button"
                onClick={() => setStep("codigo")}
                style={{ background: "transparent", border: 0, color: "var(--text-muted)", fontSize: ".88rem", cursor: "pointer" }}
              >
                ← Voltar
              </button>
            </form>
          ) : null}

          {step === "termos" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ color: "var(--text-muted)", fontSize: ".9rem", margin: 0 }}>
                Para concluir, leia e aceite os termos abaixo.
              </p>
              <div
                style={{
                  maxHeight: 220, overflow: "auto", padding: 14,
                  background: "var(--bg-elev-2)", border: "1px solid var(--border)", borderRadius: 10,
                  fontSize: ".82rem", color: "var(--text-muted)", lineHeight: 1.6,
                }}
              >
                <b>Termo de uso e privacidade Atlas Averbadora</b>
                <p>
                  Ao aceitar este termo, voce autoriza o uso da plataforma Atlas para consulta de margem consignavel,
                  averbacao de operacoes de credito junto a sua prefeitura e bancos parceiros, e recebimento de
                  notificacoes operacionais.
                </p>
                <p>
                  <b>LGPD.</b> Seus dados pessoais (nome, CPF, e-mail, telefone, matricula, salario liquido e historico de
                  consignacoes) sao tratados conforme a Lei 13.709/2018. Voce pode solicitar a exclusao a qualquer momento.
                </p>
                <p>
                  Voce e responsavel pela guarda da sua senha e do dispositivo cadastrado. A Atlas nao realiza emprestimos
                  diretamente — somente intermedia operacoes entre voce e bancos credenciados.
                </p>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: ".88rem" }}>
                <input type="checkbox" checked={aceitouTermos} onChange={(e) => setAceitou(e.target.checked)} />
                Li e aceito os Termos de uso
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: ".88rem" }}>
                <input type="checkbox" checked={aceitouLgpd} onChange={(e) => setAceitouLgpd(e.target.checked)} />
                Concordo com a Politica de Privacidade (LGPD)
              </label>
              {error ? <ErrorBox>{error}</ErrorBox> : null}
              <Button onClick={finalizar} disabled={!aceitouTermos || !aceitouLgpd || loading}>
                {loading ? "Concluindo..." : "Ativar minha conta"}
              </Button>
              <button
                type="button"
                onClick={() => setStep("senha")}
                disabled={loading}
                style={{ background: "transparent", border: 0, color: "var(--text-muted)", fontSize: ".88rem", cursor: loading ? "not-allowed" : "pointer" }}
              >
                ← Voltar
              </button>
            </div>
          ) : null}

          {step === "ok" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "center" }}>
              <div
                style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: "color-mix(in srgb, var(--emerald-500) 20%, transparent)",
                  color: "var(--emerald-500)", display: "grid", placeItems: "center",
                  fontSize: 32, fontWeight: 800, margin: "0 auto",
                }}
              >
                ✓
              </div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Conta ativada!</div>
              <p style={{ color: "var(--text-muted)", margin: 0 }}>
                Voce ja pode entrar com seu CPF e a senha que acabou de criar.
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
                Ja tenho conta — entrar
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
    { key: "codigo", label: "Codigo" },
    { key: "senha", label: "Senha" },
    { key: "termos", label: "Termos" },
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

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 10,
        border: "1px solid var(--danger-500)",
        background: "color-mix(in srgb, var(--danger-500) 10%, transparent)",
        color: "var(--text)",
        fontSize: ".88rem",
      }}
    >
      {children}
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        border: "1px dashed var(--gold-500)",
        background: "color-mix(in srgb, var(--gold-500) 10%, transparent)",
        color: "var(--text)",
        fontSize: ".85rem",
      }}
    >
      {children}
    </div>
  );
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 10,
        background: "var(--bg-elev-2)",
        border: "1px solid var(--border)",
      }}
    >
      {children}
    </div>
  );
}
