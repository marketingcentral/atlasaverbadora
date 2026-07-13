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

  // Prefeitura decide se o servidor pode editar contato pelo app — hoje o
  // botao aparece independente da flag (cliente pediu). Mantido pra caso a
  // regra mude no futuro.
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
          <ReadField label="Vínculo" value={vinculo} />
          <ReadField label="Matricula" value={matricula} />
          <ReadField label="Prefeitura" value={prefeitura} />
          <ReadField label="Endereço" value={endereco} full />
        </div>
        <p style={{ fontSize: ".82rem", color: "var(--text-muted)", marginTop: 16, marginBottom: 0 }}>
          Esses dados são mantidos pela sua prefeitura. Para corrigir, procure o setor de RH.
        </p>
      </Card>

      <ContatoCard info={info} />

      <RedefinirSenhaCard />

      <Card>
        <h3 style={{ marginTop: 0 }}>Aparência</h3>
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

    </div>
  );
}

/** Card de contato (e-mail/telefone) em 2 passos com verificacao por e-mail:
 *  1) Usuario clica Editar → altera campos → clica Salvar alteracoes. Client
 *     valida (algum campo mudou, e-mail em formato valido) e pede o backend
 *     gerar+enviar codigo por e-mail.
 *  2) Codigo chega no e-mail; usuario digita e clica Confirmar. Backend valida
 *     o codigo + persiste os novos e-mail/telefone.
 *
 *  Cancelar em qualquer etapa: se ja tinha pedido codigo, chama
 *  DELETE /me/codigo pra invalidar no KV — mesma regra da senha. */
function ContatoCard({ info }: { info: MatriculaInfo | null }) {
  type Passo = "fechado" | "editando" | "codigo";
  const emailAtual = info?.email ?? "—";
  const telAtual = info?.telefone ?? "—";

  const [passo, setPasso] = useState<Passo>("fechado");
  const [savedEmail, setSavedEmail] = useState(emailAtual);
  const [savedTel, setSavedTel] = useState(telAtual);
  const [draftEmail, setDraftEmail] = useState(emailAtual);
  const [draftTel, setDraftTel] = useState(telAtual);
  const [codigo, setCodigo] = useState("");
  const [destinoMasked, setDestinoMasked] = useState<string | null>(null);
  const [codigoTeste, setCodigoTeste] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [okAt, setOkAt] = useState<Date | null>(null);

  // Ao trocar matricula, reseta pros valores da nova e fecha qualquer edicao aberta.
  useEffect(() => {
    setSavedEmail(info?.email ?? "—");
    setSavedTel(info?.telefone ?? "—");
    setDraftEmail(info?.email ?? "—");
    setDraftTel(info?.telefone ?? "—");
    setPasso("fechado");
    setCodigo(""); setDestinoMasked(null); setCodigoTeste(null); setErro(null); setOkAt(null);
  }, [info?.idMatricula, info?.email, info?.telefone]);

  const enviarCodigo = useMutation({
    mutationFn: () => atlas.servidor.pedirCodigoSenha(), // endpoint compartilhado com senha
    onSuccess: (r) => {
      setDestinoMasked(r.destino ?? null);
      setCodigoTeste(r.codigo_teste ?? null);
      setErro(null);
      setPasso("codigo");
    },
    onError: (e) => setErro((e as Error).message || "Não foi possível enviar o código."),
  });

  const confirmar = useMutation({
    mutationFn: () => atlas.servidor.atualizarContato({
      codigo,
      email: draftEmail !== savedEmail ? draftEmail : undefined,
      telefone: draftTel !== savedTel ? draftTel : undefined,
    }),
    onSuccess: () => {
      setSavedEmail(draftEmail);
      setSavedTel(draftTel);
      setOkAt(new Date());
      setCodigo(""); setDestinoMasked(null); setCodigoTeste(null); setErro(null);
      setPasso("fechado");
    },
    onError: (e) => setErro((e as Error).message || "Não foi possível confirmar a alteração."),
  });

  const cancelarMut = useMutation({
    mutationFn: () => atlas.servidor.cancelarCodigoSenha(),
  });
  function cancelar() {
    if (passo === "codigo") cancelarMut.mutate(); // invalida codigo no KV
    setDraftEmail(savedEmail); setDraftTel(savedTel); setCodigo("");
    setDestinoMasked(null); setCodigoTeste(null); setErro(null);
    setPasso("fechado");
  }

  function submeterEdicao() {
    setErro(null);
    const emailMudou = draftEmail !== savedEmail;
    const telMudou = draftTel !== savedTel;
    if (!emailMudou && !telMudou) { setErro("Altere e-mail ou telefone antes de salvar."); return; }
    if (emailMudou) {
      // Validacao basica de e-mail (bate com o schema Zod do backend).
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draftEmail)) {
        setErro("E-mail inválido."); return;
      }
    }
    enviarCodigo.mutate();
  }

  function submeterCodigo() {
    setErro(null);
    if (!codigo.trim() || codigo.trim().length < 4) { setErro("Digite o código recebido no e-mail."); return; }
    confirmar.mutate();
  }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: passo !== "fechado" ? 12 : 0 }}>
        <h3 style={{ margin: 0 }}>Contato</h3>
        {passo === "fechado" ? (
          <Button size="sm" variant="ghost" onClick={() => { setOkAt(null); setDraftEmail(savedEmail); setDraftTel(savedTel); setPasso("editando"); }}>
            Editar
          </Button>
        ) : null}
      </div>

      {passo === "editando" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input label="E-mail" type="email" value={draftEmail} onChange={(e) => setDraftEmail(e.target.value)} autoComplete="email" />
          <Input label="Telefone" value={draftTel} onChange={(e) => setDraftTel(e.target.value)} autoComplete="tel" />
          {erro ? (
            <div style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--danger-500)", background: "color-mix(in srgb, var(--danger-500) 12%, transparent)", fontSize: ".88rem" }}>
              {erro}
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <Button
              onClick={submeterEdicao}
              disabled={enviarCodigo.isPending || (draftEmail === savedEmail && draftTel === savedTel)}
            >
              {enviarCodigo.isPending ? "Enviando código..." : "Salvar alterações"}
            </Button>
            <Button variant="ghost" onClick={cancelar} disabled={enviarCodigo.isPending}>Cancelar</Button>
          </div>
          <p style={{ fontSize: ".82rem", color: "var(--text-muted)", margin: 0 }}>
            Por segurança, vamos enviar um código de verificação para o seu e-mail cadastrado antes de salvar.
          </p>
        </div>
      ) : passo === "codigo" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-elev-2)", fontSize: ".88rem" }}>
            Enviamos um código de 6 dígitos para <b>{destinoMasked ?? "seu e-mail"}</b>. Ele expira em 10 minutos.
            {codigoTeste ? (
              <>
                <br />
                <span style={{ color: "var(--gold-500)" }}>Modo teste — código: <b style={{ fontFamily: "var(--font-mono)" }}>{codigoTeste}</b></span>
              </>
            ) : null}
          </div>
          <Input
            label="Código de verificação"
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
            <Button onClick={submeterCodigo} disabled={confirmar.isPending}>
              {confirmar.isPending ? "Confirmando..." : "Confirmar e salvar"}
            </Button>
            <Button variant="ghost" onClick={() => enviarCodigo.mutate()} disabled={enviarCodigo.isPending || confirmar.isPending}>
              {enviarCodigo.isPending ? "Reenviando..." : "Reenviar código"}
            </Button>
            <Button variant="ghost" onClick={cancelar} disabled={confirmar.isPending}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
          <ReadField label="E-mail" value={savedEmail} />
          <ReadField label="Telefone" value={savedTel} />
        </div>
      )}

      {okAt && passo === "fechado" ? (
        <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--emerald-500)", background: "color-mix(in srgb, var(--emerald-500) 12%, transparent)", fontSize: ".88rem" }}>
          ✓ Alterações salvas em {okAt.toLocaleTimeString("pt-BR")}
        </div>
      ) : null}
    </Card>
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
    onError: (e) => setErro((e as Error).message || "Não foi possível enviar o código."),
  });

  const confirmar2 = useMutation({
    mutationFn: () => atlas.servidor.confirmarNovaSenha({ senhaAtual, novaSenha, codigo }),
    onSuccess: () => {
      setOkAt(new Date());
      limparCampos();
      setPasso("fechado");
    },
    onError: (e) => setErro((e as Error).message || "Não foi possível confirmar a nova senha."),
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
    if (novaSenha === senhaAtual) { setErro("A nova senha não pode ser igual à senha atual."); return; }
    if (novaSenha !== confirmar) { setErro("Nova senha e confirmação não conferem."); return; }
    enviarCodigo.mutate();
  }

  function submeterCodigo() {
    setErro(null);
    if (!codigo.trim() || codigo.trim().length < 4) { setErro("Digite o código recebido no e-mail."); return; }
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
              {enviarCodigo.isPending ? "Enviando código..." : "Continuar"}
            </Button>
            <Button variant="ghost" onClick={cancelar} disabled={enviarCodigo.isPending}>Cancelar</Button>
          </div>
          <p style={{ fontSize: ".82rem", color: "var(--text-muted)", margin: 0 }}>
            Por segurança, vamos enviar um código de verificação para o seu e-mail cadastrado antes de trocar a senha.
          </p>
        </div>
      ) : null}

      {passo === "codigo" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-elev-2)", fontSize: ".88rem" }}>
            Enviamos um código de 6 dígitos para <b>{destinoMasked ?? "seu e-mail"}</b>. Ele expira em 10 minutos.
            {codigoTeste ? (
              <>
                <br />
                <span style={{ color: "var(--gold-500)" }}>Modo teste — código: <b style={{ fontFamily: "var(--font-mono)" }}>{codigoTeste}</b></span>
              </>
            ) : null}
          </div>
          <Input
            label="Código de verificação"
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
              {enviarCodigo.isPending ? "Reenviando..." : "Reenviar código"}
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

