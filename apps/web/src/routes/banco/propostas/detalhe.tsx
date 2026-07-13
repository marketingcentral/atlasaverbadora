import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Button, FormActions, Pill, TextareaField } from "@atlas/ui/web";
import { atlas } from "../../../lib/sdk";
import { buildSimplePdf, downloadPdf } from "../../../lib/pdf";
import {
  PRODUTO_LABEL,
  STATUS_LABEL,
  contratoToProposta,
  fmtBRL,
  fmtDateTime,
  getBancoPerfil,
  getProposta,
  statusPill,
  travaInfo,
  type BancoProposta,
} from "../../../lib/banco-propostas";

export function BancoPropostaDetalhe() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [version, setVersion] = useState(0);
  // Proposta pode vir de duas fontes: (a) SEED local + overlay (fluxo antigo,
  // hoje vazio) ou (b) contratos do backend (fluxo real). Primeiro tenta o
  // local; se nao achar, procura no atlas.banco.contratos() pelo ADF.
  const local = getProposta(id);
  // Sempre busca a lista do backend — mesmo com "local", o status da proposta
  // pode mudar por acao do proprio banco (aprovar/recusar) e queremos ver o
  // reflexo imediatamente. O invalidate depois da mutation dispara o refetch.
  const apiQ = useQuery({
    queryKey: ["banco", "propostas-api"],
    queryFn: () => atlas.banco.contratos(),
    refetchInterval: 10_000,
  });
  const fromApi = apiQ.data?.contratos.find((c) => c.adf === id);
  // fromApi tem PRIORIDADE — reflete a decisao ja persistida (aprovada/recusada
  // pelo backend). O seed local so entra como fallback pra propostas de
  // demonstracao que nunca subiram pra API.
  const proposta: BancoProposta | undefined = fromApi ? contratoToProposta(fromApi) : local;
  // Enquanto a query da API ainda esta carregando, nao mostra "nao encontrada".
  const carregandoApi = !local && apiQ.isLoading;
  const perfil = getBancoPerfil();
  // Modais: "recusar" (motivo) e "anexar" (upload de contrato).
  const [modal, setModal] = useState<null | "recusar" | "anexar">(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const qc = useQueryClient();
  // Hooks TEM QUE ficar antes de qualquer early return (regras dos hooks) —
  // caso contrario, quando a proposta troca de "undefined" (loading) pra
  // definida, o React ve um numero diferente de hooks e lanca #310.
  const propostaId = proposta?.idUnico ?? "";
  const refresh = () => setVersion((v) => v + 1);
  // Aprovar/recusar batem no BACKEND — persiste e o servidor ve a mudanca.
  const decidir = useMutation({
    mutationFn: (v: { acao: "aprovar" | "cancelar"; motivo?: string }) =>
      atlas.banco.acao(propostaId, v.acao, v.motivo ? { motivo: v.motivo } : undefined),
    onSuccess: () => {
      setSaveError(null);
      qc.invalidateQueries({ queryKey: ["banco", "propostas-api"] });
      qc.invalidateQueries({ queryKey: ["servidor", "propostas"] });
      refresh();
    },
    onError: (err) => {
      setSaveError((err as Error).message || "Falha ao salvar a decisão no servidor.");
    },
  });

  if (!proposta) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ color: "var(--text-muted)" }}>
          {carregandoApi ? "Carregando proposta…" : "Proposta não encontrada."}
        </div>
        {!carregandoApi ? (
          <div>
            <Button variant="ghost" onClick={() => nav("/banco/propostas")}>← Voltar para a fila</Button>
          </div>
        ) : null}
      </div>
    );
  }

  const trava = travaInfo(proposta);

  const aprovar = () => {
    if (decidir.isPending) return;
    decidir.mutate({ acao: "aprovar" });
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
          {proposta.telefoneServidor ? (
            <TelefoneRow telefone={proposta.telefoneServidor} />
          ) : (
            <Row label="Celular" value="—" />
          )}
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
          submitting={decidir.isPending}
          onAprovar={aprovar}
          onAnexarContrato={() => setModal("anexar")}
          onRecusar={() => setModal("recusar")}
        />
      </div>

      {proposta.motivoRecusa ? (
        <div style={{ fontSize: 13, color: "var(--danger-500)" }}>Motivo da recusa: {proposta.motivoRecusa}</div>
      ) : null}
      {proposta.observacao ? (
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Observação / info solicitada: {proposta.observacao}</div>
      ) : null}

      {modal === "recusar" ? (
        <DecisaoModal
          proposta={proposta}
          submitting={decidir.isPending}
          onClose={() => setModal(null)}
          onConfirm={(motivo) => {
            decidir.mutate(
              { acao: "cancelar", motivo },
              { onSuccess: () => setModal(null) },
            );
          }}
        />
      ) : modal === "anexar" ? (
        <AnexarContratoModal
          proposta={proposta}
          onClose={() => setModal(null)}
          onUploaded={() => {
            qc.invalidateQueries({ queryKey: ["banco", "propostas-api"] });
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function NextStep({
  proposta,
  podeAgir,
  perfilNome,
  submitting,
  onAprovar,
  onAnexarContrato,
  onRecusar,
}: {
  proposta: BancoProposta;
  podeAgir: boolean;
  perfilNome: string;
  submitting: boolean;
  onAprovar: () => void;
  onAnexarContrato: () => void;
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

  // Fluxo pedido pelo cliente:
  //   1. Proposta em analise: banco ANEXA o contrato assinado primeiro.
  //   2. Depois de anexar, libera o botao "Aprovar proposta".
  //   3. Depois de aprovada, so tem "Atualizar contrato" — nunca excluir.
  //      Cada atualizacao arquiva a versao antiga no historico (nao apaga).
  if (s === "recebida" || s === "em_analise" || s === "mais_info") {
    const jaAnexado = !!proposta.ccbKey;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
          {jaAnexado
            ? "Contrato anexado. Voce pode aprovar a proposta ou atualizar o arquivo antes."
            : "Analise os dados do servidor e a margem. Para aprovar, anexe primeiro o contrato assinado — sem ele o botao 'Aprovar' fica bloqueado."}
        </div>
        {jaAnexado ? <CcbAnexadoView proposta={proposta} onAtualizar={onAnexarContrato} /> : null}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Button variant="primary" onClick={onAnexarContrato} disabled={submitting}>
            {jaAnexado ? "Atualizar contrato →" : "Anexar contrato →"}
          </Button>
          {jaAnexado ? (
            <Button variant="success" onClick={onAprovar} disabled={submitting}>
              {submitting ? "Aprovando..." : "Aprovar proposta →"}
            </Button>
          ) : null}
          <div style={{ marginLeft: "auto" }}>
            <Button variant="ghost" onClick={onRecusar} disabled={submitting}>Recusar</Button>
          </div>
        </div>
      </div>
    );
  }

  // Aprovada: contrato ja anexado, agora so pode ATUALIZAR (nunca excluir).
  // O historico das versoes anteriores fica visivel no card.
  if (s === "aprovada" || s === "aguardando_formalizacao" || s === "formalizada") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
          Proposta <strong>aprovada</strong>. O contrato ja esta salvo aqui. Se precisar corrigir,
          voce pode atualizar por uma nova versao — a antiga fica arquivada no historico
          e nunca e apagada.
        </div>
        <CcbAnexadoView proposta={proposta} onAtualizar={onAnexarContrato} />
      </div>
    );
  }

  // averbada / recusada / expirada — sem botoes.
  if (s === "averbada") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontSize: 14, color: "var(--success)" }}>
          ✓ Contrato anexado. Prossiga com o servidor por telefone/e-mail pra fechar a formalizacao.
        </span>
        {proposta.ccbKey ? <CcbAnexadoView proposta={proposta} onAtualizar={onAnexarContrato} /> : null}
      </div>
    );
  }
  return (
    <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
      Proposta em <strong>{STATUS_LABEL[s]}</strong> — sem proximos passos.
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

function DecisaoModal({
  proposta,
  submitting,
  onClose,
  onConfirm,
}: {
  proposta: BancoProposta;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (motivo: string | undefined) => void;
}) {
  const [texto, setTexto] = useState("");
  return (
    <div onClick={submitting ? undefined : onClose} style={modalBackdrop}>
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
          <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>Voltar</Button>
          <Button type="button" onClick={() => onConfirm(texto.trim() || undefined)} disabled={submitting}>
            {submitting ? "Recusando..." : "Confirmar recusa"}
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

/** Row de celular do servidor com atalho "Ligar" (`tel:`) e "Copiar". O banco
 *  precisa entrar em contato pra tocar a formalizacao offline. */
function TelefoneRow({ telefone }: { telefone: string }) {
  const digits = telefone.replace(/\D/g, "");
  const fmt = digits.length === 11
    ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    : digits.length === 10
      ? `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
      : telefone;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14, alignItems: "center" }}>
      <span style={{ color: "var(--text-muted)" }}>Celular</span>
      <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <a
          href={`tel:${digits}`}
          style={{ fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--accent)", textDecoration: "none" }}
        >
          {fmt}
        </a>
        <button
          type="button"
          onClick={() => { void navigator.clipboard?.writeText(digits); }}
          title="Copiar"
          style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 6, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}
        >
          Copiar
        </button>
      </span>
    </div>
  );
}

/** Gera um contrato CCB modelo em PDF pro banco imprimir e coletar a assinatura
 *  do servidor PRESENCIALMENTE. Gera client-side (buildSimplePdf) pra nao
 *  depender de auth no endpoint /comprovante.pdf do backend — o browser nao
 *  manda o Bearer token quando <a href> abre a URL direto (401). */
function baixarContratoModelo(proposta: BancoProposta): void {
  const hoje = new Date().toLocaleDateString("pt-BR");
  const bytes = buildSimplePdf("CEDULA DE CREDITO BANCARIO (CCB) - MODELO", [
    { text: `Proposta: ${proposta.idUnico}`, bold: true },
    { text: `Emitida em: ${hoje}` },
    "",
    { text: "1. IDENTIFICACAO DO EMITENTE", bold: true },
    `Nome: ${proposta.nome}`,
    `CPF: ${proposta.cpfMasked}`,
    `Matricula: ${proposta.matricula}`,
    `Convenio: ${proposta.convenio}`,
    "",
    { text: "2. CONDICOES DA OPERACAO", bold: true },
    `Produto: ${PRODUTO_LABEL[proposta.produto]}`,
    `Valor financiado: ${fmtBRL(proposta.valor)}`,
    `Parcelas: ${proposta.parcelas}x de ${fmtBRL(proposta.parcela)}`,
    `Taxa: ${(proposta.taxaAm * 100).toFixed(2)}% a.m.`,
    "",
    { text: "3. CLAUSULAS GERAIS", bold: true },
    "3.1. O EMITENTE declara ter recebido copia integral desta CCB e das",
    "     condicoes gerais aplicaveis ao contrato de credito consignado.",
    "3.2. As parcelas serao descontadas diretamente da folha de pagamento",
    "     do EMITENTE junto ao convenio identificado no item 1.",
    "3.3. Em caso de rescisao do vinculo empregaticio, o saldo devedor",
    "     tornar-se-a exigivel conforme legislacao vigente.",
    "",
    { text: "4. ASSINATURAS", bold: true },
    "",
    "_______________________________________",
    `${proposta.nome} - EMITENTE`,
    `CPF: ${proposta.cpfMasked}`,
    "",
    "_______________________________________",
    "Banco / Representante legal",
    "",
    "_______________________________________",
    "Testemunha 1",
    "",
    "_______________________________________",
    "Testemunha 2",
    "",
    { text: "MODELO PARA DEMONSTRACAO - NAO E DOCUMENTO CONTRATUAL VALIDO.", bold: true },
  ]);
  downloadPdf(`contrato-modelo-${proposta.idUnico}.pdf`, bytes);
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontWeight: 500, fontFamily: mono ? "var(--font-mono)" : undefined, textAlign: "right" }}>{value}</span>
    </div>
  );
}

/** Card mostrando o contrato ja anexado — o operador pode reabrir a qualquer
 *  momento. Faz fetch autenticado (fetchCcbBlob) e abre em blob URL, senao
 *  daria 401 no endpoint (mesmo motivo do bug do comprovante). */
function CcbAnexadoView({ proposta, onAtualizar }: { proposta: BancoProposta; onAtualizar: () => void }) {
  const [abrindoKey, setAbrindoKey] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const abrir = async (key: string) => {
    setErro(null);
    setAbrindoKey(key);
    try {
      const blob = await atlas.banco.fetchCcbBlob(key);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e) {
      setErro((e as Error).message || "Falha ao abrir o arquivo.");
    } finally {
      setAbrindoKey(null);
    }
  };
  const anexadoEm = proposta.ccbAnexadoEm
    ? new Date(proposta.ccbAnexadoEm).toLocaleString("pt-BR")
    : null;
  const nomeArq = proposta.ccbKey?.split("/").pop() ?? "contrato.pdf";
  const historico = (proposta.ccbHistorico ?? []).slice().reverse(); // mais recente primeiro
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Versao atual */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
        background: "color-mix(in srgb, var(--emerald-500) 8%, transparent)",
        border: "1px solid var(--emerald-500)", borderRadius: 10, flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 20 }}>📄</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
            Contrato atual{historico.length > 0 ? ` · versão ${historico.length + 1}` : ""}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, wordBreak: "break-all" }}>
            {nomeArq}{anexadoEm ? ` · ${anexadoEm}` : ""}
          </div>
          {erro ? <div style={{ fontSize: 11, color: "var(--danger-500)", marginTop: 4 }}>{erro}</div> : null}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => proposta.ccbKey && abrir(proposta.ccbKey)}
          disabled={abrindoKey === proposta.ccbKey}
        >
          {abrindoKey === proposta.ccbKey ? "Abrindo..." : "Abrir PDF"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onAtualizar}>Atualizar contrato</Button>
      </div>

      {/* Historico de versoes anteriores — NUNCA excluidas, so arquivadas. */}
      {historico.length > 0 ? (
        <details style={{
          padding: "8px 12px", borderRadius: 8, background: "var(--bg-elev-2)",
          border: "1px solid var(--border)", fontSize: 12,
        }}>
          <summary style={{ cursor: "pointer", color: "var(--text-muted)", userSelect: "none" }}>
            Versoes anteriores ({historico.length})
          </summary>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {historico.map((h, i) => {
              const nome = h.key.split("/").pop() ?? "contrato.pdf";
              const data = new Date(h.anexadoEm).toLocaleString("pt-BR");
              const versao = historico.length - i; // mais recente = versao maior
              return (
                <div key={h.key} style={{
                  display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                  padding: "6px 8px", background: "var(--bg-elev)", borderRadius: 6,
                }}>
                  <span style={{ fontSize: 13 }}>📎</span>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)" }}>
                      Versão {versao} <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>· arquivada em {data}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-dim)", wordBreak: "break-all" }}>{nome}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => abrir(h.key)} disabled={abrindoKey === h.key}>
                    {abrindoKey === h.key ? "Abrindo..." : "Abrir"}
                  </Button>
                </div>
              );
            })}
          </div>
        </details>
      ) : null}
    </div>
  );
}

/** Modal do fluxo "Anexar contrato" — simplesmente escolhe um arquivo PDF
 *  e sobe pro R2. Fluxo pedido pelo cliente: banco anexa antes de aprovar
 *  a proposta; quando ja tem contrato, o mesmo modal serve pra ATUALIZAR
 *  (versao antiga vai automaticamente pro ccbHistorico do backend, nunca
 *  e apagada). Sem opcao de "baixar modelo" — o banco tem o proprio modelo. */
function AnexarContratoModal({
  proposta,
  onClose,
  onUploaded,
}: {
  proposta: BancoProposta;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (!arquivo) {
      setErro("Selecione o PDF do contrato assinado antes de enviar.");
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await atlas.banco.uploadCcb(proposta.idUnico, arquivo);
      onUploaded();
      onClose();
    } catch (e) {
      setErro((e as Error).message || "Falha ao enviar o arquivo.");
    } finally {
      setEnviando(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.type && f.type !== "application/pdf") {
      setErro("Apenas arquivos PDF.");
      setArquivo(null);
      return;
    }
    setErro(null);
    setArquivo(f);
  };

  const jaTemContrato = !!proposta.ccbKey;
  return (
    <div onClick={enviando ? undefined : onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={modalCard}>
        <h3 style={{ margin: 0 }}>{jaTemContrato ? "Atualizar contrato" : "Anexar contrato"}</h3>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {proposta.nome} · <code>{proposta.idUnico}</code>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {jaTemContrato
            ? "Enviar uma nova versao arquiva a atual no historico — nada e excluido."
            : "Escolha o PDF do contrato assinado. Depois de anexar voce pode aprovar a proposta."}
        </div>

        {/* Upload */}
        <div>
          <label style={{
            display: "flex", flexDirection: "column", gap: 8, padding: 20,
            border: "2px dashed var(--border-strong)", borderRadius: 12,
            background: "var(--bg-elev-2)", cursor: enviando ? "not-allowed" : "pointer",
            alignItems: "center", textAlign: "center", opacity: enviando ? 0.6 : 1,
          }}>
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
              disabled={enviando}
            />
          </label>
        </div>

        {erro ? (
          <div style={{
            padding: "8px 12px", borderRadius: 8,
            background: "color-mix(in srgb, var(--danger-500) 10%, transparent)",
            border: "1px solid var(--danger-500)", fontSize: 13, color: "var(--danger-500)",
          }}>
            {erro}
          </div>
        ) : null}

        <FormActions>
          <Button variant="ghost" type="button" onClick={onClose} disabled={enviando}>Voltar</Button>
          <Button type="button" disabled={!arquivo || enviando} onClick={enviar}>
            {enviando ? "Enviando..." : "Enviar contrato"}
          </Button>
        </FormActions>
      </div>
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
