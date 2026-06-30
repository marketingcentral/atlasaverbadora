import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Pill } from "@atlas/ui/web";

interface ContratoElegivel {
  id: string;
  banco: string;
  saldoDevedor: number;
  parcela: number;
  parcelasRestantes: number;
  totalParcelas: number;
  taxaAm: number;
  tipoContrato: "Emprestimo" | "Refin";
}

const META_KEY = "atlas:idMatricula:meta";

interface MatriculaMeta {
  idMatricula: string;
  matricula: string;
  prefeitura: string;
}

function readMeta(): MatriculaMeta | null {
  try {
    const raw = window.localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as MatriculaMeta) : null;
  } catch {
    return null;
  }
}

// Mock: contratos elegiveis por matricula (sao os ativos com taxa > taxa-destino).
const ELEGIVEIS_POR_MATRICULA: Record<string, ContratoElegivel[]> = {
  "MAT-852029100": [
    {
      id: "ADF-472600084", banco: "Banco Y", saldoDevedor: 18420.55, parcela: 412.4,
      parcelasRestantes: 32, totalParcelas: 36, taxaAm: 1.95, tipoContrato: "Emprestimo",
    },
    {
      id: "ADF-460690084", banco: "Pan Credito", saldoDevedor: 6210.32, parcela: 320.1,
      parcelasRestantes: 24, totalParcelas: 24, taxaAm: 1.99, tipoContrato: "Emprestimo",
    },
  ],
  "MAT-009821": [
    {
      id: "ADF-F0021", banco: "Banco Y", saldoDevedor: 9840.75, parcela: 412.4,
      parcelasRestantes: 28, totalParcelas: 36, taxaAm: 1.85, tipoContrato: "Emprestimo",
    },
  ],
};

// Banco que aceitaria a portabilidade (mock).
const BANCO_DESTINO = {
  nome: "SCred Financeira",
  taxaAm: 1.65,
};

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function ServidorPortabilidade() {
  const nav = useNavigate();
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [meta, setMeta] = useState<MatriculaMeta | null>(() => readMeta());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === META_KEY) {
        setMeta(readMeta());
        setSelecionados(new Set());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const ELEGIVEIS = meta ? ELEGIVEIS_POR_MATRICULA[meta.idMatricula] ?? [] : [];

  function toggle(id: string) {
    setSelecionados((s) => {
      const ns = new Set(s);
      if (ns.has(id)) ns.delete(id);
      else ns.add(id);
      return ns;
    });
  }

  const totalSaldo = ELEGIVEIS
    .filter((c) => selecionados.has(c.id))
    .reduce((a, c) => a + c.saldoDevedor, 0);
  const totalParcelaAtual = ELEGIVEIS
    .filter((c) => selecionados.has(c.id))
    .reduce((a, c) => a + c.parcela, 0);

  // Estimativa de nova parcela com taxa do banco destino (calculo muito simplificado para mockup).
  const novoPrazo = 48;
  const novaParcela = totalSaldo > 0
    ? totalSaldo * (BANCO_DESTINO.taxaAm / 100) / (1 - Math.pow(1 + BANCO_DESTINO.taxaAm / 100, -novoPrazo))
    : 0;
  const economia = totalParcelaAtual - novaParcela;

  function consolidar() {
    const params = new URLSearchParams({
      tipo: "portabilidade",
      banco: BANCO_DESTINO.nome,
      valor: String(Math.round(totalSaldo)),
      parcelas: String(novoPrazo),
      parcela: novaParcela.toFixed(2),
      taxaAm: BANCO_DESTINO.taxaAm.toFixed(2),
    });
    nav(`/servidor/termo?${params.toString()}`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span className="eyebrow">Portabilidade / Compra de divida</span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Consolidar seus contratos</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
          Selecione os contratos que voce quer mover para o {BANCO_DESTINO.nome} (taxa proposta:{" "}
          <b style={{ color: "var(--emerald-500)" }}>{BANCO_DESTINO.taxaAm.toFixed(2)}% a.m.</b>). A trava de margem para
          portabilidade dura <b>7 dias uteis</b>.
        </p>
      </header>

      {ELEGIVEIS.length === 0 ? (
        <Card>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>
            Voce nao tem contratos elegiveis para portabilidade no momento.
          </p>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {ELEGIVEIS.map((c) => {
            const checked = selecionados.has(c.id);
            return (
              <Card
                key={c.id}
                style={{
                  borderColor: checked ? "var(--gold-500)" : undefined,
                  cursor: "pointer",
                }}
              >
                <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(c.id)}
                    style={{ marginTop: 4 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{c.banco}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                          {c.id} · {c.tipoContrato}
                        </div>
                      </div>
                      <Pill variant="pendente">Elegivel</Pill>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginTop: 14, fontSize: 13 }}>
                      <KV label="Saldo devedor" v={fmtBRL(c.saldoDevedor)} accent />
                      <KV label="Parcela atual" v={fmtBRL(c.parcela)} />
                      <KV label="Restantes" v={`${c.parcelasRestantes}/${c.totalParcelas}`} />
                      <KV label="Taxa atual" v={`${c.taxaAm.toFixed(2)}% a.m.`} />
                    </div>
                  </div>
                </label>
              </Card>
            );
          })}
        </div>
      )}

      {selecionados.size > 0 ? (
        <Card style={{ position: "sticky", bottom: 16, borderColor: "var(--gold-500)" }}>
          <h3 style={{ marginTop: 0 }}>Simulacao de portabilidade ({selecionados.size} contrato(s))</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginTop: 8 }}>
            <KV label="Saldo a quitar" v={fmtBRL(totalSaldo)} />
            <KV label="Parcela atual (soma)" v={fmtBRL(totalParcelaAtual)} />
            <KV label="Nova parcela" v={fmtBRL(novaParcela)} accent />
            {economia > 0 ? (
              <KV label="Economia / parcela" v={`- ${fmtBRL(economia)}`} accent />
            ) : (
              <KV
                label="Diferenca"
                v={`+ ${fmtBRL(Math.abs(economia))}`}
                muted
              />
            )}
          </div>
          <p style={{ fontSize: ".82rem", color: "var(--text-muted)", marginTop: 12, marginBottom: 16 }}>
            Estimativa em {novoPrazo} parcelas com a taxa do {BANCO_DESTINO.nome}. O valor final pode variar apos a
            analise do banco.
            {economia <= 0 ? (
              <>
                {" "}
                <b>Atencao:</b> nesta simulacao a parcela nova ficou maior que a soma das atuais. A portabilidade pode
                ainda valer a pena se o objetivo for alongar prazo ou consolidar contratos.
              </>
            ) : null}
          </p>
          <Button onClick={consolidar}>Consolidar e ir para o termo →</Button>
        </Card>
      ) : null}
    </div>
  );
}

function KV({ label, v, accent, muted }: { label: string; v: string; accent?: boolean; muted?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase" }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 4,
          color: accent ? "var(--emerald-500)" : muted ? "var(--text-muted)" : "var(--text)",
          fontWeight: accent ? 700 : 500,
        }}
      >
        {v}
      </div>
    </div>
  );
}
