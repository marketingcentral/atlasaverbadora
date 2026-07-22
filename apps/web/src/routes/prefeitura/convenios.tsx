import { useQuery } from "@tanstack/react-query";
import { Card, Pill } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { BackLink } from "./_ui";

// Aba Convenios da prefeitura — SOMENTE LEITURA (cliente 21/07/2026): a
// prefeitura acompanha o que a averbadora configurou; nao edita nada. Layout
// em cards, seguindo a representacao visual do dashboard.
interface ConvRow {
  id: string; nome: string; bancoNome: string; codigoVerba: string;
  prazoTravaHoras: number; prazoPortabilidadeDU: number; prefixo: string; formatoImportacao: string;
}

const eyebrow: React.CSSProperties = { fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" };

/** Bloco de estatistica (rotulo + valor grande), no mesmo espirito do KpiCard. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--bg-elev-2)", borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 11, letterSpacing: ".06em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{value}</div>
    </div>
  );
}

export function PrefeituraConvenios() {
  const q = useQuery({ queryKey: ["prefeitura", "convenios"], queryFn: () => atlas.prefeitura.convenios() });
  const convenios = (q.data?.convenios ?? []) as ConvRow[];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackLink fallback="/prefeitura/dashboard" />
      <header>
        <span style={eyebrow}>Prefeitura</span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Convênios do município</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
          Configurados pela averbadora. Esta tela é <b>somente leitura</b> — a prefeitura acompanha os parâmetros e exigências definidos.
        </p>
      </header>

      {/* Convênios como cards (representação do dashboard). */}
      {q.isLoading ? (
        <Card><span style={{ color: "var(--text-muted)" }}>Carregando…</span></Card>
      ) : convenios.length === 0 ? (
        <Card><span style={{ color: "var(--text-muted)" }}>Nenhum convênio configurado pela averbadora ainda.</span></Card>
      ) : (
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          {convenios.map((c) => (
            <Card key={c.id}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{c.nome}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.bancoNome}</div>
                </div>
                <Pill variant="aceita">{c.id}</Pill>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                <Stat label="Prefixo" value={c.prefixo || "—"} />
                <Stat label="Importação" value={c.formatoImportacao} />
                <Stat label="Trava" value={`${c.prazoTravaHoras}h`} />
                <Stat label="Portabilidade" value={`${c.prazoPortabilidadeDU} DU`} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
