import { useQuery } from "@tanstack/react-query";
import { Card, Pill } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { BackLink } from "./_ui";

// Aba Convenios da prefeitura — SOMENTE LEITURA (cliente 21/07/2026): a
// prefeitura acompanha TODA a config que a averbadora definiu; nao edita nada.
// Layout em cards com quadrados de pontas redondas.
interface ConvRow {
  id: string; nome: string; bancoNome: string; codigoVerba: string;
  dataCorte: number; diaRepasse: number;
  prazoTravaHoras: number; prazoPortabilidadeDU: number; prefixo: string; formatoImportacao: string;
  maxParcelas: number; taxaMaxAm: number; maxComprometimentoPct: number; idadeMin: number; idadeMax: number;
  vigenciaInicio: string; vigenciaFim: string | null; vinculosAceitos: string[]; regrasEspeciais: string; ativo: boolean;
}

const eyebrow: React.CSSProperties = { fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" };
const fmtDate = (s: string | null) => {
  if (!s) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

/** Quadrado de estatistica — pontas redondas, rotulo + valor. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--bg-elev-2)", border: "1px solid var(--border)", borderRadius: 14, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, letterSpacing: ".06em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginTop: 3 }}>{value}</div>
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
          Configurados pela averbadora. Esta tela é <b>somente leitura</b> — a prefeitura acompanha todos os parâmetros definidos.
        </p>
      </header>

      {q.isLoading ? (
        <Card><span style={{ color: "var(--text-muted)" }}>Carregando…</span></Card>
      ) : convenios.length === 0 ? (
        <Card><span style={{ color: "var(--text-muted)" }}>Nenhum convênio configurado pela averbadora ainda.</span></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {convenios.map((c) => (
            <Card key={c.id}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{c.nome}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.bancoNome}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Pill variant={c.ativo ? "emdia" : "expirado"}>{c.ativo ? "Vigente" : "Inativo"}</Pill>
                  <Pill variant="aceita">{c.id}</Pill>
                </div>
              </div>

              {/* Quadrados de pontas redondas com toda a config (defensivo:
                  campos podem faltar se o isolate da API ainda nao propagou). */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                {/* Dados do cadastro do convenio (modal "Editar" da averbadora) —
                    cliente pediu 23/07/2026 pra prefeitura enxergar tambem. */}
                <Stat label="Código verba" value={c.codigoVerba || "—"} />
                <Stat label="Dia de corte" value={c.dataCorte != null ? `Dia ${c.dataCorte}` : "—"} />
                <Stat label="Dia de repasse" value={c.diaRepasse != null ? `Dia ${c.diaRepasse}` : "—"} />
                <Stat label="Prefixo" value={c.prefixo || "—"} />
                <Stat label="Importação" value={c.formatoImportacao || "—"} />
                <Stat label="Trava regular" value={c.prazoTravaHoras != null ? `${c.prazoTravaHoras}h` : "—"} />
                <Stat label="Trava portabilidade" value={c.prazoPortabilidadeDU != null ? `${c.prazoPortabilidadeDU} DU` : "—"} />
                <Stat label="Máx. parcelas" value={c.maxParcelas != null ? String(c.maxParcelas) : "—"} />
                <Stat label="Taxa a.m." value={c.taxaMaxAm != null ? `${c.taxaMaxAm}%` : "—"} />
                <Stat label="Máx. comprometimento" value={c.maxComprometimentoPct != null ? `${Math.round(c.maxComprometimentoPct * 100)}%` : "—"} />
                <Stat label="Faixa etária" value={(c.idadeMin != null && c.idadeMax != null) ? `${c.idadeMin}–${c.idadeMax}` : "—"} />
                <Stat label="Vigência" value={`${fmtDate(c.vigenciaInicio)} → ${fmtDate(c.vigenciaFim)}`} />
              </div>

              {/* Vínculos aceitos. */}
              <div style={{ marginTop: 14 }}>
                <div style={{ ...eyebrow, fontSize: 11, marginBottom: 6 }}>Vínculos aceitos</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(c.vinculosAceitos ?? []).length > 0
                    ? (c.vinculosAceitos ?? []).map((v) => <Pill key={v} variant="aceita">{v}</Pill>)
                    : <span style={{ fontSize: 13, color: "var(--text-muted)" }}>—</span>}
                </div>
              </div>

              {/* Regras especiais. */}
              {c.regrasEspeciais ? (
                <div style={{ marginTop: 14 }}>
                  <div style={{ ...eyebrow, fontSize: 11, marginBottom: 6 }}>Regras especiais</div>
                  <div style={{ background: "var(--bg-elev-2)", border: "1px solid var(--border)", borderRadius: 14, padding: "12px 14px", fontSize: 13, color: "var(--text-muted)" }}>
                    {c.regrasEspeciais}
                  </div>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
