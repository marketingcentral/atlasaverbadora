import { useEffect, useState } from "react";
import { Button, Card, Input } from "@atlas/ui/web";
import { addBancoConvenio, fmtBRL } from "../../lib/banco-propostas";
import { getConveniosDoBanco } from "../../lib/banco-carteira";
import { OPEN_CADASTRO_CONVENIO_EVENT } from "./layout";

export function BancoConvenios() {
  const [tick, setTick] = useState(0);
  const [openModal, setOpenModal] = useState(false);
  const convenios = getConveniosDoBanco();
  void tick; // re-render trigger after add

  useEffect(() => {
    const handler = () => setOpenModal(true);
    window.addEventListener(OPEN_CADASTRO_CONVENIO_EVENT, handler);
    return () => window.removeEventListener(OPEN_CADASTRO_CONVENIO_EVENT, handler);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Convênios
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Prefeituras conveniadas</h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 680 }}>
          Convênios do seu banco dentro da Atlas. Cada banco enxerga apenas os próprios convênios — sem visibilidade dos demais.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {convenios.map((c) => (
          <div key={c.nome} style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: 18 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "1.1rem" }}>{c.nome}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
              <Row label="Contratos ativos" value={`${c.contratosAtivos}`} />
              <Row label="Matrículas únicas" value={`${c.matriculasUnicas}`} />
              <Row label="Volume ativo" value={fmtBRL(c.volumeAtivo)} />
              <Row label="Ticket médio" value={fmtBRL(c.ticketMedio)} />
              <Row label="Quitados (histórico)" value={`${c.quitados}`} />
              <Row
                label="Inadimplentes"
                value={`${c.inadimplentes}`}
                accent={c.inadimplentes > 0 ? "var(--gold-500)" : undefined}
              />
            </div>
            {c.contratosAtivos === 0 ? (
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-dim)", fontStyle: "italic" }}>
                Sem operações averbadas neste convênio ainda.
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {openModal ? (
        <CadastrarConvenioModal
          existentes={convenios.map((c) => c.nome)}
          onCancel={() => setOpenModal(false)}
          onSuccess={() => {
            setOpenModal(false);
            setTick((t) => t + 1);
          }}
        />
      ) : null}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontWeight: 600, color: accent ?? "var(--text)" }}>{value}</span>
    </div>
  );
}

interface CadastrarProps {
  existentes: string[];
  onCancel: () => void;
  onSuccess: () => void;
}

function CadastrarConvenioModal({ existentes, onCancel, onSuccess }: CadastrarProps) {
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [contato, setContato] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function submit() {
    setError(null);
    const trimmed = nome.trim();
    if (!trimmed) {
      setError("Informe o nome do convênio.");
      return;
    }
    if (existentes.some((e) => e.toLowerCase() === trimmed.toLowerCase())) {
      setError("Este convênio já está cadastrado.");
      return;
    }
    setSubmitting(true);
    const ok = addBancoConvenio(trimmed);
    setSubmitting(false);
    if (!ok) {
      setError("Não foi possível salvar. Verifique o armazenamento do navegador e tente novamente.");
      return;
    }
    onSuccess();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cadastrar novo convênio"
      style={{
        position: "fixed",
        inset: 0,
        background: "color-mix(in srgb, var(--navy-900) 70%, transparent)",
        display: "grid",
        placeItems: "center",
        zIndex: 200,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel();
      }}
    >
      <Card style={{ maxWidth: 480, width: "100%" }}>
        <h3 style={{ margin: "0 0 4px" }}>Cadastrar novo convênio</h3>
        <p style={{ margin: "0 0 16px", fontSize: ".88rem", color: "var(--text-muted)" }}>
          Assim que aprovado pela Atlas, o convênio aparece nos filtros de fila, carteira e conciliação.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input
            label="Nome do convênio *"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Prefeitura de Florianópolis"
            autoFocus
          />
          <Input
            label="CNPJ do órgão"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            placeholder="00.000.000/0001-00"
          />
          <Input
            label="Responsável pelo convênio"
            value={contato}
            onChange={(e) => setContato(e.target.value)}
            placeholder="Nome do gestor de RH/folha"
          />
          <Input
            label="E-mail de contato"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="folha@prefeitura.sc.gov.br"
          />
        </div>

        {error ? (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid var(--danger-500)",
              background: "color-mix(in srgb, var(--danger-500) 10%, transparent)",
              fontSize: ".88rem",
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting || !nome.trim()}>
            {submitting ? "Cadastrando…" : "Cadastrar"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
