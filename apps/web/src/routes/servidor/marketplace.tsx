import { useEffect, useState } from "react";
import { Button, Card } from "@atlas/ui/web";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { atlas } from "../../lib/sdk";
import { readActiveMatricula, STORAGE_KEY_META, STORAGE_KEY_ID, type MatriculaInfo } from "../../lib/matricula-data";

const pct = (n: number) => `${(n * 100).toFixed(2)}% a.m.`;
const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

/** Rota antiga /servidor/marketplace — hoje fora do menu, mas mantida pra links
 *  diretos. Mostra so ofertas que os bancos publicaram manualmente (marketing),
 *  igual a /servidor/marketplace/portabilidade. Nao mostra mais tabelas
 *  automaticas de convenio — cliente pediu "esse espaco e apenas para ofertas
 *  que o banco criar e publicar". */
export function ServidorMarketplace() {
  const nav = useNavigate();
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

  const q = useQuery({
    queryKey: ["servidor", "ofertas-banco", info?.matricula],
    queryFn: () => atlas.servidor.getMyOfertasBanco(info?.matricula),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    enabled: !!info?.matricula,
  });

  const ofertas = q.data?.ofertas ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Ofertas para você
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Marketplace</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Ofertas que os bancos parceiros criaram pra <b>{info?.prefeitura ?? "sua matrícula"}</b>. Auto-averbação em 3 cliques.
        </p>
      </header>

      {q.isLoading ? (
        <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Carregando ofertas…</div>
      ) : q.error ? (
        <div style={{ color: "var(--danger-500)", fontSize: 14 }}>Falha ao carregar ofertas.</div>
      ) : ofertas.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            border: "1px dashed var(--border-strong)",
            borderRadius: 12,
            color: "var(--text-muted)",
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
          <div style={{ fontWeight: 600 }}>Nenhuma oferta ativa no momento</div>
          <p style={{ fontSize: 13, margin: "6px auto 0", maxWidth: 480 }}>
            Este espaço mostra apenas ofertas que os bancos parceiros criam e publicam pra você.
            Assim que uma cair, aparece aqui.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {ofertas.map((o) => {
            const valorSug = Math.min(o.valorMax, 10000);
            const parcelasSug = Math.min(o.parcelasMax, 60);
            let tipoLabel: string, tipoCor: string, ctaLabel: string, href: string;
            if (o.tipo === "portabilidade") {
              tipoLabel = "🔁 Portabilidade"; tipoCor = "var(--gold-500)";
              ctaLabel = "Consolidar contratos →";
              href = `/servidor/portabilidade?banco=${encodeURIComponent(o.bancoNome)}`;
            } else if (o.tipo === "refinanciamento") {
              tipoLabel = "🔄 Refinanciamento"; tipoCor = "var(--accent)";
              ctaLabel = "Refinanciar contrato →";
              href = `/servidor/portabilidade?modo=refin&banco=${encodeURIComponent(o.bancoNome)}`;
            } else {
              tipoLabel = "💰 Crédito novo"; tipoCor = "var(--emerald-500)";
              ctaLabel = "Aceitar oferta →";
              href = `/servidor/termo?tipo=novo&valor=${valorSug}&parcelas=${parcelasSug}&taxaAm=${(o.taxaAm * 100).toFixed(2)}&banco=${encodeURIComponent(o.bancoNome)}`;
            }
            return (
              <Card key={o.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent)", textTransform: "uppercase" }}>
                    {o.bancoNome}
                  </div>
                  <span style={{ fontSize: 10, letterSpacing: "0.06em", fontWeight: 700, color: tipoCor }}>
                    {tipoLabel}
                  </span>
                </div>
                <h3 style={{ margin: "6px 0", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 8 }}>
                  {o.icone ? <span style={{ fontSize: "1.3rem" }}>{o.icone}</span> : null}
                  <span>{o.titulo}</span>
                </h3>
                <p style={{ color: "var(--text-muted)", margin: "4px 0", fontSize: 14 }}>
                  {o.mensagem}
                </p>
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={chip}>{pct(o.taxaAm)}</span>
                  <span style={chip}>Até {o.parcelasMax}×</span>
                  <span style={chip}>Até {fmtBRL(o.valorMax)}</span>
                </div>
                <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                  <Button size="sm" variant="ghost" onClick={() => nav(href)}>
                    {ctaLabel}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

const chip: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 999,
  background: "var(--bg-elev-2)",
  color: "var(--text-muted)",
  fontSize: 11,
  fontWeight: 600,
};
