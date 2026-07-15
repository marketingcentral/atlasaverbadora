import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { TermoTipo } from "@atlas/sdk";
import { readActiveMatricula } from "../../lib/matricula-data";

type Tipo = "novo" | "portabilidade" | "refinanciamento" | "cartao_consignado" | "cartao_beneficio";

const TIPO_LABEL: Record<Tipo, string> = {
  novo: "Novo empréstimo",
  portabilidade: "Portabilidade de divida",
  refinanciamento: "Refinanciamento",
  cartao_consignado: "Cartão de Crédito Consignado",
  cartao_beneficio: "Cartão Benefício Consignado",
};

// Prazos do lock conforme a spec (parametrizavel por convenio em prod).
const PRAZOS: Record<Tipo, { horas?: number; diasUteis?: number; label: string }> = {
  novo: { horas: 48, label: "48 horas" },
  portabilidade: { diasUteis: 7, label: "7 dias uteis" },
  refinanciamento: { diasUteis: 7, label: "7 dias uteis" },
  cartao_consignado: { horas: 48, label: "48 horas" },
  cartao_beneficio: { horas: 48, label: "48 horas" },
};

/** True se o tipo eh um cartao (consignado ou beneficio) — flow diferente
 *  de emprestimo: nao tem `valor solicitado` nem `parcelas escolhidas`; tem
 *  `limite proposto` calculado da margem. Chama POST /me/cartoes em vez de
 *  criarProposta. */
function isCartao(t: Tipo): boolean {
  return t === "cartao_consignado" || t === "cartao_beneficio";
}

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
  const tipo: Tipo = ["portabilidade", "refinanciamento", "cartao_consignado", "cartao_beneficio"].includes(rawTipo)
    ? (rawTipo as Tipo)
    : "novo";
  const banco = search.get("banco") ?? "SCred Financeira";
  // Emprestimo: valor/parcelas/parcela/taxaAm. Cartao: so limite (parcela = 5%
  // do limite / capado pela margem — calculado no backend).
  const valor = num(search.get("valor"), 25000);
  const parcelas = num(search.get("parcelas"), 48);
  const parcela = num(search.get("parcela"), 750);
  const taxaAm = num(search.get("taxaAm"), 1.8);
  const limite = num(search.get("limite"), 0);
  const cartao = isCartao(tipo);

  const [aceito, setAceito] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [done, setDone] = useState<null | { propostaId: string; quando: Date; ip: string; device: string }>(null);

  const prazo = PRAZOS[tipo];
  const tipoLabel = TIPO_LABEL[tipo];

  // Mapeia tipo local pro TermoTipo do backend (editavel em /averbadora/termos).
  const termoTipo: TermoTipo = tipo === "portabilidade" ? "portabilidade"
    : tipo === "refinanciamento" ? "refinanciamento"
    : tipo === "cartao_consignado" ? "cartao_consignado"
    : tipo === "cartao_beneficio" ? "cartao_beneficio"
    : "emprestimo";
  const vars = useMemo(() => {
    const base: Record<string, string | number> = { banco, prazo: prazo.label };
    if (cartao) {
      // Vars pro template do cartao — bate com as declaradas no termos-store.
      base.produto = tipoLabel;
      base.limite = fmtBRL(limite);
    } else {
      base.tipoLabel = tipoLabel;
      base.valor = fmtBRL(valor);
      base.parcelas = String(parcelas);
      base.parcela = fmtBRL(parcela);
    }
    return base;
  }, [cartao, tipoLabel, valor, parcelas, parcela, limite, banco, prazo.label]);
  // Puxa o corpo renderizado da API. Fallback (isLoading/erro) cai no texto
  // hardcoded — o servidor NUNCA fica sem termo pra aceitar.
  const termoQ = useQuery({
    queryKey: ["servidor", "termo", termoTipo, vars],
    queryFn: () => atlas.servidor.getTermo(termoTipo, vars),
    staleTime: 60_000,
  });
  const termoCorpo = termoQ.data?.termo.corpo ?? null;
  const termoTitulo = termoQ.data?.termo.titulo ?? "Termo de autorização";

  async function autorizar() {
    setSubmitting(true);
    setErro(null);
    const quando = new Date();
    const ip = "189.41." + Math.floor(Math.random() * 200) + "." + Math.floor(Math.random() * 200);
    const device = navigator.userAgent.includes("Mobi") ? "Smartphone (web)" : "Desktop (web)";

    // Fluxos separados por produto — cartao usa POST /me/cartoes (com tipoMargem
    // proprio) e emprestimo/portabilidade/refin usa POST /me/propostas.
    try {
      if (cartao) {
        const produtoParam = tipo === "cartao_beneficio" ? "cartao_beneficio" : "cartao_consignado";
        const res = await atlas.servidor.solicitarCartao({
          produto: produtoParam,
          bancoNome: banco,
          limite,
          matricula: readActiveMatricula()?.matricula,
        });
        setDone({ propostaId: res.protocolo, quando, ip, device });
      } else {
        // Emprestimo/Portabilidade/Refin. Taxa mensal em fração (1.8% -> 0.018).
        const res = await atlas.servidor.criarProposta({
          valor,
          parcelas,
          taxaAm: taxaAm / 100,
          bancoNome: banco,
          // Vincula a proposta a matricula ativa — sem isso, o backend cai no
          // fallback (primeira matricula do CPF) e servidor com acumulacao de
          // cargos ve a proposta criada na matricula errada.
          matricula: readActiveMatricula()?.matricula,
        });
        setDone({ propostaId: res.id, quando, ip, device });
      }
    } catch (e) {
      setErro((e as Error).message || "Não foi possível registrar a proposta. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
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
            <Row k="Operação" v={tipoLabel} />
            <Row k="Banco" v={banco} />
            {cartao ? (
              <Row k="Limite proposto" v={fmtBRL(limite)} />
            ) : (
              <>
                <Row k="Valor liberado" v={fmtBRL(valor)} />
                <Row k="Parcelas" v={`${parcelas}x de ${fmtBRL(parcela)}`} />
                <Row k="Taxa mensal" v={`${taxaAm.toFixed(2)}%`} />
              </>
            )}
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
            <b>Próxima etapa:</b> voce recebera uma notificacao quando o {banco} responder a analise. Caso a proposta seja
            aprovada, o proprio {banco} entrara em contato para formalizar o contrato — a assinatura acontece direto com o banco (telefone, e-mail ou app do banco).
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <Button onClick={() => nav("/servidor/contratos")}>Ver minhas propostas →</Button>
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
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Termo de autorização</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
          Leia e autorize a averbacao da sua margem para esta operacao. A margem ficara travada para o banco abaixo
          pelo prazo de <b>{prazo.label}</b>.
        </p>
      </header>

      <Card>
        <h3 style={{ marginTop: 0 }}>Detalhes da operação</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", marginTop: 12 }}>
          <ReadField label="Operação" value={tipoLabel} />
          <ReadField label="Banco" value={banco} />
          {cartao ? (
            <>
              <ReadField label="Limite proposto" value={fmtBRL(limite)} accent />
              <ReadField label="Fatura mínima estimada" value="5% do limite (descontado em folha)" />
            </>
          ) : (
            <>
              <ReadField label="Valor liberado" value={fmtBRL(valor)} accent />
              <ReadField label="Parcelas" value={`${parcelas}x de ${fmtBRL(parcela)}`} />
              <ReadField label="Taxa mensal" value={`${taxaAm.toFixed(2)}%`} />
            </>
          )}
          <ReadField label="Prazo da trava" value={prazo.label} />
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>{termoTitulo}</h3>
        <div
          style={{
            maxHeight: 280, overflow: "auto", padding: 16,
            background: "var(--bg-elev-2)", border: "1px solid var(--border)", borderRadius: 10,
            fontSize: ".88rem", color: "var(--text-muted)", lineHeight: 1.7,
          }}
        >
          {termoCorpo ? (
            // Corpo vem do backend com {{vars}} substituidas. Parses paragrafos
            // (linha em branco = novo <p>) + **negrito**.
            termoCorpo.split(/\n\n+/).map((p, i) => (
              <p key={i} style={{ margin: i === 0 ? "0 0 8px" : "8px 0" }} dangerouslySetInnerHTML={{
                __html: p.replace(/\*\*(.+?)\*\*/g, '<b style="color: var(--text)">$1</b>').replace(/\n/g, "<br/>"),
              }} />
            ))
          ) : (
            // Fallback enquanto carrega ou se der erro na API — texto minimo hardcoded
            // pra o servidor nunca ficar sem termo pra aceitar.
            cartao ? (
              <>
                <p>
                  <b>Eu, titular do CPF acima identificado, autorizo expressamente a Atlas Averbadora</b> a
                  registrar a solicitação de <b>{tipoLabel}</b>, com limite proposto de <b>{fmtBRL(limite)}</b>,
                  junto ao banco <b>{banco}</b>.
                </p>
                <p>
                  Estou ciente de que a fatura mínima mensal será descontada em folha até 5% do meu salário
                  líquido, e minha margem ficará <b>indisponível</b> por <b>{prazo.label}</b>.
                </p>
              </>
            ) : (
              <>
                <p>
                  <b>Eu, titular do CPF acima identificado, autorizo expressamente a Atlas Averbadora</b> a
                  registrar a averbação da minha margem consignável junto à minha prefeitura empregadora para a
                  operação de <b>{tipoLabel}</b>, no valor de <b>{fmtBRL(valor)}</b>, em {parcelas} parcelas de{" "}
                  <b>{fmtBRL(parcela)}</b>, junto ao banco <b>{banco}</b>.
                </p>
                <p>
                  Estou ciente de que minha margem ficará <b>indisponível</b> pelo prazo de <b>{prazo.label}</b>.
                </p>
              </>
            )
          )}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: ".92rem", marginTop: 16, cursor: "pointer" }}>
          <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} />
          Li, entendi e <b>aceito o termo de autorização</b>
        </label>
      </Card>

      <div style={{ display: "flex", gap: 8 }}>
        <Button onClick={autorizar} disabled={!aceito || submitting}>
          {submitting ? "Registrando aceite..." : "Aceito e autorizo →"}
        </Button>
        <Button variant="ghost" onClick={() => nav("/servidor/dashboard")} disabled={submitting}>
          Voltar ao inicio
        </Button>
      </div>

      {erro ? (
        <div style={{ padding: 14, borderRadius: 10, background: "color-mix(in srgb, var(--danger-500) 12%, transparent)", border: "1px solid var(--danger-500)", color: "var(--text)", fontSize: ".9rem" }}>
          {erro}
        </div>
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
