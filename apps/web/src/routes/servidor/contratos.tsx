import { useEffect, useState } from "react";
import { Button, Card, Pill, Tabs } from "@atlas/ui/web";
import {
  ContratoMock as Contrato,
  MatriculaInfo,
  readActiveMatricula,
  STORAGE_KEY_ID,
  STORAGE_KEY_META,
} from "../../lib/matricula-data";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function ServidorContratos() {
  const [tab, setTab] = useState<"todos" | "ativos" | "quitados">("todos");
  const [downloading, setDownloading] = useState<string | null>(null);
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

  const contratos: Contrato[] = info?.contratos ?? [];

  const filtered = contratos.filter((c) => {
    if (tab === "ativos") return c.status !== "Quitado";
    if (tab === "quitados") return c.status === "Quitado";
    return true;
  });

  async function baixarPdf(c: Contrato) {
    setDownloading(c.id);
    // Mock: pretend to generate signed URL (~700ms) before opening.
    await new Promise((r) => setTimeout(r, 700));
    setDownloading(null);
    window.open(c.pdfUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Meus contratos
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Contratos ativos e histórico</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6, fontSize: ".9rem" }}>
          {info ? <>Contratos da matricula <b>{info.matricula}</b> ({info.prefeitura}).{" "}</> : null}
          Quitacao antecipada nao e feita pelo Atlas — contate diretamente o banco credor.
        </p>
      </header>

      <Tabs
        variant="pills"
        activeKey={tab}
        onChange={(k) => setTab(k as typeof tab)}
        tabs={[
          { key: "todos", label: "Todos" },
          { key: "ativos", label: "Ativos" },
          { key: "quitados", label: "Quitados" },
        ]}
      />

      {filtered.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "24px 12px" }}>
            <div style={{ fontSize: 36, opacity: 0.5 }}>📄</div>
            <h3 style={{ marginTop: 12, marginBottom: 6 }}>Sem contratos nesta categoria</h3>
            <p style={{ color: "var(--text-muted)", fontSize: ".9rem", maxWidth: 380, margin: "0 auto" }}>
              {tab === "ativos"
                ? "Voce nao tem contratos ativos nesta matricula no momento."
                : tab === "quitados"
                  ? "Voce ainda nao quitou nenhum contrato nesta matricula."
                  : "Nenhum contrato registrado para esta matricula."}
            </p>
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((c) => {
            const pct = (c.parcelasPagas / c.total) * 100;
            const quitado = c.status === "Quitado";
            return (
              <Card key={c.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{c.banco}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      Contrato #{c.id}
                    </div>
                  </div>
                  <Pill variant={quitado ? "emdia" : c.status === "Averbado" ? "averbado" : "aceita"}>{c.status}</Pill>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: 12,
                    marginTop: 16,
                    fontSize: 13,
                  }}
                >
                  <KV label="Parcela" v={fmtBRL(c.parcela)} accent />
                  <KV label="Progresso" v={`${c.parcelasPagas}/${c.total}`} />
                  <KV label="Proxima" v={c.proximaParcela} />
                  <KV label="Taxa a.m." v={`${c.taxaAm.toFixed(2)}%`} />
                  <KV label="Valor financiado" v={fmtBRL(c.valorFinanciado)} />
                </div>

                <div style={{ marginTop: 12, height: 6, background: "var(--bg-elev-2)", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: quitado
                        ? "var(--emerald-500)"
                        : "linear-gradient(90deg, var(--gold-500), var(--emerald-500))",
                    }}
                  />
                </div>

                <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Button size="sm" variant="ghost" onClick={() => baixarPdf(c)} disabled={downloading === c.id}>
                    {downloading === c.id ? "Gerando link…" : "📄 Baixar PDF"}
                  </Button>
                  {!quitado ? (
                    <span style={{ fontSize: ".82rem", color: "var(--text-muted)", alignSelf: "center" }}>
                      Para quitar: fale com o {c.banco}.
                    </span>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KV({ label, v, accent }: { label: string; v: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ marginTop: 4, color: accent ? "var(--accent)" : "var(--text)", fontWeight: accent ? 700 : 500 }}>
        {v}
      </div>
    </div>
  );
}
