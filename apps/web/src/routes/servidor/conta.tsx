import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button, Card, Input, useThemeMode, formatTelefone } from "@atlas/ui/web";
import type { TermoTipo } from "@atlas/sdk";
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

  // Busca as matriculas frescas do backend a cada mount — bypassa cache
  // localStorage stale. Antes: se localStorage tivesse MatriculaInfo antiga
  // (sem cpfMasked, gravada por bundle anterior ao fix), o CPF ficava "—"
  // pra sempre porque o hydrateMatriculas nao dispara storage event na mesma
  // aba. Agora useQuery re-executa e atualiza `info` com dados do backend.
  const matriculasQ = useQuery({
    queryKey: ["servidor", "me", "matriculas"],
    queryFn: () => atlas.getMyMatriculas<MatriculaInfo>(),
    staleTime: 30_000,
  });
  useEffect(() => {
    const fresh = matriculasQ.data?.matriculas ?? [];
    if (fresh.length === 0) return;
    const active = readActiveMatricula();
    const match = active ? fresh.find((m) => m.idMatricula === active.idMatricula) : fresh[0];
    if (match) setInfo(match);
  }, [matriculasQ.data]);

  // Prefeitura decide se o servidor pode editar contato pelo app — hoje o
  // botao aparece independente da flag (cliente pediu). Mantido pra caso a
  // regra mude no futuro.
  const nome = info?.nome ?? "Servidor";
  // CPF vem mascarado do backend (nunca em texto claro). Fallback pra "—"
  // enquanto o hydrate nao terminou — antes tinha "***.***.222-33" hardcoded
  // que nao batia com o CPF real (bug 20/07/2026, ABSALAO terminava -53 mas
  // a tela mostrava -33).
  const cpfMasked = info?.cpfMasked ?? "—";
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
          <ReadField label="Matrícula" value={matricula} />
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

      <SuporteCard />

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

/** Card Suporte com 2 items: Suporte e Termos de Uso.
 *  - Suporte: modal com email/WhatsApp/horario editados em /averbadora/suporte.
 *  - Termos de Uso: modal que primeiro lista TODOS os termos ativos
 *    publicados em /averbadora/termos; ao clicar num termo, o modal
 *    troca de vista pro corpo daquele termo (botao Voltar retorna a lista).
 *    Servidor so LE. */
function SuporteCard() {
  const [aberto, setAberto] = useState<"suporte" | "termos" | null>(null);

  return (
    <>
      <Card>
        <div style={{ fontSize: 11, letterSpacing: ".08em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 12 }}>
          Suporte
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <SuporteItem label="Suporte" onClick={() => setAberto("suporte")} />
          <SuporteItem label="Termos de Uso" onClick={() => setAberto("termos")} borderTop />
        </div>
      </Card>

      {aberto === "suporte" ? (
        <ModalSuporte onClose={() => setAberto(null)} />
      ) : aberto === "termos" ? (
        <ModalTermos onClose={() => setAberto(null)} />
      ) : null}
    </>
  );
}

/** Modal com 2 vistas: lista de termos ativos e detalhe (corpo) de um termo.
 *  Cliente pediu (20/07): "Termos de Uso" abre um modal que mostra as opcoes
 *  de termos pra o servidor escolher qual ler. */
function ModalTermos({ onClose }: { onClose: () => void }) {
  const [selecionado, setSelecionado] = useState<TermoTipo | null>(null);
  const listaQ = useQuery({
    queryKey: ["servidor", "termos-vigentes"],
    queryFn: () => atlas.servidor.listTermos(),
    staleTime: 5 * 60_000,
    enabled: selecionado === null,
  });
  const detalheQ = useQuery({
    queryKey: ["servidor", "termo", selecionado],
    queryFn: () => atlas.servidor.getTermo(selecionado as TermoTipo),
    enabled: selecionado !== null,
  });
  const termo = detalheQ.data?.termo;
  const tituloModal = selecionado ? (termo?.titulo ?? "Termo") : "Termos de Uso";

  return (
    <ModalSimples
      titulo={tituloModal}
      onClose={onClose}
      leading={
        selecionado ? (
          <button
            onClick={() => setSelecionado(null)}
            aria-label="Voltar"
            style={{
              background: "transparent", border: "none", color: "var(--text-dim)",
              fontSize: "1.1rem", cursor: "pointer", padding: 4, marginRight: 4,
            }}
          >
            ‹
          </button>
        ) : null
      }
    >
      {selecionado === null ? (
        listaQ.isPending ? (
          <div style={{ color: "var(--text-muted)" }}>Carregando…</div>
        ) : listaQ.isError ? (
          <div style={{ color: "var(--danger-500)" }}>Não foi possível carregar a lista.</div>
        ) : (listaQ.data?.termos ?? []).length === 0 ? (
          <div style={{ color: "var(--text-muted)" }}>Nenhum termo ativo no momento.</div>
        ) : (
          <>
            <p style={{ marginTop: 0, marginBottom: 12, color: "var(--text-muted)", fontSize: ".92rem" }}>
              Escolha o documento que você quer ler:
            </p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {(listaQ.data?.termos ?? []).map((t, i) => (
                <SuporteItem
                  key={t.id}
                  label={t.titulo}
                  onClick={() => setSelecionado(t.id)}
                  borderTop={i > 0}
                />
              ))}
            </div>
          </>
        )
      ) : detalheQ.isPending ? (
        <div style={{ color: "var(--text-muted)" }}>Carregando…</div>
      ) : detalheQ.isError ? (
        <div style={{ color: "var(--danger-500)" }}>
          Não foi possível carregar. {(detalheQ.error as Error)?.message ?? ""}
        </div>
      ) : termo ? (
        <>
          {termo.versao ? (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
              Versão {termo.versao}
            </div>
          ) : null}
          <TermoCorpo corpo={termo.corpo} />
        </>
      ) : null}
    </ModalSimples>
  );
}

/** Modal Suporte com dados dinamicos vindos de /me/suporte. Ate carregar,
 *  mostra so o titulo. Se der erro, mensagem generica. */
function ModalSuporte({ onClose }: { onClose: () => void }) {
  const q = useQuery({
    queryKey: ["servidor", "suporte"],
    queryFn: () => atlas.servidor.getSuporte(),
  });
  const s = q.data;
  return (
    <ModalSimples titulo="Suporte" onClose={onClose}>
      {q.isLoading ? (
        <div style={{ color: "var(--text-muted)" }}>Carregando…</div>
      ) : q.isError ? (
        <div style={{ color: "var(--danger-500)" }}>Não foi possível carregar. Tente novamente em instantes.</div>
      ) : s ? (
        <>
          <p style={{ marginTop: 0 }}>{s.mensagem || "Fale com a gente:"}</p>
          <ul style={{ paddingLeft: 20, marginTop: 8, marginBottom: 0, lineHeight: 1.7 }}>
            {s.email ? (
              <li>E-mail: <a href={`mailto:${s.email}`} style={{ color: "var(--accent)" }}>{s.email}</a></li>
            ) : null}
            {s.whatsapp ? (
              <li>
                WhatsApp: <a href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                  {formatWhatsappBR(s.whatsapp)}
                </a>
              </li>
            ) : null}
            {s.horario ? <li>Atendimento: {s.horario}.</li> : null}
          </ul>
        </>
      ) : null}
    </ModalSimples>
  );
}

function formatWhatsappBR(w: string): string {
  const d = w.replace(/\D/g, "");
  const semDdi = d.startsWith("55") ? d.slice(2) : d;
  if (semDdi.length === 11) return `(${semDdi.slice(0, 2)}) ${semDdi.slice(2, 7)}-${semDdi.slice(7)}`;
  if (semDdi.length === 10) return `(${semDdi.slice(0, 2)}) ${semDdi.slice(2, 6)}-${semDdi.slice(6)}`;
  return w;
}

function SuporteItem({ label, onClick, borderTop }: { label: string; onClick: () => void; borderTop?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        padding: "14px 4px", background: "transparent", border: "none",
        borderTop: borderTop ? "1px solid var(--border)" : "none",
        color: "var(--text)", fontSize: ".95rem", fontWeight: 500,
        textAlign: "left", cursor: "pointer", width: "100%",
      }}
    >
      <span>{label}</span>
      <span style={{ color: "var(--text-dim)", fontSize: "1.1rem", flexShrink: 0 }} aria-hidden>›</span>
    </button>
  );
}

/** Render minimalista de markdown do corpo do termo: paragrafos separados por
 *  linha em branco, **negrito** e itens de lista comecando com "- ". Suficiente
 *  pro que a averbadora edita no /averbadora/termos hoje; nao usamos lib de
 *  markdown pra evitar peso no bundle. */
function TermoCorpo({ corpo }: { corpo: string }) {
  const blocos = corpo.split(/\n\s*\n/);
  return (
    <div style={{ lineHeight: 1.6, fontSize: ".95rem", display: "flex", flexDirection: "column", gap: 12 }}>
      {blocos.map((bloco, i) => {
        const linhas = bloco.split(/\n/).filter((l) => l.length > 0);
        const ehLista = linhas.length > 0 && linhas.every((l) => /^\s*[-*]\s+/.test(l));
        if (ehLista) {
          return (
            <ul key={i} style={{ margin: 0, paddingLeft: 22 }}>
              {linhas.map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^\s*[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        return <p key={i} style={{ margin: 0 }}>{renderInline(bloco)}</p>;
      })}
    </div>
  );
}

function renderInline(texto: string): React.ReactNode {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((p, i) => {
    if (/^\*\*.+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
    return <span key={i}>{p}</span>;
  });
}

function ModalSimples({
  titulo, onClose, children, leading,
}: {
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Elemento opcional a esquerda do titulo (ex.: botao Voltar quando o modal
   *  tem 2 vistas). */
  leading?: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface-solid)", borderRadius: 14, border: "1px solid var(--border)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, .5)",
          maxWidth: 640, width: "100%", maxHeight: "85vh", overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
            {leading}
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{titulo}</h3>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ background: "transparent", border: "none", color: "var(--text-dim)", fontSize: "1.4rem", cursor: "pointer", padding: 4 }}>×</button>
        </div>
        <div style={{ padding: 18, overflow: "auto" }}>
          {children}
        </div>
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
          <Input label="Telefone" value={formatTelefone(draftTel)} onChange={(e) => setDraftTel(formatTelefone(e.target.value))} autoComplete="tel" inputMode="numeric" maxLength={15} placeholder="(00) 00000-0000" />
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

