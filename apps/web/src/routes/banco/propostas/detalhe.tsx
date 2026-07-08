import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Button, FormActions, Pill, TextareaField } from "@atlas/ui/web";
import { atlas } from "../../../lib/sdk";
import { TwoFactorModal } from "../../../components/TwoFactorModal";
import {
  PRODUTO_LABEL,
  STATUS_LABEL,
  fmtBRL,
  fmtDateTime,
  getBancoPerfil,
  getProposta,
  patchProposta,
  statusPill,
  travaInfo,
  type BancoProposta,
} from "../../../lib/banco-propostas";

export function BancoPropostaDetalhe() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [version, setVersion] = useState(0);
  const proposta = getProposta(id);
  const perfil = getBancoPerfil();
  // "mais_info" foi removido — banco entra em contato direto pra pedir informacoes,
  // fora do sistema. Restam: recusar e upload de contrato (envio).
  const [modal, setModal] = useState<null | "recusar" | "envio">(null);
  const [pendingAverbacao, setPendingAverbacao] = useState(false);
  // Exigências definidas pela prefeitura do convênio ativo (algumas exigem CCB/2FA, outras não).
  const convQ = useQuery({ queryKey: ["banco", "convenios"], queryFn: () => atlas.banco.convenios() });
  const activeConv = convQ.data?.convenios.find((c) => c.id === convQ.data!.activeId);
  const exigeCcb = activeConv?.exigeCcb ?? false;
  const exigeBanco2FA = activeConv?.exigeBanco2FA ?? false;

  if (!proposta) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ color: "var(--text-muted)" }}>Proposta não encontrada.</div>
        <div>
          <Button variant="ghost" onClick={() => nav("/banco/propostas")}>← Voltar para a fila</Button>
        </div>
      </div>
    );
  }

  const refresh = () => setVersion((v) => v + 1);
  const trava = travaInfo(proposta);

  const [confirmando, setConfirmando] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Wrapper generico que valida transicao legal + protege contra falha de
  // persistencia. Cada acao passa o status esperado atual (`from`) e o novo.
  const transicionar = (from: BancoProposta["status"][], to: BancoProposta["status"], extra?: Partial<BancoProposta>): boolean => {
    if (!from.includes(proposta.status)) {
      setSaveError(`Transicao invalida: nao e possivel mudar de "${STATUS_LABEL[proposta.status]}" para "${STATUS_LABEL[to]}".`);
      return false;
    }
    const ok = patchProposta(proposta.idUnico, { status: to, ...(extra ?? {}) });
    if (!ok) {
      setSaveError("Falha ao salvar. Verifique o armazenamento do navegador.");
      return false;
    }
    setSaveError(null);
    return true;
  };

  const aprovar = () => {
    if (transicionar(["recebida", "em_analise", "mais_info"], "aprovada")) refresh();
  };
  const registrarFormalizacao = () => {
    if (
      transicionar(["aguardando_formalizacao"], "formalizada", {
        ccbUrl: proposta.ccbUrl ?? `https://formaliza.bancodelta.com.br/ccb/${proposta.idUnico}.pdf`,
      })
    ) refresh();
  };
  // Confirmacao de averbacao e acao sensivel (libera recurso ao servidor e
  // torna a margem efetiva). Exige 2FA antes de aplicar o patch.
  const confirmarAverbacao = () => {
    if (confirmando) return; // idempotencia contra double-click
    // 2FA só se a prefeitura exigir; senão averba direto.
    if (!exigeBanco2FA) { void executarConfirmacao(); return; }
    setPendingAverbacao(true);
  };
  const executarConfirmacao = async () => {
    if (confirmando) return; // guarda extra contra 2FA disparado 2x
    setConfirmando(true);
    try {
      // Se a prefeitura não exige CCB, pode averbar direto de qualquer etapa acionável.
      const origem = exigeCcb
        ? (["formalizada"] as BancoProposta["status"][])
        : (["recebida", "em_analise", "mais_info", "aprovada", "aguardando_formalizacao", "formalizada"] as BancoProposta["status"][]);
      if (transicionar(origem, "averbada")) refresh();
    } finally {
      setConfirmando(false);
      setPendingAverbacao(false);
    }
  };

  return (
    <div key={version} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <Button variant="ghost" size="sm" onClick={() => nav("/banco/propostas")}>← Voltar para a fila</Button>
      </div>

      {saveError ? (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid var(--danger-500)",
            background: "color-mix(in srgb, var(--danger-500) 10%, transparent)",
            fontSize: ".88rem",
          }}
        >
          {saveError}
        </div>
      ) : null}

      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Análise de proposta
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem", fontFamily: "var(--font-mono)" }}>{proposta.idUnico}</h1>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <Pill variant={statusPill(proposta.status)}>{STATUS_LABEL[proposta.status]}</Pill>
            {trava ? (
              <span style={{ fontSize: 13, color: trava.expirada ? "var(--danger-500)" : trava.urgente ? "var(--gold-500)" : "var(--text-muted)" }}>
                {trava.expirada ? "Trava expirada" : `Trava restante: ${trava.label}`}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <InfoCard title="Dados do servidor">
          <Row label="Nome" value={proposta.nome} />
          <Row label="CPF" value={proposta.cpfMasked} mono />
          <Row label="Matrícula" value={proposta.matricula} mono />
          <Row label="Convênio" value={proposta.convenio} />
          <Row label="Vínculo" value={proposta.vinculo} />
          <Row label="Situação funcional" value={proposta.situacaoFuncional} />
        </InfoCard>

        <InfoCard title="Dados da operação">
          <Row label="Produto" value={PRODUTO_LABEL[proposta.produto]} />
          <Row label="Valor" value={fmtBRL(proposta.valor)} />
          <Row label="Parcelas" value={`${proposta.parcelas}x de ${fmtBRL(proposta.parcela)}`} />
          <Row label="Taxa a.m." value={`${(proposta.taxaAm * 100).toFixed(2)}%`} />
          <Row label="Recebida em" value={fmtDateTime(proposta.criadaEm)} />
        </InfoCard>

        <InfoCard title="Margem por matrícula">
          <Row label="Salário líquido" value={fmtBRL(proposta.salarioLiquido)} />
          <Row label="Margem comprometida (esta op.)" value={fmtBRL(proposta.margemComprometida)} />
          <Row label="Margem disponível" value={fmtBRL(proposta.margemDisponivel)} />
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-dim)" }}>
            A averbadora garante a identificação do servidor e a trava de margem — a análise de crédito é do banco.
          </div>
        </InfoCard>
      </div>

      <InfoCard title="Contratos ativos relacionados">
        {proposta.contratosAtivos.length === 0 ? (
          <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Nenhum contrato ativo relacionado a esta matrícula.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {proposta.contratosAtivos.map((c) => (
              <div
                key={c.idUnico}
                style={{
                  display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
                  padding: "10px 12px", background: "var(--bg-elev-2)", border: "1px solid var(--border)", borderRadius: 10,
                }}
              >
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{c.idUnico}</span>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{c.banco}</span>
                <span style={{ fontSize: 13 }}>{fmtBRL(c.valorParcela)} · {c.parcelasRestantes}x restantes</span>
                <Pill variant="emdia">{c.situacao}</Pill>
              </div>
            ))}
          </div>
        )}
      </InfoCard>

      {/* Analise de risco interna ao banco (Passo 5) */}
      {proposta.risco ? <RiscoPanel risco={proposta.risco} /> : null}

      {/* Proximo passo — dirigido por status (Passos 4, 6, 7) */}
      <div
        style={{
          display: "flex", flexDirection: "column", gap: 12,
          padding: 16, background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12,
        }}
      >
        <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
          Próximo passo
        </div>
        <NextStep
          proposta={proposta}
          podeAgir={perfil.perms.aprovacao}
          perfilNome={perfil.nome}
          exigeCcb={exigeCcb}
          onAprovar={aprovar}
          onEnviarLink={() => setModal("envio")}
          onRegistrarFormalizacao={registrarFormalizacao}
          onConfirmarAverbacao={confirmarAverbacao}
          onRecusar={() => setModal("recusar")}
        />
      </div>

      {proposta.motivoRecusa ? (
        <div style={{ fontSize: 13, color: "var(--danger-500)" }}>Motivo da recusa: {proposta.motivoRecusa}</div>
      ) : null}
      {proposta.observacao ? (
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Observação / info solicitada: {proposta.observacao}</div>
      ) : null}

      {modal === "envio" ? (
        <EnvioModal
          proposta={proposta}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            refresh();
          }}
        />
      ) : modal === "recusar" ? (
        <DecisaoModal
          proposta={proposta}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            refresh();
          }}
        />
      ) : null}

      {pendingAverbacao ? (
        <TwoFactorModal
          acao="confirmar a averbacao e liberar o recurso ao servidor"
          canal="email"
          onCancel={() => setPendingAverbacao(false)}
          onConfirm={executarConfirmacao}
        />
      ) : null}
    </div>
  );
}

function NextStep({
  proposta,
  podeAgir,
  perfilNome,
  exigeCcb,
  onAprovar,
  onEnviarLink,
  onRegistrarFormalizacao,
  onConfirmarAverbacao,
  onRecusar,
}: {
  proposta: BancoProposta;
  podeAgir: boolean;
  perfilNome: string;
  exigeCcb: boolean;
  onAprovar: () => void;
  onEnviarLink: () => void;
  onRegistrarFormalizacao: () => void;
  onConfirmarAverbacao: () => void;
  onRecusar: () => void;
}) {
  const s = proposta.status;
  const acionavel = ["recebida", "em_analise", "mais_info", "aprovada", "aguardando_formalizacao", "formalizada"].includes(s);

  if (acionavel && !podeAgir) {
    return (
      <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
        Seu perfil <strong>{perfilNome}</strong> tem apenas permissão de consulta. Ações indisponíveis nesta etapa.
      </span>
    );
  }

  // Prefeitura NÃO exige CCB: banco averba direto, sem anexar contrato.
  if (!exigeCcb && acionavel && s !== "formalizada") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
          Esta prefeitura não exige anexo da CCB. Você pode averbar diretamente e liberar o recurso ao servidor.
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Button variant="primary" onClick={onConfirmarAverbacao}>Averbar contrato</Button>
          <Button variant="ghost" onClick={onRecusar}>Recusar</Button>
        </div>
      </div>
    );
  }

  // Passo 4 — decisao inicial: banco aprova via upload do contrato assinado
  // (skip do state "aprovada"; upload -> "formalizada" direto no fluxo novo).
  if (s === "recebida" || s === "em_analise" || s === "mais_info") {
    return (
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <Button variant="primary" onClick={onEnviarLink}>Fazer upload de contrato</Button>
        <div style={{ marginLeft: "auto" }}>
          <Button variant="ghost" onClick={onRecusar}>Recusar</Button>
        </div>
      </div>
    );
  }

  // Passo 6 — upload de contrato assinado (CCB)
  if (s === "aprovada") {
    return (
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <Button variant="primary" onClick={onEnviarLink}>Upload de contrato</Button>
        <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
          Faça o upload da CCB assinada (PDF). Após o upload, confirme a averbação para tornar a margem efetiva.
        </span>
      </div>
    );
  }

  // Passo 6 → aguardando assinatura do servidor
  if (s === "aguardando_formalizacao") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
          Link enviado{proposta.canalEnvio ? ` por ${proposta.canalEnvio === "email" ? "e-mail" : "SMS"}` : ""}. Aguardando
          assinatura da CCB pelo servidor.
        </div>
        {proposta.linkFormalizacao ? (
          <a href={proposta.linkFormalizacao} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
            {proposta.linkFormalizacao}
          </a>
        ) : null}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Button variant="success" onClick={onRegistrarFormalizacao}>Registrar formalização (CCB assinada)</Button>
          <Button variant="ghost" onClick={onEnviarLink}>Reenviar link</Button>
        </div>
      </div>
    );
  }

  // Passo 7 — confirmacao de averbacao e liberacao
  if (s === "formalizada") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
          CCB assinada. Confirme a averbação para tornar a margem <strong>efetiva</strong> e liberar o recurso ao servidor.
        </div>
        {proposta.ccbUrl ? (
          <a href={proposta.ccbUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
            Ver CCB (PDF)
          </a>
        ) : null}
        <div>
          <Button variant="primary" onClick={onConfirmarAverbacao}>Confirmar averbação e liberação</Button>
        </div>
      </div>
    );
  }

  // Passo 7 — concluido
  if (s === "averbada") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 14, color: "var(--success)" }}>
          ✓ Averbação confirmada. Margem efetiva para o banco e recurso liberado ao servidor.
        </div>
        {proposta.ccbUrl ? (
          <a href={proposta.ccbUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
            Ver CCB (PDF)
          </a>
        ) : null}
      </div>
    );
  }

  // recusada / expirada
  return (
    <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
      Proposta em <strong>{STATUS_LABEL[s]}</strong> — sem próximos passos.
    </span>
  );
}

function RiscoPanel({ risco }: { risco: NonNullable<BancoProposta["risco"]> }) {
  const recCor = risco.recomendacao === "aprovar" ? "var(--success)" : risco.recomendacao === "negar" ? "var(--danger-500)" : "var(--gold-500)";
  const recLabel = risco.recomendacao === "aprovar" ? "Aprovar" : risco.recomendacao === "negar" ? "Negar" : "Revisar";
  return (
    <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
          Análise de risco (interna do banco)
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: recCor }}>Recomendação: {recLabel}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <Metric label="Score interno" value={`${risco.scoreInterno}`} />
        <Metric label="Serasa" value={`${risco.bureauSerasa}`} />
        <Metric label="SPC" value={risco.bureauSpc === "sem_restricao" ? "Sem restrição" : "Com restrição"} warn={risco.bureauSpc === "com_restricao"} />
        <Metric label="Comprom. de renda" value={`${(risco.comprometimentoRenda * 100).toFixed(0)}%`} warn={risco.comprometimentoRenda > 0.4} />
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-dim)" }}>
        A averbadora não faz análise de crédito — ela apenas garante a identificação do servidor. O risco é integralmente do banco.
      </div>
    </div>
  );
}

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div style={{ background: "var(--bg-elev-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: warn ? "var(--gold-500)" : "var(--text)" }}>{value}</div>
    </div>
  );
}

function EnvioModal({ proposta, onClose, onDone }: { proposta: BancoProposta; onClose: () => void; onDone: () => void }) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (!arquivo) {
      setErro("Selecione o arquivo do contrato (CCB) antes de enviar.");
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      // Upload REAL pro R2. Retorna a key persistida; a URL de visualizacao
      // exige a mesma sessao (autorizacao por banco_id).
      const r = await atlas.banco.uploadCcb(proposta.idUnico, arquivo);
      const ccbUrl = atlas.banco.ccbUrl(r.key);
      // Contrato ja assinado -> transiciona direto para "formalizada" (pula
      // "aguardando_formalizacao" do fluxo antigo).
      patchProposta(proposta.idUnico, { status: "formalizada", ccbUrl });
      onDone();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao enviar arquivo.");
    } finally {
      setEnviando(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (f && f.type && f.type !== "application/pdf") {
      setErro("Apenas arquivos PDF sao aceitos.");
      setArquivo(null);
      return;
    }
    setErro(null);
    setArquivo(f);
  }

  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={modalCard}>
        <h3 style={{ margin: 0 }}>Upload de contrato</h3>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {proposta.nome} · <code>{proposta.idUnico}</code>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          Anexe a CCB assinada em PDF. Apos o upload, a proposta passa para o status <strong>formalizada</strong> e voce
          podera confirmar a averbacao.
        </div>

        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: 20,
            marginTop: 8,
            border: "2px dashed var(--border-strong)",
            borderRadius: 12,
            background: "var(--bg-elev-2)",
            cursor: "pointer",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: 24 }}>📄</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            {arquivo ? arquivo.name : "Clique para selecionar o arquivo (PDF)"}
          </span>
          {arquivo ? (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {(arquivo.size / 1024).toFixed(0)} KB
            </span>
          ) : (
            <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Ou arraste e solte aqui</span>
          )}
          <input
            type="file"
            accept="application/pdf,.pdf"
            style={{ display: "none" }}
            onChange={onFileChange}
          />
        </label>

        {erro ? (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              background: "color-mix(in srgb, var(--danger-500) 10%, transparent)",
              border: "1px solid var(--danger-500)",
              fontSize: 13,
              color: "var(--danger-500)",
            }}
          >
            {erro}
          </div>
        ) : null}

        <FormActions>
          <Button variant="ghost" type="button" onClick={onClose} disabled={enviando}>
            Voltar
          </Button>
          <Button type="button" disabled={!arquivo || enviando} onClick={enviar}>
            {enviando ? "Enviando..." : "Fazer upload"}
          </Button>
        </FormActions>
      </div>
    </div>
  );
}

function DecisaoModal({
  proposta,
  onClose,
  onDone,
}: {
  proposta: BancoProposta;
  onClose: () => void;
  onDone: () => void;
}) {
  const [texto, setTexto] = useState("");
  const confirmar = () => {
    // Motivo opcional: se em branco, recusa sem justificativa (o banco pode
    // preferir nao expor motivos internos — eh o padrao do mercado).
    patchProposta(proposta.idUnico, {
      status: "recusada",
      motivoRecusa: texto.trim() || undefined,
    });
    onDone();
  };
  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={modalCard}>
        <h3 style={{ margin: 0 }}>Recusar proposta</h3>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {proposta.nome} · <code>{proposta.idUnico}</code>
        </div>
        <TextareaField
          label="Motivo da recusa (opcional)"
          hint="Se preenchido, o servidor verá o motivo. Deixe em branco para recusar sem justificativa."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={4}
          maxLength={300}
        />
        <FormActions>
          <Button variant="ghost" type="button" onClick={onClose}>Voltar</Button>
          <Button type="button" onClick={confirmar}>
            Confirmar recusa
          </Button>
        </FormActions>
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: 18 }}>
      <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontWeight: 500, fontFamily: mono ? "var(--font-mono)" : undefined, textAlign: "right" }}>{value}</span>
    </div>
  );
}

const modalBackdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(10,22,40,.6)",
  display: "grid", placeItems: "center", zIndex: 100, backdropFilter: "blur(6px)",
};
const modalCard: React.CSSProperties = {
  background: "var(--bg-elev)", border: "1px solid var(--border-strong)",
  borderRadius: 14, padding: 24, maxWidth: 520, width: "calc(100% - 48px)",
  display: "flex", flexDirection: "column", gap: 16, boxShadow: "var(--shadow-lg)",
};
