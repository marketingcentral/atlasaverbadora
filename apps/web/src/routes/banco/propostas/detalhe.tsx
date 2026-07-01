import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, FormActions, Pill, TextareaField } from "@atlas/ui/web";
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
  const [modal, setModal] = useState<null | "recusar" | "mais_info">(null);

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
  const podeDecidir = ["recebida", "em_analise", "mais_info"].includes(proposta.status);

  const aprovar = () => {
    patchProposta(proposta.idUnico, { status: "aprovada" });
    refresh();
  };

  return (
    <div key={version} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <Button variant="ghost" size="sm" onClick={() => nav("/banco/propostas")}>← Voltar para a fila</Button>
      </div>

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

      {/* Acoes (Passo 4) — gateadas pelo perfil do operador */}
      <div
        style={{
          display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
          padding: 16, background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12,
        }}
      >
        {!podeDecidir ? (
          <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Esta proposta já está em <strong>{STATUS_LABEL[proposta.status]}</strong> — sem ações de decisão pendentes.
          </span>
        ) : !perfil.perms.aprovacao ? (
          <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Seu perfil <strong>{perfil.nome}</strong> tem apenas permissão de consulta. Ações de decisão indisponíveis.
          </span>
        ) : (
          <>
            <Button variant="success" onClick={aprovar}>Aprovar com link de formalização</Button>
            <Button variant="ghost" onClick={() => setModal("mais_info")}>Solicitar mais informações</Button>
            <Button variant="ghost" onClick={() => setModal("recusar")}>Recusar</Button>
            <span style={{ fontSize: 12, color: "var(--text-dim)", marginLeft: "auto" }}>
              Aprovar avança para o envio do link de formalização (próxima etapa).
            </span>
          </>
        )}
      </div>

      {proposta.motivoRecusa ? (
        <div style={{ fontSize: 13, color: "var(--danger-500)" }}>Motivo da recusa: {proposta.motivoRecusa}</div>
      ) : null}
      {proposta.observacao ? (
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Observação / info solicitada: {proposta.observacao}</div>
      ) : null}

      {modal ? (
        <DecisaoModal
          proposta={proposta}
          tipo={modal}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function DecisaoModal({
  proposta,
  tipo,
  onClose,
  onDone,
}: {
  proposta: BancoProposta;
  tipo: "recusar" | "mais_info";
  onClose: () => void;
  onDone: () => void;
}) {
  const [texto, setTexto] = useState("");
  const recusar = tipo === "recusar";
  const confirmar = () => {
    if (recusar) {
      patchProposta(proposta.idUnico, { status: "recusada", motivoRecusa: texto.trim() });
    } else {
      patchProposta(proposta.idUnico, { status: "mais_info", observacao: texto.trim() });
    }
    onDone();
  };
  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={modalCard}>
        <h3 style={{ margin: 0 }}>{recusar ? "Recusar proposta" : "Solicitar mais informações"}</h3>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {proposta.nome} · <code>{proposta.idUnico}</code>
        </div>
        <TextareaField
          label={recusar ? "Motivo da recusa (obrigatório)" : "O que precisa ser esclarecido (obrigatório)"}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={4}
          required
          minLength={3}
          maxLength={300}
        />
        <FormActions>
          <Button variant="ghost" type="button" onClick={onClose}>Voltar</Button>
          <Button type="button" disabled={texto.trim().length < 3} onClick={confirmar}>
            {recusar ? "Confirmar recusa" : "Enviar solicitação"}
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
