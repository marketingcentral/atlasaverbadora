import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import {
  MatriculaInfo,
  readActiveMatricula,
  STORAGE_KEY_ID,
  STORAGE_KEY_META,
} from "../../lib/matricula-data";
import {
  formatRemaining,
  getActiveLock,
  setLock,
  clearLock,
  SIMULATION_LOCK_KEY,
} from "../../lib/simulation-lock";

const PARCELAS = [12, 24, 36, 48, 60, 72, 96];

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

// Number(...) | default — descarta NaN, Infinity e valores <= 0.
function num(raw: string | null, fallback: number): number {
  if (raw == null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function ServidorSimular() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [valor, setValor] = useState<number>(num(sp.get("valor"), 8500));
  const [parcelas, setParcelas] = useState<number>(num(sp.get("parcelas"), 36));
  const taxaAm = useMemo(() => num(sp.get("taxa"), 1.79) / 100, [sp]);

  const [info, setInfo] = useState<MatriculaInfo | null>(() => readActiveMatricula());
  const [lockExpiresAt, setLockExpiresAt] = useState<number | null>(() =>
    getActiveLock(readActiveMatricula()?.idMatricula ?? null),
  );
  const [now, setNow] = useState<number>(() => Date.now());

  // Re-le ao trocar matricula (em outra aba).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_META || e.key === STORAGE_KEY_ID) {
        const novaInfo = readActiveMatricula();
        setInfo(novaInfo);
        setLockExpiresAt(getActiveLock(novaInfo?.idMatricula ?? null));
      } else if (e.key === SIMULATION_LOCK_KEY) {
        setLockExpiresAt(getActiveLock(info?.idMatricula ?? null));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [info?.idMatricula]);

  // Tick a cada segundo enquanto ha lock ativo.
  useEffect(() => {
    if (!lockExpiresAt) return;
    const i = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= lockExpiresAt) {
        setLockExpiresAt(null);
      }
    }, 1000);
    return () => clearInterval(i);
  }, [lockExpiresAt]);

  // A trava existe enquanto o banco NAO respondeu. Poll das propostas do servidor:
  // se nao ha nenhuma "Aguardando" (o banco aprovou/recusou/cancelou), libera a
  // margem na hora pra o servidor fazer uma nova. Poll a cada 10s.
  const propostasQ = useQuery({
    queryKey: ["servidor", "propostas"],
    queryFn: () => atlas.servidor.propostas(),
    refetchInterval: 10_000,
    enabled: !!lockExpiresAt, // so consulta quando ha trava pra liberar
  });
  const temPendente = useMemo(
    () => (propostasQ.data?.propostas ?? []).some((p) => p.situacao.toLowerCase().includes("aguard")),
    [propostasQ.data],
  );
  useEffect(() => {
    // So libera depois que a consulta trouxe dados (evita liberar antes de saber).
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

  // Nao ha teto fixo de valor: o maximo e o maior emprestimo cuja parcela ainda
  // cabe na margem, para o nº de parcelas escolhido (Price invertido). Assim,
  // 96x cobrindo R$300k e liberado se a margem cobre a parcela.
  const maxValor = useMemo(() => {
    if (margemEmprestimo <= 0 || parcelas <= 0) return 500;
    const bruto = taxaAm <= 0
      ? margemEmprestimo * parcelas
      : (margemEmprestimo * (1 - Math.pow(1 + taxaAm, -parcelas))) / taxaAm;
    return Math.max(500, Math.floor(bruto / 100) * 100);
  }, [margemEmprestimo, parcelas, taxaAm]);

  // Se o valor atual passar do maximo (ex.: ao reduzir parcelas), reancora.
  useEffect(() => {
    if (valor > maxValor) setValor(maxValor);
  }, [maxValor, valor]);

  const parcela = useMemo(() => {
    if (valor <= 0 || parcelas <= 0) return 0;
    // Tabela Price. Quando taxa e zero, a formula gera 0/0 (NaN) — usar
    // divisao simples nesse caso (parcela = valor / parcelas).
    if (taxaAm <= 0) return valor / parcelas;
    return (valor * taxaAm) / (1 - Math.pow(1 + taxaAm, -parcelas));
  }, [valor, parcelas, taxaAm]);

  const iof = valor * 0.0038 + valor * 0.000082 * Math.min(parcelas * 30, 365);
  const total = parcela * parcelas;
  // CET quebra se valor - iof <= 0 (loans muito pequenos) ou se total nao ha
  // (parcela = 0). Guarda contra NaN pra nao mostrar 'NaN%' na UI.
  const cetBase = valor - iof;
  const cet = cetBase > 0 && total > 0 && parcelas > 0
    ? ((total / cetBase) ** (1 / parcelas) - 1) * 100
    : 0;

  const excedeMargem = info ? parcela > margemEmprestimo : false;
  const locked = !!lockExpiresAt && lockExpiresAt > now;
  const podeSolicitar = !!info && !excedeMargem && valor > 0 && parcelas > 0 && !locked;

  function solicitar() {
    if (!podeSolicitar || !info) return;
    // Cria o lock antes de navegar.
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

  if (locked && lockExpiresAt) {
    const restante = formatRemaining(lockExpiresAt - now);
    const expiraEmFormatado = new Date(lockExpiresAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720, width: "100%", margin: "0 auto" }}>
        <header>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Simular crédito
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Aguardando próxima simulação</h1>
        </header>

        <Card style={{ padding: 28, textAlign: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "color-mix(in srgb, var(--gold-500) 20%, transparent)",
              color: "var(--gold-500)",
              display: "grid",
              placeItems: "center",
              fontSize: 36,
              margin: "0 auto 12px",
            }}
          >
            ⏳
          </div>

          <h2 style={{ margin: "0 0 6px" }}>Margem em pré-reserva</h2>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: ".95rem", maxWidth: 460, marginInline: "auto" }}>
            {info ? (
              <>
                Sua margem da matricula <b>{info.matricula}</b> ({info.prefeitura}) esta travada por 48 horas apos a
                ultima simulacao. Aguarde a liberacao para iniciar uma nova.
              </>
            ) : (
              <>Sua margem esta travada por 48 horas. Aguarde a liberacao para iniciar uma nova simulacao.</>
            )}
          </p>

          <div
            style={{
              marginTop: 28,
              padding: "20px 24px",
              borderRadius: 14,
              background: "var(--bg-elev-2)",
              border: "1px solid var(--border-strong)",
              display: "inline-block",
              minWidth: 280,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "var(--text-muted)",
                textTransform: "uppercase",
              }}
            >
              Tempo restante
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: "2.6rem",
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                color: "var(--accent)",
                letterSpacing: "0.02em",
              }}
            >
              {restante}
            </div>
            <div style={{ marginTop: 6, fontSize: ".8rem", color: "var(--text-dim)" }}>
              Libera em {expiraEmFormatado}
            </div>
          </div>

          <div style={{ marginTop: 24, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <Button variant="ghost" onClick={() => nav("/servidor/propostas")}>
              Ver minhas propostas
            </Button>
            <Button variant="ghost" onClick={() => nav("/servidor/dashboard")}>
              Voltar ao inicio
            </Button>
          </div>
        </Card>

        <Card>
          <h3 style={{ marginTop: 0 }}>Por que existe esse periodo?</h3>
          <p style={{ color: "var(--text-muted)", fontSize: ".9rem", lineHeight: 1.6, margin: 0 }}>
            Apos voce solicitar uma simulacao, a margem da matricula fica reservada para o banco responder em ate 48h.
            Esse periodo garante que a margem nao seja comprometida em outra operacao enquanto a proposta esta em
            analise. Caso o banco recuse ou voce nao formalize, a margem e liberada automaticamente.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720, width: "100%", margin: "0 auto" }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Simular crédito
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Quanto cabe no seu bolso?</h1>
        <p style={{ color: "var(--text-muted)" }}>
          {info ? (
            <>Simulando para a matricula <b>{info.matricula}</b> ({info.prefeitura}). </>
          ) : null}
          Ajuste valor e parcelas para encontrar a melhor opção.
        </p>
      </header>

      {info ? (
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
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--accent)" }}>{fmtBRL(valor)}</div>
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
            <b style={{ color: "var(--danger-500)" }}>Parcela acima da sua margem disponível.</b><br />
            A parcela calculada ({fmtBRL(parcela)}) ultrapassa o limite de {fmtBRL(margemEmprestimo)} consignável.
            Reduza o valor ou aumente o número de parcelas.
          </div>
        ) : null}

        <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
          <Button disabled={!podeSolicitar} onClick={solicitar}>
            Solicitar agora →
          </Button>
          <Button variant="ghost" onClick={() => nav("/servidor/dashboard")}>Voltar</Button>
        </div>
        <p style={{ marginTop: 12, fontSize: ".78rem", color: "var(--text-dim)", margin: "12px 0 0" }}>
          Ao solicitar, sua margem fica travada por 48h enquanto o banco analisa.
        </p>
      </Card>
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
