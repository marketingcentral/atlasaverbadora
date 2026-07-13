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
  type LockProduto,
} from "../../lib/simulation-lock";

// Opcoes fixas — sao filtradas em tempo real pelo prazo max das tabelas
// vigentes dos bancos parceiros (via useQuery atlas.servidor.ofertas). Se
// o banco reduzir o prazo max de 96 pra 60, o servidor deixa de ver 72/96
// no dropdown no proximo poll (5s).
const PARCELAS_TODAS = [12, 24, 36, 48, 60, 72, 96, 120];

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

/** Simulador de credito reaproveitavel. Renderiza sem header — quem usa (a
 *  pagina /servidor/simular OU a pagina MarketPlace) coloca o titulo em volta.
 *  Lida com lock de 48h, calculo Price e navegacao pro /termo pra assinar.
 *
 *  A prop `compact` esconde o card "Sua margem para emprestimo" (que ja aparece
 *  em outra parte da tela onde o simulador esta embutido). */
type ModalidadeSim = "emprestimo" | "cartao_consignado" | "cartao_beneficio";

/** Mapeia o produto interno da UI pro produto do lock. Sao margens independentes,
 *  entao uma trava em EMPRESTIMO nao bloqueia CARTAO_CONSIGNADO nem vice-versa. */
function lockProdutoDe(p: ModalidadeSim): LockProduto {
  if (p === "cartao_consignado") return "CARTAO_CONSIGNADO";
  if (p === "cartao_beneficio") return "CARTAO_BENEFICIOS";
  return "EMPRESTIMO";
}

/** Verifica se uma proposta (pelo seu tipoContrato do backend) pertence ao
 *  produto travado — usado pra decidir se a proposta conta pra soltar a trava.
 *  Backend usa "EMPRESTIMO" | "REFIN" | "ECONSIGNADO" | (undefined = emprestimo).
 *  - EMPRESTIMO trava: solta com qualquer proposta de credito (emprestimo/refin).
 *  - CARTAO_CONSIGNADO trava: solta so com proposta de cartao consignado.
 *  - CARTAO_BENEFICIOS trava: solta so com proposta de cartao beneficio. */
function matchesLockProduto(tipoContrato: string | undefined, lockProd: LockProduto): boolean {
  const t = (tipoContrato ?? "").toUpperCase();
  if (lockProd === "EMPRESTIMO") {
    // Default (sem tipoContrato) = emprestimo — mantem retrocompat com propostas antigas.
    if (!t) return true;
    return t === "EMPRESTIMO" || t === "REFIN";
  }
  if (lockProd === "CARTAO_CONSIGNADO") {
    return t.includes("CONSIG") && (t.includes("CARTAO") || t.includes("ECONSIGN"));
  }
  // CARTAO_BENEFICIOS
  return t.includes("BENEF");
}

export function SimuladorInline({
  info,
  taxaAmDefault = 0.0179,
  valorDefault = 8500,
  parcelasDefault = 36,
  compact = false,
  produto = "emprestimo",
}: {
  info: MatriculaInfo | null;
  taxaAmDefault?: number;
  valorDefault?: number;
  parcelasDefault?: number;
  compact?: boolean;
  /** Produto do simulador. Sem tabs — a tela que embute o SimuladorInline decide
   *  qual mostrar (dashboard aponta cada botao "Simular" pra tela dedicada). */
  produto?: ModalidadeSim;
}) {
  const nav = useNavigate();
  const lockProduto = lockProdutoDe(produto);
  const [valor, setValor] = useState<number>(valorDefault);
  const [parcelas, setParcelas] = useState<number>(parcelasDefault);
  const taxaAm = taxaAmDefault;

  // Ofertas ativas do convenio dessa matricula — traz o prazoMaxMeses de cada
  // tabela publicada pelo(s) banco(s). Poll 5s = "tempo real": quando o banco
  // altera o prazo max no /banco/cadastros/tabela-emprestimos, o servidor ve
  // as parcelas disponiveis mudarem sem refresh. Contratos ja vigentes nao
  // sao afetados — a tabela e' consultada so pra NOVAS simulacoes.
  //
  // queryKey precisa comecar com ["servidor", "ofertas"] pra bater com o
  // invalidateQueries do form do banco (upsertTabela) — assim a mudanca
  // reflete IMEDIATAMENTE, sem esperar os 5s do poll. refetchIntervalInBackground
  // garante o poll rodar mesmo com aba fora de foco.
  const ofertasQ = useQuery({
    queryKey: ["servidor", "ofertas", info?.matricula],
    queryFn: () => atlas.servidor.ofertas(info?.matricula),
    enabled: !!info?.matricula,
    refetchInterval: 3_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    staleTime: 0, // forca sempre buscar dado fresco quando invalidado
  });
  // prazoMax = MENOR entre as tabelas ativas do convenio (nao mais o maior).
  // Assim se o banco reduzir uma tabela para 60, o servidor ve so ate 60 —
  // sem se importar se outra tabela do mesmo convenio ainda tem 120. Essa
  // e a leitura literal do pedido do cliente: "quando eu deixar parcela
  // maxima = 96 ou 72, so apareça até a maxima que selecionei". Se houver
  // uma unica tabela ativa (caso comum), min == max == essa tabela.
  const prazoMaxVigente = useMemo(() => {
    const of = ofertasQ.data?.ofertas ?? [];
    if (of.length === 0) return null;
    return Math.min(...of.map((o) => o.prazoMaxMeses));
  }, [ofertasQ.data]);
  const PARCELAS = useMemo(() => {
    // Enquanto a query nao trouxe dado (loading), fallback pra opcoes basicas
    // — evita "flash" de dropdown vazio no primeiro render.
    if (prazoMaxVigente == null) return PARCELAS_TODAS;
    return PARCELAS_TODAS.filter((p) => p <= prazoMaxVigente);
  }, [prazoMaxVigente]);
  // Se o prazo escolhido nao esta mais disponivel, cai pro maior permitido.
  useEffect(() => {
    if (PARCELAS.length > 0 && !PARCELAS.includes(parcelas)) {
      setParcelas(PARCELAS[PARCELAS.length - 1] ?? parcelasDefault);
    }
  }, [PARCELAS, parcelas, parcelasDefault]);

  const [lockExpiresAt, setLockExpiresAt] = useState<number | null>(() =>
    getActiveLock(info?.idMatricula ?? null, lockProduto),
  );
  const [now, setNow] = useState<number>(() => Date.now());

  // Re-le lock quando a matricula, o produto ou o lock em outra aba mudar.
  useEffect(() => {
    setLockExpiresAt(getActiveLock(info?.idMatricula ?? null, lockProduto));
    const onStorage = (e: StorageEvent) => {
      if (e.key === SIMULATION_LOCK_KEY) {
        setLockExpiresAt(getActiveLock(info?.idMatricula ?? null, lockProduto));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [info?.idMatricula, lockProduto]);

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
  // REGRA DE NEGOCIO: a trava de 48h so pode ser liberada em DOIS casos:
  //   (a) 48h naturalmente expiraram (handled pelo tick de setInterval acima), ou
  //   (b) o banco EXPLICITAMENTE decidiu (aceitou ou recusou) alguma proposta
  //       do mesmo produto travado.
  // NAO liberar por: proposta simplesmente "sumiu", query sem dados, proposta
  // expirada sem decisao, ou pendencias de OUTROS produtos — tudo isso podia
  // causar a trava soltar cedo demais em versoes anteriores.
  const bancoDecidiu = useMemo(() => {
    const relevantes = (propostasQ.data?.propostas ?? [])
      .filter((p) => matchesLockProduto(p.tipoContrato, lockProduto));
    if (relevantes.length === 0) return false; // sem propostas do produto ⇒ nao decidiu
    return relevantes.some((p) => {
      const s = p.situacao.toLowerCase();
      // ACEITE explicito do banco
      if (s.includes("ativo") || s.includes("aprov") || s.includes("averb") || s.includes("formaliz") || s.includes("quitad")) return true;
      // RECUSA explicita do banco
      if (s.includes("cancel") || s.includes("recus") || s.includes("reprov") || s.includes("rejeit") || s.includes("negad") || s.includes("estorn")) return true;
      return false;
    });
  }, [propostasQ.data, lockProduto]);
  useEffect(() => {
    if (!lockExpiresAt || !propostasQ.data) return;
    if (bancoDecidiu) {
      const id = info?.idMatricula;
      if (id) clearLock(id, lockProduto);
      setLockExpiresAt(null);
    }
  }, [propostasQ.data, bancoDecidiu, lockExpiresAt, info?.idMatricula, lockProduto]);

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
    setLock(info.idMatricula, lockProduto);
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
      {produto !== "emprestimo" ? (
        <SimuladorCartao info={info} produto={produto} />
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

/** Simulador de cartao (consignado ou beneficio). Sem slider — a plataforma
 *  calcula UM limite proposto a partir da margem cartao (regra pragmatica:
 *  fatura minima ~2.5% do limite ≈ 5% do salario ⇒ limite = margem × 30).
 *  Mesma UX do app mobile (screenshot do cliente): servidor NAO escolhe o
 *  valor, so aceita o proposto ou nao. Ao solicitar, redireciona pra
 *  /servidor/solicitar-cartao (que faz a chamada final ao backend).
 */
function SimuladorCartao({ info, produto }: { info: MatriculaInfo | null; produto: "cartao_consignado" | "cartao_beneficio" }) {
  const nav = useNavigate();
  const lockProduto: LockProduto = produto === "cartao_beneficio" ? "CARTAO_BENEFICIOS" : "CARTAO_CONSIGNADO";
  const meta = produto === "cartao_consignado"
    ? {
        titulo: "Cartão de Crédito Consignado",
        subtitulo: "Cartão de crédito com fatura mínima descontada em folha. Você usa como um cartão normal — a fatura mínima sai do seu contracheque.",
        margemLabel: "Sua margem cartão consignado",
        tipoMargem: "CARTAO_CONSIGNADO" as const,
        cta: "Solicitar Cartão Consignado",
      }
    : {
        titulo: "Cartão Benefício Consignado",
        subtitulo: "Cartão restrito (farmácia, mercado, saúde) com fatura mínima descontada em folha. Limite exclusivo desses estabelecimentos.",
        margemLabel: "Sua margem cartão benefício",
        tipoMargem: "CARTAO_BENEFICIOS" as const,
        cta: "Solicitar Cartão Benefício",
      };

  const margemDisp = useMemo(() => {
    if (!info) return 0;
    const t = info.margem.margens_por_tipo.find((m) => m.tipo === meta.tipoMargem);
    return t?.disponivel ?? 0;
  }, [info, meta.tipoMargem]);

  const semMargem = margemDisp <= 0;
  // Limite proposto = margem × 30 (mesma regra do app mobile: R$600 ⇒ R$18.000).
  // Arredonda pra baixo em R$100 pra ficar bonito ("R$ 17.900" em vez de R$ 17.988).
  const limiteProposto = Math.max(0, Math.floor((margemDisp * 30) / 100) * 100);
  const bancoDefault = "Banco Atlas";

  function solicitar() {
    if (semMargem || !info) return;
    // Trava de 48h por produto — mesma logica do emprestimo (SimuladorInline).
    // Trava e SEPARADA da do emprestimo (margens/produtos independentes).
    setLock(info.idMatricula, lockProduto);
    nav(`/servidor/solicitar-cartao?produto=${produto}&banco=${encodeURIComponent(bancoDefault)}&limite=${Math.round(limiteProposto)}`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Descricao do produto — igual o cabecalho do app mobile. */}
      <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0, lineHeight: 1.5 }}>
        {meta.subtitulo}
      </p>

      {/* Card SUA MARGEM CARTAO */}
      <Card>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase" }}>
          {meta.margemLabel}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: semMargem ? "var(--danger-500)" : "var(--emerald-500)", marginTop: 6 }}>
          {fmtBRL(margemDisp)}
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "10px 0 0", lineHeight: 1.5 }}>
          Margem mensal para a fatura mínima. Fixada por regulação em 5% do salário líquido.
        </p>
      </Card>

      {semMargem ? (
        <Card style={{ borderColor: "var(--danger-500)" }}>
          <h3 style={{ marginTop: 0, color: "var(--danger-500)" }}>Sem margem disponível</h3>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 13 }}>
            Sua margem de {meta.titulo.toLowerCase()} está zerada nesta matrícula. Não é possível solicitar agora.
            Quite ou suspenda outro cartão do mesmo tipo pra liberar espaço.
          </p>
        </Card>
      ) : (
        <>
          {/* Card LIMITE PROPOSTO — sem slider, valor calculado. */}
          <Card>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase" }}>
              Limite proposto
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, color: "var(--gold-500)", marginTop: 6, letterSpacing: "-0.01em" }}>
              {fmtBRL(limiteProposto)}
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "10px 0 0", lineHeight: 1.5 }}>
              Estimado a partir da sua margem. O <b>{bancoDefault}</b> pode ajustar o limite após análise interna de crédito.
            </p>
          </Card>

          {/* Info box + CTA — mesmo tom do app. */}
          <div style={{
            padding: "14px 16px", borderRadius: 12,
            background: "var(--bg-elev-2)",
            border: "1px solid var(--border)",
            fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5,
          }}>
            Ao solicitar, o <b style={{ color: "var(--text)" }}>{bancoDefault}</b> recebe seu pedido e entra em contato para emitir e ativar o cartão. A margem só é comprometida quando o banco confirma — nada é descontado agora.
          </div>

          <Button onClick={solicitar}>
            {meta.cta} →
          </Button>
        </>
      )}
    </div>
  );
}
