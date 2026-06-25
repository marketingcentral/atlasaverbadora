import { Button, Card } from "@atlas/ui/web";
import { useNavigate } from "react-router-dom";

interface OfertaMock {
  id: string;
  banco: string;
  titulo: string;
  destaque: string;
  resumo: string;
  taxaAm: number;
  parcelasMax: number;
}

const OFERTAS: OfertaMock[] = [
  {
    id: "OFT-1",
    banco: "SCred Financeira",
    titulo: "Consignado com taxa especial",
    destaque: "1,51% a.m.",
    resumo: "Condições exclusivas para servidores municipais com mais de 3 anos.",
    taxaAm: 0.0151,
    parcelasMax: 96,
  },
  {
    id: "OFT-2",
    banco: "Banco BMG",
    titulo: "Portabilidade com troco",
    destaque: "Até 30% troco",
    resumo: "Traga seu contrato e receba até 30% do saldo devedor de volta.",
    taxaAm: 0.0172,
    parcelasMax: 84,
  },
  {
    id: "OFT-3",
    banco: "Pan Crédito",
    titulo: "Cartão benefícios pré-aprovado",
    destaque: "R$ 1.000 limite",
    resumo: "Limite pré-aprovado disponível para uso imediato.",
    taxaAm: 0.0179,
    parcelasMax: 60,
  },
];

export function ServidorMarketplace() {
  const nav = useNavigate();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Ofertas para você
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Marketplace</h1>
        <p style={{ color: "var(--text-muted)" }}>Ofertas pré-aprovadas por bancos parceiros. Auto-averbação em 3 cliques.</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {OFERTAS.map((o) => (
          <Card key={o.id}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent)", textTransform: "uppercase" }}>
              {o.banco}
            </div>
            <h3 style={{ margin: "6px 0", fontSize: "1.1rem" }}>{o.titulo}</h3>
            <p style={{ color: "var(--text-muted)", margin: "4px 0", fontSize: 14 }}>{o.resumo}</p>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={chip}>{o.destaque}</span>
              <span style={chip}>Até {o.parcelasMax}×</span>
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <Button
                size="sm"
                onClick={() =>
                  nav(`/servidor/simular?valor=10000&parcelas=60&taxa=${(o.taxaAm * 100).toFixed(2)}`)
                }
              >
                Simular →
              </Button>
              <Button size="sm" variant="ghost" onClick={() => alert("Em produção: cria proposta com aceite imediato.")}>
                Aceitar oferta
              </Button>
            </div>
          </Card>
        ))}
      </div>
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
