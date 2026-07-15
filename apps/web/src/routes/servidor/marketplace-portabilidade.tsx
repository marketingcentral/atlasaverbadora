import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { readActiveMatricula, STORAGE_KEY_META, STORAGE_KEY_ID, type MatriculaInfo } from "../../lib/matricula-data";

const pct = (n: number) => `${(n * 100).toFixed(2)}% a.m.`;

/** Deriva label/cor/CTA/href do card de oferta a partir do tipo. Centraliza o
 *  roteamento pra manter o JSX enxuto e o comportamento consistente entre esta
 *  pagina e /servidor/marketplace. */
function tipoLabelHref(
  o: {
    id: string;
    tipo: "credito_novo" | "portabilidade" | "refinanciamento" | "cartao_consignado" | "cartao_beneficio";
    bancoNome: string;
    taxaAm: number;
    valorMax: number;
  },
  valorSug: number,
  parcelasSug: number,
): { label: string; cor: string; cta: string; href: string } {
  if (o.tipo === "portabilidade") {
    return {
      label: "🔁 Portabilidade",
      cor: "var(--gold-500)",
      cta: "Consolidar contratos →",
      href: `/servidor/portabilidade?banco=${encodeURIComponent(o.bancoNome)}`,
    };
  }
  if (o.tipo === "refinanciamento") {
    return {
      label: "🔄 Refinanciamento",
      cor: "var(--accent)",
      cta: "Refinanciar contrato →",
      // Modo refin: mesma pagina de portabilidade, mas so lista contratos com
      // este banco (a origem = destino) e libera troco/prazo estendido.
      href: `/servidor/portabilidade?modo=refin&banco=${encodeURIComponent(o.bancoNome)}`,
    };
  }
  if (o.tipo === "cartao_consignado" || o.tipo === "cartao_beneficio") {
    const label = o.tipo === "cartao_consignado" ? "💳 Cartão consignado" : "🎫 Cartão benefício";
    return {
      label,
      cor: "var(--gold-500)",
      cta: "Solicitar cartão →",
      // Fluxo proprio de cartao — mostra margem cartao correspondente + limite
      // proposto e faz POST /me/cartoes ao confirmar.
      href: `/servidor/solicitar-cartao?produto=${o.tipo}&banco=${encodeURIComponent(o.bancoNome)}&limite=${Math.round(o.valorMax)}&oferta=${encodeURIComponent(o.id)}`,
    };
  }
  return {
    label: "💰 Crédito novo",
    cor: "var(--emerald-500)",
    cta: "Aceitar oferta →",
    href: `/servidor/termo?tipo=novo&valor=${valorSug}&parcelas=${parcelasSug}&taxaAm=${(o.taxaAm * 100).toFixed(2)}&banco=${encodeURIComponent(o.bancoNome)}`,
  };
}

export function ServidorMarketplacePortabilidade() {
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

  const matAtiva = info?.matricula;

  // Ofertas: SO ofertas que o banco criou e publicou manualmente (marketing/
  // campanha). NAO as tabelas de emprestimo automaticas — o cliente disse:
  // "esse espaco e apenas para ofertas que o banco criar e publicar".
  // Backend ja filtra por perfil (convenio+prefeitura+vinculo+situacao+salario).
  const ofertasQ = useQuery({
    queryKey: ["servidor", "ofertas-banco", matAtiva],
    queryFn: () => atlas.servidor.getMyOfertasBanco(matAtiva),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    enabled: !!matAtiva,
  });

  // Cartao Beneficio nao entra no app (decisao cliente 14/07/2026). Filtra
  // ofertas desse tipo antes de renderizar — servidor nao ve nem clica.
  const ofertas = (ofertasQ.data?.ofertas ?? []).filter((o) => o.tipo !== "cartao_beneficio");

  if (!info) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1080, width: "100%", margin: "0 auto" }}>
      {/* Header */}
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Portal do servidor
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem", letterSpacing: "-0.02em" }}>Portabilidade</h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0" }}>
          Ofertas dos bancos parceiros para o convênio da <b>{info.prefeitura}</b>. Simule ou solicite portabilidade abaixo.
        </p>
      </header>

      {/* 1. OFERTAS DOS BANCOS PARCEIROS (primeira secao — cards com tabelas).
          Se nao ha oferta, a secao inteira some (nao mostra mais o placeholder
          "Nenhuma oferta ativa"). Cliente pediu — as demais secoes (Rede de
          saude, Solicitar portabilidade) preenchem a tela mesmo sem ofertas. */}
      {ofertasQ.isLoading ? (
        <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Carregando ofertas…</div>
      ) : ofertasQ.error ? (
        <div style={{ color: "var(--danger-500)", fontSize: 14 }}>Falha ao carregar ofertas.</div>
      ) : ofertas.length === 0 ? null : (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 11, letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Ofertas para você
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {ofertas.map((o) => {
              const valorSug = Math.min(o.valorMax, 10000);
              const parcelasSug = Math.min(o.parcelasMax, 60);
              // CTA por tipo:
              //  credito_novo    → /servidor/termo (fluxo de aceite ja existente)
              //  portabilidade   → /servidor/portabilidade com este banco pre-selecionado
              //  refinanciamento → /servidor/portabilidade em modo refin, filtrado pelos contratos do banco desta oferta
              const tipoMeta = tipoLabelHref(o, valorSug, parcelasSug);
              return (
                <Card key={o.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent)", textTransform: "uppercase" }}>
                      {o.bancoNome}
                    </div>
                    <span style={{ fontSize: 10, letterSpacing: "0.06em", fontWeight: 700, color: tipoMeta.cor }}>
                      {tipoMeta.label}
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
                    <span style={chip}>Até {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(o.valorMax)}</span>
                  </div>
                  <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                    <Button size="sm" variant="ghost" onClick={() => nav(tipoMeta.href)}>
                      {tipoMeta.cta}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Secao "Rede de saude parceira" foi removida a pedido do cliente
          (15/07/2026). Os beneficios de saude vivem exclusivamente na aba
          /servidor/beneficios agora. */}

      {/* Botao de PORTABILIDADE (destaque medio) */}
      <AcaoCard
        icone="🔁"
        titulo="Solicitar portabilidade"
        descricao="Consolide seus contratos em outro banco com taxa menor e libere margem."
        cor="var(--gold-500)"
        onClick={() => nav("/servidor/portabilidade")}
      />

      {/* Cliente pediu que o Marketplace mostre SO Ofertas + Solicitar portabilidade.
          Simulador (era secao 3) foi removido — servidor simula pelos botoes "Simular"
          dos cards de margem no dashboard, nao aqui.
          Propostas de portabilidade dos bancos (era secao 4) tambem foi removida por
          pedido explicito ("so quero que apareca (Ofertas para voce e Solicitar Portabilidade)").
          As propostas seguem chegando via /servidor/portabilidade. */}
    </div>
  );
}

/** Card grande de acao — usado agora so pra "Solicitar portabilidade". */
function AcaoCard({
  icone, titulo, descricao, cor, onClick,
}: {
  icone: string; titulo: string; descricao: string; cor: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 18,
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        cursor: "pointer",
        transition: "border-color .12s ease, transform .12s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = cor;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `color-mix(in srgb, ${cor} 15%, transparent)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, flexShrink: 0,
      }}>{icone}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{titulo}</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
          {descricao}
        </div>
      </div>
      <span style={{ fontSize: 22, color: cor, alignSelf: "center" }}>→</span>
    </button>
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
