import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { MatriculaInfo } from "../../lib/matricula-data";
import {
  formatRemaining,
  getActiveLock,
  setLock,
  clearLock,
  SIMULATION_LOCK_KEY,
} from "../../lib/simulation-lock";

const PARCELAS = [12, 24, 36, 48, 60, 72, 96];

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

/** Simulador de credito reaproveitavel. Renderiza sem header — quem usa (a
 *  pagina /servidor/simular OU a pagina MarketPlace) coloca o titulo em volta.
 *  Lida com lock de 48h, calculo Price e navegacao pro /termo pra assinar.
 *
 *  A prop `compact` esconde o card "Sua margem para emprestimo" (que ja aparece
 *  em outra parte da tela onde o simulador esta embutido). */
type ModalidadeSim = "emprestimo" | "cartao_consignado" | "cartao_beneficio";

export function SimuladorInline({
  info,
  taxaAmDefault = 0.0179,
  valorDefault = 8500,
  parcelasDefault = 36,
  compact = false,
}: {
  info: MatriculaInfo | null;
  taxaAmDefault?: number;
  valorDefault?: number;
  parcelasDefault?: number;
  compact?: boolean;
}) {
  const nav = useNavigate();
  const [tab, setTab] = useState<ModalidadeSim>("emprestimo");
  const [valor, setValor] = useState<number>(valorDefault);
  const [parcelas, setParcelas] = useState<number>(parcelasDefault);
  const taxaAm = taxaAmDefault;

  const [lockExpiresAt, setLockExpiresAt] = useState<number | null>(() =>
    getActiveLock(info?.idMatricula ?? null),
  );
  const [now, setNow] = useState<number>(() => Date.now());

  // Re-le lock quando a matricula (ou o lock em outra aba) mudar.
  useEffect(() => {
    setLockExpiresAt(getActiveLock(info?.idMatricula ?? null));
    const onStorage = (e: StorageEvent) => {
      if (e.key === SIMULATION_LOCK_KEY) {
        setLockExpiresAt(getActiveLock(info?.idMatricula ?? null));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [info?.idMatricula]);

  // Tick 1s enquanto ha lock ativo (pra atualizar o contador).
  useEffect(() => {
    if (!lockExpiresAt) return;
    const i = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= lockExpiresAt) setLockExpiresAt(null);
    }, 1000);
    return () => clearInterval(i);
  }, [lockExpiresAt]);

  // Poll de propostas: se o banco ja respondeu tudo, libera a margem.
  const propostasQ = useQuery({
    queryKey: ["servidor", "propostas", info?.matricula ?? null],
    queryFn: () => atlas.servidor.propostas(info?.matricula),
    refetchInterval: 10_000,
    enabled: !!lockExpiresAt,
  });
  const temPendente = useMemo(
    () => (propostasQ.data?.propostas ?? []).some((p) => p.situacao.toLowerCase().includes("aguard")),
    [propostasQ.data],
  );
  useEffect(() => {
    if (!lockExpiresAt || !propostasQ.data) return;
    if (!temPendente) {
      const id = info?.idMatricula;
      if (id) clearLock(id);
      setLockExpiresAt(null);
    }
  }, [propostasQ.data, temPendente, lockExpiresAt, info?.idMatricula]);

  const margemEmprestimo = useMemo(() => {
    if (!info) return 0;
    const t = info.margem.margens_por_tipo.find((m) => m.tipo === "EMPRESTIMO");
    return t?.disponivel ?? info.margem.margem.disponivel ?? 0;
  }, [info]);

  const maxValor = useMemo(() => {
    if (margemEmprestimo <= 0 || parcelas <= 0) return 500;
    const bruto = taxaAm <= 0
      ? margemEmprestimo * parcelas
      : (margemEmprestimo * (1 - Math.pow(1 + taxaAm, -parcelas))) / taxaAm;
    return Math.max(500, Math.floor(bruto / 100) * 100);
  }, [margemEmprestimo, parcelas, taxaAm]);

  useEffect(() => {
    if (valor > maxValor) setValor(maxValor);
  }, [maxValor, valor]);

  const parcela = useMemo(() => {
    if (valor <= 0 || parcelas <= 0) return 0;
    if (taxaAm <= 0) return valor / parcelas;
    return (valor * taxaAm) / (1 - Math.pow(1 + taxaAm, -parcelas));
  }, [valor, parcelas, taxaAm]);

  const iof = valor * 0.0038 + valor * 0.000082 * Math.min(parcelas * 30, 365);
  const total = parcela * parcelas;
  const cetBase = valor - iof;
  const cet = cetBase > 0 && total > 0 && parcelas > 0
    ? ((total / cetBase) ** (1 / parcelas) - 1) * 100
    : 0;

  const excedeMargem = info ? parcela > margemEmprestimo : false;
  const locked = !!lockExpiresAt && lockExpiresAt > now;
  const podeSolicitar = !!info && !excedeMargem && valor > 0 && parcelas > 0 && !locked;

  function solicitar() {
    if (!podeSolicitar || !info) return;
    setLock(info.idMatricula);
    setLockExpiresAt(Date.now() + 48 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      tipo: "novo",
      banco: "SCred Financeira",
      valor: String(Math.round(valor)),
      parcelas: String(parcelas),
      parcela: parcela.toFixed(2),
      taxaAm: (taxaAm * 100).toFixed(2),
    });
    nav(`/servidor/termo?${params.toString()}`);
  }

  // Lock ativo — mostra o contador (mesmo layout, mais compacto quando embutido).
  if (locked && lockExpiresAt) {
    const restante = formatRemaining(lockExpiresAt - now);
    const expiraEmFormatado = new Date(lockExpiresAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    return (
      <Card style={{ padding: compact ? 20 : 28, textAlign: "center" }}>
        <div
          style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "color-mix(in srgb, var(--gold-500) 20%, transparent)",
            color: "var(--gold-500)",
            display: "grid", placeItems: "center",
            fontSize: 28, margin: "0 auto 10px",
          }}
        >
          ⏳
        </div>
        <h3 style={{ margin: "0 0 6px" }}>Margem em pré-reserva</h3>
        <p style={{ color: "var(--text-muted)", margin: 0, fontSize: ".9rem", maxWidth: 460, marginInline: "auto" }}>
          {info ? (
            <>Sua margem da matrícula <b>{info.matricula}</b> está travada por 48h após a última simulação.</>
          ) : (
            <>Sua margem está travada por 48h após a última simulação.</>
          )}
        </p>
        <div
          style={{
            marginTop: 20, padding: "16px 20px", borderRadius: 12,
            background: "var(--bg-elev-2)", border: "1px solid var(--border-strong)",
            display: "inline-block", minWidth: 240,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Tempo restante
          </div>
          <div style={{ marginTop: 4, fontSize: "2rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--accent)", letterSpacing: "0.02em" }}>
            {restante}
          </div>
          <div style={{ marginTop: 4, fontSize: ".78rem", color: "var(--text-dim)" }}>
            Libera em {expiraEmFormatado}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Tabs de modalidade — empréstimo (Price + parcelas) x cartão consig/benef
          (limite + fatura minima). Cliente pediu que cartao consig e benef
          tambem apareçam nesta area de simulacao. */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <ModalidadeTab active={tab === "emprestimo"} onClick={() => setTab("emprestimo")} icone="💰" label="Empréstimo" />
        <ModalidadeTab active={tab === "cartao_consignado"} onClick={() => setTab("cartao_consignado")} icone="💳" label="Cartão consignado" />
        <ModalidadeTab active={tab === "cartao_beneficio"} onClick={() => setTab("cartao_beneficio")} icone="🎫" label="Cartão benefício" />
      </div>

      {tab !== "emprestimo" ? (
        <SimuladorCartao info={info} produto={tab} />
      ) : (
        <>
      {!compact && info ? (
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
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent)" }}>{fmtBRL(valor)}</div>
          <input
            type="range"
            min={500}
            max={Math.max(maxValor, 1000)}
            step={100}
            value={Math.min(valor, maxValor)}
            onChange={(e) => setValor(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--accent)" }}
          />
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Máximo p/ {parcelas}x com sua margem: <b>{fmtBRL(maxValor)}</b>
          </span>
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
              border: "1px solid color-mix(in srgb, var(--danger-500) 60%, transparent)",
              background: "color-mix(in srgb, var(--danger-500) 10%, transparent)",
              color: "var(--text)",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            <b style={{ color: "var(--danger-500)" }}>Parcela acima da sua margem disponível.</b>
            <br />
            A parcela calculada ({fmtBRL(parcela)}) ultrapassa o limite de {fmtBRL(margemEmprestimo)} consignável.
            Reduza o valor ou aumente o número de parcelas.
          </div>
        ) : null}

        <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
          <Button disabled={!podeSolicitar} onClick={solicitar}>
            Solicitar agora →
          </Button>
        </div>
        <p style={{ marginTop: 12, fontSize: ".78rem", color: "var(--text-dim)", margin: "12px 0 0" }}>
          Ao solicitar, sua margem fica travada por 48h enquanto o banco analisa.
        </p>
      </Card>
        </>
      )}
    </div>
  );
}

function Metric({ label, valor, accent, danger }: { label: string; valor: string; accent?: boolean; danger?: boolean }) {
  const color = danger ? "var(--danger-500)" : accent ? "var(--emerald-500)" : "var(--text)";
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700, color }}>{valor}</div>
    </div>
  );
}

function ModalidadeTab({ active, onClick, icone, label }: { active: boolean; onClick: () => void; icone: string; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: 999,
        border: `1px solid ${active ? "var(--gold-500)" : "var(--border)"}`,
        background: active ? "color-mix(in srgb, var(--gold-500) 15%, transparent)" : "transparent",
        color: active ? "var(--text)" : "var(--text-muted)",
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: 15 }}>{icone}</span>
      <span>{label}</span>
    </button>
  );
}

/** Simulador de cartao (consignado ou beneficio). Sem tabela Price — cartao
 *  nao tem parcela fixa. O que importa e o LIMITE (o servidor usa como cartao
 *  normal); a fatura minima ~2.5% do limite desconta em folha, e precisa
 *  caber na margem cartao (5%, regulado).
 *
 *  Regra pragmatica pra teto: limite max ~= margem cartao * 40 (fatura minima
 *  ~= 2.5% do limite bate na margem). Servidor ajusta pra baixo pelo slider.
 *  Ao solicitar, redireciona pra /servidor/solicitar-cartao (fluxo existente).
 */
function SimuladorCartao({ info, produto }: { info: MatriculaInfo | null; produto: "cartao_consignado" | "cartao_beneficio" }) {
  const nav = useNavigate();
  const meta = produto === "cartao_consignado"
    ? {
        titulo: "Cartão consignado",
        icone: "💳",
        margemLabel: "Sua margem cartão consignado",
        tipoMargem: "CARTAO_CONSIGNADO" as const,
        descricao: "Cartão de crédito com fatura mínima descontada em folha.",
      }
    : {
        titulo: "Cartão benefício",
        icone: "🎫",
        margemLabel: "Sua margem cartão benefício",
        tipoMargem: "CARTAO_BENEFICIOS" as const,
        descricao: "Cartão restrito (farmácia/mercado/saúde) descontado em folha.",
      };

  const margemDisp = useMemo(() => {
    if (!info) return 0;
    const t = info.margem.margens_por_tipo.find((m) => m.tipo === meta.tipoMargem);
    return t?.disponivel ?? 0;
  }, [info, meta.tipoMargem]);

  const semMargem = margemDisp <= 0;
  // Teto pragmatico: fatura minima ~2.5% do limite. Pra caber na margem,
  // limite max = margem / 0.025 = margem * 40. Piso: R$500 se sem margem.
  const limiteMax = Math.max(500, Math.floor((margemDisp * 40) / 100) * 100);
  const [limite, setLimite] = useState<number>(Math.min(5000, limiteMax));
  useEffect(() => {
    if (limite > limiteMax) setLimite(limiteMax);
  }, [limiteMax, limite]);

  const faturaMinima = limite * 0.025;
  const excedeMargem = faturaMinima > margemDisp;
  const bancoDefault = "Banco Atlas"; // consistente com solicitar-cartao.tsx

  function solicitar() {
    if (semMargem || excedeMargem) return;
    nav(`/servidor/solicitar-cartao?produto=${produto}&banco=${encodeURIComponent(bancoDefault)}&limite=${Math.round(limite)}`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase" }}>
              {meta.margemLabel}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: semMargem ? "var(--danger-500)" : "var(--emerald-500)", marginTop: 4 }}>
              {fmtBRL(margemDisp)}
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 320, textAlign: "right" }}>
            {meta.descricao} Fatura mínima na folha (regulado em 5% do salário).
          </div>
        </div>
      </Card>

      {semMargem ? (
        <Card style={{ borderColor: "var(--danger-500)" }}>
          <h3 style={{ marginTop: 0, color: "var(--danger-500)" }}>Sem margem disponível</h3>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 13 }}>
            Sua margem de {meta.titulo.toLowerCase()} está zerada nesta matrícula. Não é possível simular agora.
            Quite ou suspenda outro cartão do mesmo tipo pra liberar espaço.
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase" }}>
                Limite pretendido
              </span>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent)" }}>{fmtBRL(limite)}</div>
              <input
                type="range"
                min={500}
                max={Math.max(limiteMax, 1000)}
                step={100}
                value={Math.min(limite, limiteMax)}
                onChange={(e) => setLimite(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent)" }}
              />
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Máximo pela sua margem: <b>{fmtBRL(limiteMax)}</b>
              </span>
            </div>
          </Card>

          <Card>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Metric label="Fatura mínima" valor={fmtBRL(faturaMinima)} accent danger={excedeMargem} />
              <Metric label="% do limite" valor="2,50%" />
              <Metric label="Margem cartão" valor={fmtBRL(margemDisp)} />
              <Metric label="Sobra na margem" valor={fmtBRL(Math.max(0, margemDisp - faturaMinima))} />
            </div>

            {excedeMargem ? (
              <div style={{
                marginTop: 18, padding: "12px 14px", borderRadius: 10,
                border: "1px solid color-mix(in srgb, var(--danger-500) 60%, transparent)",
                background: "color-mix(in srgb, var(--danger-500) 10%, transparent)",
                color: "var(--text)", fontSize: 13, lineHeight: 1.5,
              }}>
                <b style={{ color: "var(--danger-500)" }}>Fatura mínima acima da sua margem.</b>
                <br />
                Reduza o limite pretendido para caber em {fmtBRL(margemDisp)} de fatura mínima.
              </div>
            ) : null}

            <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
              <Button disabled={excedeMargem} onClick={solicitar}>
                Solicitar {meta.titulo.toLowerCase()} →
              </Button>
            </div>
            <p style={{ marginTop: 12, fontSize: ".78rem", color: "var(--text-dim)", margin: "12px 0 0" }}>
              Ao solicitar, o banco recebe o pedido e entra em contato pra emitir e ativar o cartão.
              A margem só é comprometida quando o banco confirma a averbação.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
