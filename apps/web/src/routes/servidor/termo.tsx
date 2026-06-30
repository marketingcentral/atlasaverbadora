import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card } from "@atlas/ui/web";
import { TwoFactorModal } from "../../components/TwoFactorModal";

type Tipo = "novo" | "portabilidade" | "refinanciamento";

const TIPO_LABEL: Record<Tipo, string> = {
  novo: "Novo emprestimo",
  portabilidade: "Portabilidade de divida",
  refinanciamento: "Refinanciamento",
};

// Prazos do lock conforme a spec (parametrizavel por convenio em prod).
const PRAZOS: Record<Tipo, { horas?: number; diasUteis?: number; label: string }> = {
  novo: { horas: 48, label: "48 horas" },
  portabilidade: { diasUteis: 7, label: "7 dias uteis" },
  refinanciamento: { diasUteis: 7, label: "7 dias uteis" },
};

const PROPOSTAS_KEY = "atlas:propostas:userCriadas";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

// Number(...) | default — converte string para number; se invalida (NaN), usa o default.
function num(raw: string | null, fallback: number): number {
  if (raw == null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function ServidorTermo() {
  const nav = useNavigate();
  const [search] = useSearchParams();
  const rawTipo = search.get("tipo") ?? "novo";
  const tipo: Tipo = rawTipo === "portabilidade" || rawTipo === "refinanciamento" ? rawTipo : "novo";
  const banco = search.get("banco") ?? "SCred Financeira";
  const valor = num(search.get("valor"), 25000);
  const parcelas = num(search.get("parcelas"), 48);
  const parcela = num(search.get("parcela"), 750);
  const taxaAm = num(search.get("taxaAm"), 1.8);

  const [aceito, setAceito] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [done, setDone] = useState<null | { propostaId: string; quando: Date; ip: string; device: string }>(null);

  const prazo = PRAZOS[tipo];
  const tipoLabel = TIPO_LABEL[tipo];

  const propostaId = useMemo(
    () => `PRO-${Math.floor(Math.random() * 9000 + 1000)}`,
    [],
  );

  function pedirAutorizacao() {
    // Acao sensivel — abre 2FA antes de fechar a pre-reserva.
    setShow2FA(true);
  }

  async function autorizar() {
    setShow2FA(false);
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    const quando = new Date();
    const ip = "189.41." + Math.floor(Math.random() * 200) + "." + Math.floor(Math.random() * 200);
    const device = navigator.userAgent.includes("Mobi") ? "Smartphone (web)" : "Desktop (web)";

    // Persiste no localStorage para aparecer em /servidor/propostas.
    try {
      const raw = window.localStorage.getItem(PROPOSTAS_KEY);
      const list = raw ? (JSON.parse(raw) as unknown[]) : [];
      const novaProposta = {
        id: propostaId,
        banco,
        estado: "em_analise" as const,
        valor,
        parcelas,
        parcela,
        taxaAm,
        tipo,
        criadaEm: quando.toISOString(),
        expiraEm: new Date(quando.getTime() + (tipo === "novo" ? 48 : 7 * 24) * 60 * 60 * 1000).toISOString(),
      };
      window.localStorage.setItem(PROPOSTAS_KEY, JSON.stringify([novaProposta, ...list]));
    } catch {
      // Modo privado / quota cheia — segue mesmo assim.
    }

    setDone({ propostaId, quando, ip, device });
    setSubmitting(false);
  }

  if (done) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720, margin: "0 auto", width: "100%" }}>
        <Card style={{ padding: 28 }}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "color-mix(in srgb, var(--emerald-500) 20%, transparent)",
                color: "var(--emerald-500)", display: "grid", placeItems: "center",
                fontSize: 32, fontWeight: 800, margin: "0 auto",
              }}
            >
              ✓
            </div>
            <h2 style={{ margin: "16px 0 4px" }}>Margem reservada com sucesso</h2>
            <p style={{ color: "var(--text-muted)", margin: 0 }}>
              Sua proposta <b style={{ color: "var(--text)", fontFamily: "var(--font-mono)" }}>{done.propostaId}</b> foi
              registrada e a margem ficara travada por <b>{prazo.label}</b> para o {banco}.
            </p>
          </div>

          <div style={{ display: "grid", gap: 8, marginTop: 24, padding: 16, background: "var(--bg-elev-2)", borderRadius: 10, fontSize: ".88rem" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Comprovante de aceite (log)</div>
            <Row k="Proposta" v={done.propostaId} />
            <Row k="Operacao" v={tipoLabel} />
            <Row k="Banco" v={banco} />
            <Row k="Valor liberado" v={fmtBRL(valor)} />
            <Row k="Parcelas" v={`${parcelas}x de ${fmtBRL(parcela)}`} />
            <Row k="Taxa mensal" v={`${taxaAm.toFixed(2)}%`} />
            <Row k="Aceito em" v={done.quando.toLocaleString("pt-BR")} />
            <Row k="IP de origem" v={done.ip} />
            <Row k="Dispositivo" v={done.device} />
            <Row k="CPF (mascarado)" v="***.***.222-33" />
          </div>

          <div
            style={{
              marginTop: 16, padding: 14, borderRadius: 10,
              background: "color-mix(in srgb, var(--gold-500) 15%, transparent)",
              border: "1px solid var(--gold-500)", color: "var(--text)", fontSize: ".88rem", lineHeight: 1.5,
            }}
          >
            <b>Proxima etapa:</b> voce recebera uma notificacao quando o {banco} responder a analise. Caso a proposta seja
            aprovada, o link de formalizacao chegara por push e e-mail.
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <Button onClick={() => nav("/servidor/propostas")}>Ver minhas propostas →</Button>
            <Button variant="ghost" onClick={() => nav("/servidor/dashboard")}>
              Voltar ao inicio
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720, margin: "0 auto", width: "100%" }}>
      <header>
        <span className="eyebrow">Pre-reserva de margem</span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Termo de autorizacao</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
          Leia e autorize a averbacao da sua margem para esta operacao. A margem ficara travada para o banco abaixo
          pelo prazo de <b>{prazo.label}</b>.
        </p>
      </header>

      <Card>
        <h3 style={{ marginTop: 0 }}>Detalhes da operacao</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", marginTop: 12 }}>
          <ReadField label="Operacao" value={tipoLabel} />
          <ReadField label="Banco" value={banco} />
          <ReadField label="Valor liberado" value={fmtBRL(valor)} accent />
          <ReadField label="Parcelas" value={`${parcelas}x de ${fmtBRL(parcela)}`} />
          <ReadField label="Taxa mensal" value={`${taxaAm.toFixed(2)}%`} />
          <ReadField label="Prazo da trava" value={prazo.label} />
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>Termo de autorizacao</h3>
        <div
          style={{
            maxHeight: 280, overflow: "auto", padding: 16,
            background: "var(--bg-elev-2)", border: "1px solid var(--border)", borderRadius: 10,
            fontSize: ".88rem", color: "var(--text-muted)", lineHeight: 1.7,
          }}
        >
          <p>
            <b>Eu, titular do CPF acima identificado, autorizo expressamente a Atlas Averbadora</b> a registrar a
            averbacao da minha margem consignavel junto a minha prefeitura empregadora para a operacao de
            <b> {tipoLabel}</b>, no valor de <b>{fmtBRL(valor)}</b>, em {parcelas} parcelas de
            <b> {fmtBRL(parcela)}</b>, junto ao banco <b>{banco}</b>.
          </p>
          <p>
            Estou ciente de que ao confirmar este aceite minha margem ficara <b>indisponivel</b> para outras operacoes
            pelo prazo de <b>{prazo.label}</b>, podendo ser liberada antes desse periodo mediante cancelamento da
            pre-reserva.
          </p>
          <p>
            <b>LGPD e log de auditoria.</b> Este aceite sera registrado com data, hora, endereco IP, dispositivo, CPF e
            identificador desta proposta para fins legais e de auditoria, conforme a Lei 13.709/2018.
          </p>
          <p>
            <b>Custo Efetivo Total (CET).</b> A taxa apresentada e mensal e inclui juros remuneratorios, IOF, tarifas e
            seguros aplicaveis quando exigidos pelo convenio. O contrato definitivo sera disponibilizado pelo banco apos
            a aprovacao.
          </p>
          <p>
            Em caso de duvidas, consulte a area "Meus contratos" para historico ou entre em contato com o RH da sua
            prefeitura.
          </p>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: ".92rem", marginTop: 16, cursor: "pointer" }}>
          <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} />
          Li, entendi e <b>aceito o termo de autorizacao</b>
        </label>
      </Card>

      <div style={{ display: "flex", gap: 8 }}>
        <Button onClick={pedirAutorizacao} disabled={!aceito || submitting}>
          {submitting ? "Registrando aceite..." : "Aceito e autorizo →"}
        </Button>
        <Button variant="ghost" onClick={() => nav("/servidor/dashboard")} disabled={submitting}>
          Voltar ao inicio
        </Button>
      </div>

      {show2FA ? (
        <TwoFactorModal
          acao="confirmar o termo e travar sua margem"
          canal="ambos"
          onCancel={() => setShow2FA(false)}
          onConfirm={autorizar}
        />
      ) : null}
    </div>
  );
}

function ReadField({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ marginTop: 4, fontSize: ".95rem", color: accent ? "var(--emerald-500)" : "var(--text)", fontWeight: accent ? 700 : 500 }}>
        {value}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "var(--text-muted)" }}>{k}</span>
      <span style={{ color: "var(--text)", fontFamily: "var(--font-mono)", textAlign: "right" }}>{v}</span>
    </div>
  );
}
