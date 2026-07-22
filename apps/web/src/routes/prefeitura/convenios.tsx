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

/** Item de exigencia com icone + estado ON/OFF (verde quando exigido). */
function ExigItem({ icon, label, hint, on }: { icon: string; label: string; hint: string; on: boolean }) {
  return (
    <div style={{
      display: "flex", gap: 12, padding: 14, borderRadius: 12,
      background: on ? "color-mix(in srgb, var(--emerald-500) 8%, var(--bg-elev-2))" : "var(--bg-elev-2)",
      border: `1px solid ${on ? "var(--emerald-500)" : "var(--border)"}`,
      transition: "border-color .15s, background .15s",
    }}>
      <span style={{ fontSize: 24, lineHeight: 1 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{label}</span>
          <span style={{
            fontSize: 11, fontWeight: 800, letterSpacing: ".03em", padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap",
            background: on ? "color-mix(in srgb, var(--emerald-500) 22%, transparent)" : "var(--bg-elev)",
            color: on ? "var(--emerald-500)" : "var(--text-dim)",
          }}>
            {on ? "● EXIGIDO" : "○ NÃO EXIGIDO"}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{hint}</div>
      </div>
    </div>
  );
}

export function PrefeituraConvenios() {
  const q = useQuery({ queryKey: ["prefeitura", "convenios"], queryFn: () => atlas.prefeitura.convenios() });
  const cfg = useQuery({ queryKey: ["prefeitura", "config"], queryFn: () => atlas.prefeitura.getConfig() });
  const convenios = (q.data?.convenios ?? []) as ConvRow[];
  const exigeCcb = cfg.data?.exigeCcb ?? false;
  const exige2fa = cfg.data?.exigeBanco2FA ?? false;

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

      {/* Exigências ao banco — read-only, com estado dinâmico. */}
      <Card>
        <b>Exigências ao banco na averbação</b>
        <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "4px 0 0", maxWidth: 640 }}>
          Travas de segurança que a averbadora impõe aos bancos pra averbar contratos desta prefeitura.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginTop: 14 }}>
          <ExigItem icon="📎" label="Anexo da CCB" hint="Banco precisa anexar a Cédula de Crédito Bancário (PDF) para averbar." on={exigeCcb} />
          <ExigItem icon="🔐" label="Verificação em duas etapas (2FA)" hint="Banco confirma a averbação com um código enviado por e-mail." on={exige2fa} />
        </div>
      </Card>

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
