import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button, Card, Input, useThemeMode } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { clearAtlasState } from "../../lib/session";
import { GerenciarDoisFA } from "../../components/GerenciarDoisFA";
import {
  MatriculaInfo,
  readActiveMatricula,
  STORAGE_KEY_ID,
  STORAGE_KEY_META,
} from "../../lib/matricula-data";

export function ServidorConta() {
  const nav = useNavigate();
  const { mode, setMode } = useThemeMode();

  // Re-le da fonte central de verdade no mount E quando outra aba muda o storage.
  const [info, setInfo] = useState<MatriculaInfo | null>(() => readActiveMatricula());
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_META || e.key === STORAGE_KEY_ID) {
        setInfo(readActiveMatricula());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Email/telefone iniciais vem da matricula ativa — quando trocar, reseta pros valores da nova.
  const initialEmail = info?.email ?? "—";
  const initialTel = info?.telefone ?? "—";

  const [savedEmail, setSavedEmail] = useState(initialEmail);
  const [savedTel, setSavedTel] = useState(initialTel);
  const [draftEmail, setDraftEmail] = useState(initialEmail);
  const [draftTel, setDraftTel] = useState(initialTel);
  const [editing, setEditing] = useState(false);
  const [showSelfie, setShowSelfie] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // Quando troca matricula, reseta email/tel para os da nova (e fecha edicao em aberto).
  useEffect(() => {
    setSavedEmail(info?.email ?? "—");
    setSavedTel(info?.telefone ?? "—");
    setDraftEmail(info?.email ?? "—");
    setDraftTel(info?.telefone ?? "—");
    setEditing(false);
    setSavedAt(null);
  }, [info?.idMatricula]);

  function comecarEdicao() {
    setDraftEmail(savedEmail);
    setDraftTel(savedTel);
    setEditing(true);
  }

  function cancelarEdicao() {
    setDraftEmail(savedEmail);
    setDraftTel(savedTel);
    setEditing(false);
  }

  function abrirConfirmacao() {
    setShowSelfie(true);
  }

  async function confirmarSelfie() {
    // Mock: pretend liveness check ran and passed.
    await new Promise((r) => setTimeout(r, 1500));
    setSavedEmail(draftEmail);
    setSavedTel(draftTel);
    setShowSelfie(false);
    setEditing(false);
    setSavedAt(new Date());
  }

  // Prefeitura decide se o servidor pode editar contato pelo app.
  const podeEditarContato = info?.permiteServidorEditarContato ?? false;
  const nome = info?.nome ?? "Servidor";
  const cpfMasked = "***.***.222-33";
  const endereco = info?.endereco ?? "—";
  const cargo = info?.cargo ?? "—";
  const matricula = info?.matricula ?? "—";
  const prefeitura = info?.prefeitura ?? "—";
  const vinculo = info?.vinculo ?? "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720, margin: "0 auto", width: "100%" }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Conta
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Meus dados</h1>
      </header>

      <Card>
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>Dados cadastrais</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
          <ReadField label="Nome" value={nome} />
          <ReadField label="CPF" value={cpfMasked} />
          <ReadField label="Cargo" value={cargo} />
          <ReadField label="Vinculo" value={vinculo} />
          <ReadField label="Matricula" value={matricula} />
          <ReadField label="Prefeitura" value={prefeitura} />
          <ReadField label="Endereco" value={endereco} full />
        </div>
        <p style={{ fontSize: ".82rem", color: "var(--text-muted)", marginTop: 16, marginBottom: 0 }}>
          Esses dados sao mantidos pela sua prefeitura. Para corrigir, procure o setor de RH.
        </p>
      </Card>

      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Contato</h3>
          {/* Botao Editar aparece sempre — cliente pediu que o servidor possa
              editar e-mail/telefone direto da tela, independente da flag da prefeitura. */}
          {!editing ? (
            <Button size="sm" variant="ghost" onClick={comecarEdicao}>
              Editar
            </Button>
          ) : null}
        </div>

        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Input label="E-mail" type="email" value={draftEmail} onChange={(e) => setDraftEmail(e.target.value)} />
            <Input label="Telefone" value={draftTel} onChange={(e) => setDraftTel(e.target.value)} />
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <Button
                onClick={abrirConfirmacao}
                disabled={draftEmail === savedEmail && draftTel === savedTel}
              >
                Salvar alteracoes
              </Button>
              <Button variant="ghost" onClick={cancelarEdicao}>Cancelar</Button>
            </div>
            <p style={{ fontSize: ".82rem", color: "var(--text-muted)", margin: 0 }}>
              Por seguranca, vamos pedir uma selfie (liveness) antes de salvar.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
            <ReadField label="E-mail" value={savedEmail} />
            <ReadField label="Telefone" value={savedTel} />
          </div>
        )}

        {savedAt ? (
          <div
            style={{
              marginTop: 14, padding: "10px 14px", borderRadius: 10,
              border: "1px solid var(--emerald-500)",
              background: "color-mix(in srgb, var(--emerald-500) 12%, transparent)",
              fontSize: ".88rem",
            }}
          >
            ✓ Alteracoes salvas em {savedAt.toLocaleTimeString("pt-BR")}
          </div>
        ) : null}
      </Card>

      <RedefinirSenhaCard />

      <Card>
        <h3 style={{ marginTop: 0 }}>Aparencia</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["system", "light", "dark"] as const).map((m) => (
            <Button key={m} variant={mode === m ? "primary" : "ghost"} size="sm" onClick={() => setMode(m)}>
              {m === "system" ? "Seguir sistema" : m === "light" ? "Claro" : "Escuro"}
            </Button>
          ))}
        </div>
      </Card>

      <GerenciarDoisFA />

      <div>
        <Button
          variant="ghost"
          onClick={async () => {
            await atlas.logout().catch(() => undefined);
            clearAtlasState();
            nav("/login");
          }}
        >
          Sair da conta
        </Button>
      </div>

      {showSelfie ? <SelfieModal onClose={() => setShowSelfie(false)} onConfirm={confirmarSelfie} /> : null}
    </div>
  );
}

/** Card de redefinicao de senha em 2 passos:
 *  1) Usuario preenche senha atual + nova + confirmar → clica Continuar.
 *     Client-side valida (nova >= 8 chars, nova != atual, nova == confirmar)
 *     e pede o backend gerar+enviar codigo por e-mail.
 *  2) Codigo chega no e-mail; usuario digita e clica Confirmar. Backend
 *     valida senha atual + codigo + persiste nova senha.
 *
 *  Cancelar em qualquer etapa limpa o form; se ja tinha pedido codigo,
 *  chama DELETE /me/codigo pra invalidar no KV (evita reuso posterior). */
function RedefinirSenhaCard() {
  type Passo = "fechado" | "credenciais" | "codigo";
  const [passo, setPasso] = useState<Passo>("fechado");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [codigo, setCodigo] = useState("");
  const [destinoMasked, setDestinoMasked] = useState<string | null>(null);
  const [codigoTeste, setCodigoTeste] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [okAt, setOkAt] = useState<Date | null>(null);

  function limparCampos() {
    setSenhaAtual(""); setNovaSenha(""); setConfirmar(""); setCodigo("");
    setDestinoMasked(null); setCodigoTeste(null); setErro(null);
  }

  const enviarCodigo = useMutation({
    mutationFn: () => atlas.servidor.pedirCodigoSenha(),
    onSuccess: (r) => {
      setDestinoMasked(r.destino ?? null);
      setCodigoTeste(r.codigo_teste ?? null);
      setErro(null);
      setPasso("codigo");
    },
    onError: (e) => setErro((e as Error).message || "Nao foi possivel enviar o codigo."),
  });

  const confirmar2 = useMutation({
    mutationFn: () => atlas.servidor.confirmarNovaSenha({ senhaAtual, novaSenha, codigo }),
    onSuccess: () => {
      setOkAt(new Date());
      limparCampos();
      setPasso("fechado");
    },
    onError: (e) => setErro((e as Error).message || "Nao foi possivel confirmar a nova senha."),
  });

  // Invalida codigo no backend (se foi gerado) e fecha. Chamado tanto no
  // "Cancelar" quanto no botao X — cliente pediu que MESMO quando cancelar,
  // o codigo pendente deixa de valer.
  const cancelarMut = useMutation({
    mutationFn: () => atlas.servidor.cancelarCodigoSenha(),
  });
  function cancelar() {
    if (passo === "codigo") cancelarMut.mutate(); // fire-and-forget
    limparCampos();
    setPasso("fechado");
  }

  function submeterCredenciais() {
    setErro(null);
    if (!senhaAtual) { setErro("Informe a senha atual."); return; }
    if (novaSenha.length < 8) { setErro("A nova senha precisa ter pelo menos 8 caracteres."); return; }
    if (novaSenha === senhaAtual) { setErro("A nova senha nao pode ser igual a senha atual."); return; }
    if (novaSenha !== confirmar) { setErro("Nova senha e confirmacao nao conferem."); return; }
    enviarCodigo.mutate();
  }

  function submeterCodigo() {
    setErro(null);
    if (!codigo.trim() || codigo.trim().length < 4) { setErro("Digite o codigo recebido no e-mail."); return; }
    confirmar2.mutate();
  }

  const aberto = passo !== "fechado";

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: aberto ? 12 : 0 }}>
        <h3 style={{ margin: 0 }}>Senha</h3>
        {!aberto ? (
          <Button size="sm" variant="ghost" onClick={() => { limparCampos(); setOkAt(null); setPasso("credenciais"); }}>
            Redefinir senha
          </Button>
        ) : null}
      </div>

      {passo === "credenciais" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input label="Senha atual" type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} autoComplete="current-password" />
          <Input label="Nova senha" type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} autoComplete="new-password" />
          <Input label="Confirmar senha" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} autoComplete="new-password" />
          {erro ? (
            <div style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--danger-500)", background: "color-mix(in srgb, var(--danger-500) 12%, transparent)", fontSize: ".88rem" }}>
              {erro}
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <Button onClick={submeterCredenciais} disabled={enviarCodigo.isPending}>
              {enviarCodigo.isPending ? "Enviando codigo..." : "Continuar"}
            </Button>
            <Button variant="ghost" onClick={cancelar} disabled={enviarCodigo.isPending}>Cancelar</Button>
          </div>
          <p style={{ fontSize: ".82rem", color: "var(--text-muted)", margin: 0 }}>
            Por seguranca, vamos enviar um codigo de verificacao para o seu e-mail cadastrado antes de trocar a senha.
          </p>
        </div>
      ) : null}

      {passo === "codigo" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-elev-2)", fontSize: ".88rem" }}>
            Enviamos um codigo de 6 digitos para <b>{destinoMasked ?? "seu e-mail"}</b>. Ele expira em 10 minutos.
            {codigoTeste ? (
              <>
                <br />
                <span style={{ color: "var(--gold-500)" }}>Modo teste — codigo: <b style={{ fontFamily: "var(--font-mono)" }}>{codigoTeste}</b></span>
              </>
            ) : null}
          </div>
          <Input
            label="Codigo de verificacao"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
          />
          {erro ? (
            <div style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--danger-500)", background: "color-mix(in srgb, var(--danger-500) 12%, transparent)", fontSize: ".88rem" }}>
              {erro}
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
            <Button onClick={submeterCodigo} disabled={confirmar2.isPending}>
              {confirmar2.isPending ? "Confirmando..." : "Confirmar e alterar senha"}
            </Button>
            <Button variant="ghost" onClick={() => enviarCodigo.mutate()} disabled={enviarCodigo.isPending || confirmar2.isPending}>
              {enviarCodigo.isPending ? "Reenviando..." : "Reenviar codigo"}
            </Button>
            <Button variant="ghost" onClick={cancelar} disabled={confirmar2.isPending}>Cancelar</Button>
          </div>
        </div>
      ) : null}

      {okAt && !aberto ? (
        <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--emerald-500)", background: "color-mix(in srgb, var(--emerald-500) 12%, transparent)", fontSize: ".88rem" }}>
          ✓ Senha alterada em {okAt.toLocaleTimeString("pt-BR")}
        </div>
      ) : null}
    </Card>
  );
}

function ReadField({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ marginTop: 4, fontSize: ".95rem" }}>{value}</div>
    </div>
  );
}

function SelfieModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => Promise<void> }) {
  const [running, setRunning] = useState(false);

  // Close on Escape (unless verification is mid-flight).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !running) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, running]);

  return (
    <div
      role="dialog"
      style={{
        position: "fixed", inset: 0, background: "color-mix(in srgb, var(--navy-900) 70%, transparent)",
        display: "grid", placeItems: "center", zIndex: 100, padding: 16,
      }}
    >
      <Card style={{ maxWidth: 420, width: "100%" }}>
        <h3 style={{ marginTop: 0 }}>Confirmacao por selfie</h3>
        <p style={{ color: "var(--text-muted)", fontSize: ".9rem", marginTop: 0 }}>
          Para sua seguranca, vamos verificar que e voce mesmo alterando os dados. Posicione seu rosto na area abaixo.
        </p>
        <div
          style={{
            margin: "12px 0", height: 220, borderRadius: 12,
            border: "2px dashed var(--border-strong)", background: "var(--bg-elev-2)",
            display: "grid", placeItems: "center", color: "var(--text-muted)", fontSize: ".88rem",
          }}
        >
          {running ? (
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 40, height: 40, borderRadius: "50%",
                  border: "3px solid var(--border)", borderTopColor: "var(--accent)",
                  margin: "0 auto", animation: "spin 1s linear infinite",
                }}
              />
              <div style={{ marginTop: 12 }}>Analisando liveness…</div>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40 }}>📷</div>
              <div>Camera frontal — selfie liveness</div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={onClose} disabled={running}>Cancelar</Button>
          <Button
            disabled={running}
            onClick={async () => {
              setRunning(true);
              await onConfirm();
              setRunning(false);
            }}
          >
            {running ? "Verificando..." : "Iniciar verificacao"}
          </Button>
        </div>
      </Card>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
