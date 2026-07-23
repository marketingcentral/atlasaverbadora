import { useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button, ComunicadoCarrossel, DataCorteCard, Input, KpiCard } from "@atlas/ui/web";
import { ApiHttpError } from "@atlas/sdk";
import { atlas } from "../../lib/sdk";
import { fmtBRL } from "../../lib/banco-propostas";

const MESES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Gera lista de cortes navegaveis: 6 meses passados + atual + 3 futuros.
 *  Cada corte inclui a competencia (Mmm/AAAA) e um marcador de posicao temporal
 *  (Encerrada / Em andamento / Prevista) — assim o card muda de estado ao
 *  navegar, nao so o dia/mes. */
interface FolhaReal { competencia: string; dataCorte: string; dataRepasse: string | null; status: string }

/** DD/MM/AAAA a partir de "AAAA-MM-DD" (ou "" se invalida). */
function fmtIsoDate(iso: string | null): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function buildCortes(diaCorte: number, origem: string, operacoes: string, folhas: FolhaReal[]) {
  const hoje = new Date();
  // Indexa folhas por competencia "AAAAMM" pra achar o corte/repasse REAL.
  const porComp = new Map(folhas.map((f) => [f.competencia, f]));
  const lista: {
    dia: number;
    mes: string;
    competencia: string;
    origem: string;
    operacoes: string;
    repasse?: string;
  }[] = [];
  for (let offset = -6; offset <= 3; offset++) {
    const ref = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1);
    const compKey = `${ref.getFullYear()}${String(ref.getMonth() + 1).padStart(2, "0")}`;
    const competencia = `${MESES_PT[ref.getMonth()]}/${ref.getFullYear()}`;
    const folha = porComp.get(compKey);
    if (folha) {
      // FONTE PRIMARIA: a folha real da prefeitura — datas completas de corte e
      // repasse que ela definiu ao abrir a competencia. Cliente pediu 23/07/2026
      // que o banco siga a folha, nao o dia generico do convenio.
      const cm = /^(\d{4})-(\d{2})-(\d{2})/.exec(folha.dataCorte);
      const diaFolha = cm ? Number(cm[3]) : Math.min(diaCorte, 28);
      const rotuloStatus = folha.status === "consolidada" ? "Consolidada" : folha.status === "fechada" ? "Fechada" : "Aberta";
      lista.push({
        dia: diaFolha,
        mes: MESES_PT[ref.getMonth()]!,
        competencia,
        origem: `${origem} · ${rotuloStatus} — corte ${fmtIsoDate(folha.dataCorte)}`,
        operacoes,
        repasse: fmtIsoDate(folha.dataRepasse),
      });
    } else {
      // Sem folha aberta pra essa competencia: cai no dia generico do convenio,
      // marcado como PREVISTA (nao e' data confirmada).
      const ultimoDia = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
      const dia = Math.min(diaCorte, ultimoDia);
      const dataFmt = `${String(dia).padStart(2, "0")}/${String(ref.getMonth() + 1).padStart(2, "0")}/${ref.getFullYear()}`;
      lista.push({
        dia,
        mes: MESES_PT[ref.getMonth()]!,
        competencia,
        origem: `${origem} · Prevista para ${dataFmt} (sem folha aberta)`,
        operacoes,
      });
    }
  }
  return lista; // index 6 = competencia atual
}

export function BancoVisaoGeral() {
  const nav = useNavigate();
  // Poll 8s pra os KPIs (propostas em analise, aprovadas, formalizadas, carteira)
  // subirem sem F5 quando o servidor manda proposta, cliente aprova, etc.
  const visao = useQuery({
    queryKey: ["banco", "visao-geral"],
    queryFn: () => atlas.banco.visaoGeral(),
    refetchInterval: 8_000,
    refetchOnWindowFocus: true,
  });
  const comunicados = useQuery({ queryKey: ["banco", "comunicados"], queryFn: () => atlas.banco.comunicados() });
  // index do corte selecionado (6 = corte atual, gerado por buildCortes)
  const [corteIdx, setCorteIdx] = useState(6);

  // "Próximo passo": busca rápida por matrícula/CPF que leva direto à ficha de margem.
  const [busca, setBusca] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [buscaErro, setBuscaErro] = useState<string | null>(null);
  async function iniciarOperacao(e: FormEvent) {
    e.preventDefault();
    const q = busca.trim();
    if (!q) return;
    setBuscaErro(null);
    setBuscando(true);
    try {
      const digitos = q.replace(/\D/g, "");
      const porCpf = digitos.length === 11;
      const { ficha } = await atlas.banco.margemBuscar(porCpf ? { cpf: digitos } : { matricula: q });
      nav(`/banco/margem-contratacao/${ficha.idMatricula}`);
    } catch (err) {
      setBuscaErro(err instanceof ApiHttpError ? err.message : err instanceof Error ? err.message : "Erro ao buscar");
    } finally {
      setBuscando(false);
    }
  }

  // Painel de KPIs vem do backend, ja quebrado por bucket de situacao. Antes
  // era hardcoded a zero pra emAnalise/aprovadas/recusadas — o painel so mostrava
  // "formalizadas". Agora sobe conforme propostas caminham no funil.
  const painel = useMemo(() => {
    const p = visao.data?.kpis.propostas;
    const vol = visao.data?.kpis.volumePorConvenio ?? [];
    return {
      emAnalise: p?.emAnalise ?? 0,
      aprovadas: p?.aprovadas ?? 0,
      formalizadas: p?.formalizadas ?? 0,
      recusadasExpiradas: p?.recusadasExpiradas ?? 0,
      volumePorConvenio: new Map(vol.map((v) => [v.nome, v.valor])),
    };
  }, [visao.data?.kpis.propostas, visao.data?.kpis.volumePorConvenio]);

  // isPending (nao isLoading) — refetch de fundo nao pisca "Carregando" a cada 8s.
  if (visao.isPending || comunicados.isPending) {
    return <div style={{ color: "var(--text-muted)" }}>Carregando visão geral...</div>;
  }
  if (visao.error || comunicados.error) {
    return (
      <div style={{ color: "var(--danger-500)" }}>
        Erro ao carregar: {(visao.error ?? comunicados.error) instanceof Error ? (visao.error ?? comunicados.error)!.message : ""}
      </div>
    );
  }

  const v = visao.data!;
  // Banco sem convenio ativo — backend devolve dia=0 e origem "—". Nao ha
  // ciclo de folha pra derivar cortes/mural: zeramos aqui e mostramos um
  // estado "Sem convênio ativo" em vez de fabricar competencias fantasmas.
  const semConvenio = v.dataCorte.dia === 0;
  const cortes = semConvenio ? [] : buildCortes(v.dataCorte.dia, v.dataCorte.origem, v.dataCorte.operacoes, v.folhas);
  // Mural: mesmo modelo dos exemplos — item em processamento tem "recebido ha X min",
  // itens concluidos mostram a data de conclusao (dia seguinte ao corte da competencia)
  // e o texto expandido "ATENCAO: ...".
  const agora = new Date();
  const recebidoHaMin = 30; // valor estavel — nao usa Date.now() no build/isolate
  const mural = semConvenio
    ? []
    : (() => {
        const atual = cortes[6]!;
        const previsaoLabel = "hoje";
        return [
          {
            competencia: atual.competencia,
            status: "processando" as const,
            previsao: previsaoLabel,
            recebidoHaMin,
          },
          ...[5, 4, 3, 2].map((i) => {
            const c = cortes[i]!;
            // Data em que o retorno "ficou disponivel" — 1 dia apos o corte.
            const refMes = agora.getMonth() + (i - 6);
            const ref = new Date(agora.getFullYear(), refMes + 1, 1); // primeiro dia do mes seguinte a competencia
            const dd = String(ref.getDate()).padStart(2, "0");
            const mm = String(ref.getMonth() + 1).padStart(2, "0");
            const yyyy = ref.getFullYear();
            // "mes seguinte" para o texto da mensagem
            const proximoMes = MESES_PT[(ref.getMonth() + 1) % 12]!;
            const proximoAno = ref.getMonth() === 11 ? yyyy + 1 : yyyy;
            return {
              competencia: c.competencia,
              status: "concluido" as const,
              disponibilizadoEm: `${dd}/${mm}/${yyyy}`,
              mesSeguinte: `${proximoMes}/${proximoAno}`,
            };
          }),
        ];
      })();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          {semConvenio ? "Sem convênio" : "Convênio ativo"}
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem", letterSpacing: "-0.02em" }}>
          {semConvenio ? "Nenhum convênio ativado ainda" : v.convenio.prefeitura}
        </h1>
        <div style={{ color: "var(--text-muted)" }}>
          {semConvenio ? "Solicite a habilitação de um convênio pela averbadora para começar a operar." : v.convenio.nome}
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <KpiCard
          label="Carteira de Contratos"
          value={v.kpis.carteira.count}
          hint={`Percentual: ${(v.kpis.carteira.percentual * 100).toFixed(0)}%`}
          cta={{ label: "Meus contratos", onClick: () => nav("/banco/carteira") }}
          accent="info"
        />
        <KpiCard
          label="Novos Contratos"
          value={v.kpis.novosNoMes.count}
          hint="Neste mês"
          cta={{ label: "Ver contratos", onClick: () => nav("/banco/carteira") }}
        />
        <KpiCard
          label="Pendências em Contratos"
          value={v.kpis.pendencias.count}
          hint={v.kpis.pendencias.count > 0 ? "Aguardando ação" : "Tudo em dia"}
          cta={{ label: "Resolver", onClick: () => nav("/banco/carteira") }}
          accent={v.kpis.pendencias.count > 0 ? "warn" : "success"}
        />
        {semConvenio ? (
          <KpiCard
            label="Data de corte"
            value="—"
            hint="Sem convênio ativo"
          />
        ) : (
          (() => {
            const idx = Math.min(Math.max(corteIdx, 0), cortes.length - 1);
            const c = cortes[idx]!;
            return (
              <DataCorteCard
                dia={c.dia}
                mes={c.mes}
                competencia={c.competencia}
                origem={c.origem}
                operacoes={c.operacoes}
                repasse={c.repasse}
                canPrev={idx > 0}
                canNext={idx < cortes.length - 1}
                onPrev={() => setCorteIdx((i) => Math.max(0, i - 1))}
                onNext={() => setCorteIdx((i) => Math.min(cortes.length - 1, i + 1))}
              />
            );
          })()
        )}
      </div>

      {/* Próximo passo — atalho para iniciar uma nova operação buscando o servidor */}
      <form
        onSubmit={iniciarOperacao}
        style={{
          background: "color-mix(in srgb, var(--accent) 8%, var(--bg-elev))",
          border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))",
          borderRadius: 16,
          padding: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 220 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.08em", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase" }}>
            Próximo passo
          </div>
          <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text)", marginTop: 2 }}>
            Iniciar nova operação de crédito
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
            Busque pelo servidor para consultar a margem disponível.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flex: "1 1 320px", minWidth: 240 }}>
          <div style={{ flex: 1 }}>
            <Input
              label=""
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Matrícula ou CPF…"
              inputMode="numeric"
            />
          </div>
          <Button type="submit" disabled={buscando || !busca.trim()}>
            {buscando ? "Buscando…" : "Buscar →"}
          </Button>
        </div>
        {buscaErro ? (
          <div style={{ flexBasis: "100%", color: "var(--danger-500)", fontSize: 13 }}>{buscaErro}</div>
        ) : null}
      </form>

      {/* Mural de atualizações de margem — retorno dos arquivos pós-fechamento de folha.
          Escondido quando banco nao tem convenio ativo (nao ha folha pra bater). */}
      {semConvenio ? null : (
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Mural de atualizações de margem</h2>
            <span style={{ fontSize: 11, color: "var(--text-dim)", border: "1px solid var(--border)", borderRadius: 999, padding: "2px 8px" }}>
              {v.convenio.nome}
            </span>
          </div>
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>retorno de arquivos pós-fechamento de folha</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mural.map((m) => {
            const proc = m.status === "processando";
            const cor = proc ? "var(--gold-500)" : "var(--emerald-500)";
            return (
              <div
                key={m.competencia}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "var(--bg-elev)",
                  borderLeft: `3px solid ${cor}`,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700 }}>
                    Retorno {m.competencia}
                  </div>
                  {proc ? (
                    <>
                      <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                        Arquivo recebido — processando descontos e atualizando margens.
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
                        Previsão de conclusão: <b style={{ color: "var(--text-muted)" }}>{m.previsao}</b> · recebido há {m.recebidoHaMin}min
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                      <b style={{ color: "var(--text)" }}>{m.disponibilizadoEm}</b> — <b>ATENÇÃO:</b> Já está disponível o retorno da integração com a folha. As margens dos servidores estão atualizadas para o mês de {m.mesSeguinte}.
                    </div>
                  )}
                </div>
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    color: cor,
                    border: `1px solid ${cor}`,
                    borderRadius: 999,
                    padding: "2px 10px",
                  }}
                >
                  {proc ? "Em processamento" : "Concluído"}
                </span>
              </div>
            );
          })}
        </div>
      </section>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Painel de propostas</h2>
          <button
            onClick={() => nav("/banco/propostas")}
            style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            Ver a esteira →
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <KpiCard
            label="Propostas em análise"
            value={painel.emAnalise}
            hint="Aguardando decisão"
            cta={{ label: "Analisar", onClick: () => nav("/banco/propostas") }}
            accent="info"
          />
          <KpiCard label="Aprovadas" value={painel.aprovadas} hint="Aguardando/enviando formalização" accent="success" />
          <KpiCard label="Formalizadas" value={painel.formalizadas} hint="Assinadas / averbadas" />
          <KpiCard
            label="Recusadas / expiradas"
            value={painel.recusadasExpiradas}
            hint={painel.recusadasExpiradas > 0 ? "Sem efeito na carteira" : "Nenhuma"}
            accent={painel.recusadasExpiradas > 0 ? "warn" : "success"}
          />
        </div>

        <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 12 }}>
            Volume contratado por convênio
          </div>
          {painel.volumePorConvenio.size === 0 ? (
            <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Nenhuma operação averbada ainda.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...painel.volumePorConvenio.entries()].map(([conv, total]) => (
                <div key={conv} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "var(--text-muted)" }}>{conv}</span>
                  <span style={{ fontWeight: 600 }}>{fmtBRL(total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <ComunicadoCarrossel comunicados={comunicados.data!.comunicados} />
    </div>
  );
}
