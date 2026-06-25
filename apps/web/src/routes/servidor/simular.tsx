import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

const PARCELAS = [12, 24, 36, 48, 60, 72, 96];

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function ServidorSimular() {
  const [sp] = useSearchParams();
  const [valor, setValor] = useState<number>(Number(sp.get("valor") ?? 8500));
  const [parcelas, setParcelas] = useState<number>(Number(sp.get("parcelas") ?? 36));
  const taxaAm = useMemo(() => (Number(sp.get("taxa") ?? 1.79) / 100), [sp]);

  const margem = useQuery({ queryKey: ["margem"], queryFn: () => atlas.getMyMargem() });
  const margemEmprestimo = useMemo(() => {
    const t = margem.data?.margens_por_tipo.find((m) => m.tipo === "EMPRESTIMO");
    return t?.disponivel ?? margem.data?.margem.disponivel ?? 0;
  }, [margem.data]);

  const parcela = useMemo(() => {
    if (valor <= 0 || parcelas <= 0) return 0;
    return (valor * taxaAm) / (1 - Math.pow(1 + taxaAm, -parcelas));
  }, [valor, parcelas, taxaAm]);

  const iof = valor * 0.0038 + valor * 0.000082 * Math.min(parcelas * 30, 365);
  const total = parcela * parcelas;
  const cet = ((total / (valor - iof)) ** (1 / parcelas) - 1) * 100;

  const excedeMargem = margem.data ? parcela > margemEmprestimo : false;
  const podeSolicitar = !excedeMargem && !margem.isLoading && valor > 0 && parcelas > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720, width: "100%", margin: "0 auto" }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Simular crédito
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Quanto cabe no seu bolso?</h1>
        <p style={{ color: "var(--text-muted)" }}>Ajuste valor e parcelas para encontrar a melhor opção.</p>
      </header>

      {margem.data ? (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase" }}>
                Sua margem para empréstimo
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--emerald-500)", marginTop: 4 }}>
                {fmtBRL(margemEmprestimo)}
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 320, textAlign: "right" }}>
              Sua parcela mensal não pode ultrapassar essa margem disponível na folha.
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase" }}>
            Valor solicitado
          </span>
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--accent)" }}>{fmtBRL(valor)}</div>
          <input
            type="range"
            min={500}
            max={50000}
            step={100}
            value={valor}
            onChange={(e) => setValor(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--accent)" }}
          />
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 12 }}>
          Quantidade de parcelas
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PARCELAS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setParcelas(p)}
              style={{
                padding: "10px 16px",
                borderRadius: 999,
                border: "1px solid var(--border-strong)",
                background: parcelas === p ? "linear-gradient(135deg, var(--gold-500), var(--gold-400))" : "transparent",
                color: parcelas === p ? "var(--navy-900)" : "var(--text)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {p}×
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Metric label="Sua parcela" valor={fmtBRL(parcela)} accent danger={excedeMargem} />
          <Metric label="Taxa mensal" valor={`${(taxaAm * 100).toFixed(2)}%`} />
          <Metric label="CET mensal" valor={`${cet.toFixed(2)}%`} />
          <Metric label="Total a pagar" valor={fmtBRL(total)} />
        </div>

        {excedeMargem ? (
          <div
            style={{
              marginTop: 18,
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid color-mix(in srgb, #ef4444 60%, transparent)",
              background: "color-mix(in srgb, #ef4444 10%, transparent)",
              color: "var(--text)",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            <b style={{ color: "#ef4444" }}>Parcela acima da sua margem disponível.</b><br />
            A parcela calculada ({fmtBRL(parcela)}) ultrapassa o limite de {fmtBRL(margemEmprestimo)} consignável.
            Reduza o valor ou aumente o número de parcelas.
          </div>
        ) : null}

        <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
          <Button
            disabled={!podeSolicitar}
            onClick={() => {
              if (!podeSolicitar) return;
              alert("Em produção: cria proposta em estado 'criada' e dispara fanout aos bancos elegíveis.");
            }}
          >
            Solicitar agora →
          </Button>
          <Button variant="ghost" onClick={() => window.history.back()}>Voltar</Button>
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, valor, accent, danger }: { label: string; valor: string; accent?: boolean; danger?: boolean }) {
  const color = danger ? "#ef4444" : accent ? "var(--emerald-500)" : "var(--text)";
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color }}>{valor}</div>
    </div>
  );
}
