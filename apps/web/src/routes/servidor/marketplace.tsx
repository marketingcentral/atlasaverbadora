import { useEffect, useMemo, useState } from "react";
import { Button, Card } from "@atlas/ui/web";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { atlas } from "../../lib/sdk";
import { readActiveMatricula, STORAGE_KEY_META, STORAGE_KEY_ID, type MatriculaInfo } from "../../lib/matricula-data";

const pct = (n: number) => `${(n * 100).toFixed(2)}% a.m.`;

/** Normaliza nome de prefeitura/cidade pra matching case-insensitive
 *  sem acentos e sem prefixo "Prefeitura de". */
function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\bprefeitura\s+de\s+/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

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
  // staleTime 0 + refetchOnMount always garante que sempre puxa fresco quando
  // o usuario cai na tela vindo de outro portal. O default do react-query
  // exibe cache stale enquanto refetch acontece em background — para
  // "acabou de mexer e nao mudou" isso confunde, entao forcamos refetch
  // sincrono em cada mount e tambem quando a janela recupera o foco.
  const q = useQuery({
    queryKey: ["servidor", "ofertas"],
    queryFn: () => atlas.servidor.ofertas(),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Filtra por convenio da matricula ativa — casa cidade da oferta OU
  // texto do convenio com o slug da prefeitura ativa. Se nao ha matricula
  // ativa, mostra todas (nao deveria acontecer no fluxo normal).
  const ofertasFiltradas = useMemo(() => {
    const todas = q.data?.ofertas ?? [];
    if (!info) return todas;
    const alvo = slug(info.prefeitura);
    if (!alvo) return todas;
    return todas.filter((o) => {
      const cidade = slug(o.cidade ?? "");
      const conv = slug(o.convenio ?? "");
      return cidade.includes(alvo) || conv.includes(alvo);
    });
  }, [q.data, info]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Ofertas para você
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Marketplace</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Ofertas dos bancos parceiros para o convênio da <b>{info?.prefeitura ?? "sua matrícula"}</b>. Auto-averbação em 3 cliques.
        </p>
      </header>

      {q.isLoading ? (
        <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Carregando ofertas…</div>
      ) : q.error ? (
        <div style={{ color: "var(--danger-500)", fontSize: 14 }}>Falha ao carregar ofertas.</div>
      ) : ofertasFiltradas.length === 0 ? (
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
            Assim que um banco parceiro publicar uma tabela de empréstimo para o seu convênio, ela aparece aqui.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {ofertasFiltradas.map((o) => (
            <Card key={o.id}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent)", textTransform: "uppercase" }}>
                {o.bancoNome}
              </div>
              <h3 style={{ margin: "6px 0", fontSize: "1.1rem" }}>Crédito consignado</h3>
              <p style={{ color: "var(--text-muted)", margin: "4px 0", fontSize: 14 }}>
                Convênio {o.convenio}. Vigência a partir de{" "}
                {new Date(o.vigenciaInicio + "T00:00:00").toLocaleDateString("pt-BR")}
                {o.vigenciaFim ? ` até ${new Date(o.vigenciaFim + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}.
              </p>
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={chip}>{pct(o.taxaMinAm)} a {pct(o.taxaMaxAm)}</span>
                <span style={chip}>Até {o.prazoMaxMeses}×</span>
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <Button
                  size="sm"
                  onClick={() =>
                    nav(
                      `/servidor/simular?valor=10000&parcelas=${Math.min(o.prazoMaxMeses, 60)}&taxa=${(o.taxaMinAm * 100).toFixed(2)}`,
                    )
                  }
                >
                  Simular →
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    nav(
                      `/servidor/termo?tipo=novo&valor=10000&parcelas=${Math.min(o.prazoMaxMeses, 60)}&taxaAm=${(o.taxaMinAm * 100).toFixed(2)}&banco=${encodeURIComponent(o.bancoNome)}`,
                    )
                  }
                >
                  Aceitar oferta →
                </Button>
              </div>
            </Card>
          ))}
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
