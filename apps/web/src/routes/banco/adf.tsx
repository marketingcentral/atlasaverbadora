import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, DataTable, Pill, SelectField, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { buildSimplePdf, downloadPdf } from "../../lib/pdf";
import { fmtBRL, fmtDateTime, getBancoPerfil, type BancoProduto } from "../../lib/banco-propostas";
import { gerarAdf, getAdf, getCarteira, type Contrato, type ContratoStatus } from "../../lib/banco-carteira";

type FiltroAdf = "todas" | "geradas" | "pendentes";

/** Mesmo mapeamento da carteira — so contratos com situacao final entram na
 *  lista de ADFs. Reservas/aguardando nao geram ADF. */
function mapSituacaoBackend(situacao: string): ContratoStatus | null {
  const t = situacao.toLowerCase();
  if (t.includes("quitad")) return "quitado";
  if (t.includes("inadimpl")) return "inadimplente";
  if (t.includes("ativo") || t.includes("averb")) return "em_dia";
  return null;
}

export function BancoAdf() {
  const perfil = getBancoPerfil();
  const [version, setVersion] = useState(0);
  const [filtro, setFiltro] = useState<FiltroAdf>("todas");

  // Backend: contratos aprovados (mesma fonte que /banco/carteira).
  const q = useQuery({
    queryKey: ["banco", "contratos-api"],
    queryFn: () => atlas.banco.contratos(),
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
  });

  const contratosBackend: Contrato[] = useMemo(() => {
    const list = q.data?.contratos ?? [];
    return list
      .map((ct): Contrato | null => {
        const s = mapSituacaoBackend(ct.situacao);
        if (!s) return null;
        const tipo = ct.tipoContrato?.toLowerCase() ?? "";
        const produtoUi: BancoProduto = tipo.includes("portab") ? "portabilidade" : "novo";
        return {
          idUnico: ct.adf,
          cpfMasked: ct.cpfMasked,
          nome: ct.nome,
          convenio: ct.convenio,
          matricula: ct.matricula,
          produto: produtoUi,
          valor: ct.valorFinanciado,
          parcelas: ct.totalParcelas,
          valorParcela: ct.valorParcela,
          status: s,
          proximaParcela: "",
          averbadoEm: ct.lancamento || new Date().toISOString(),
          ccbUrl: `https://formaliza.banco.com.br/ccb/${ct.adf}.pdf`,
        };
      })
      .filter((c): c is Contrato => c !== null);
  }, [q.data]);

  // Merge SEED + backend, dedupe por idUnico, recentes no topo.
  void version;
  const todosContratos = useMemo(() => {
    const seed = getCarteira();
    const byId = new Map<string, Contrato>();
    for (const c of seed) byId.set(c.idUnico, c);
    for (const c of contratosBackend) byId.set(c.idUnico, c);
    return [...byId.values()].sort((a, b) => {
      const ta = new Date(b.averbadoEm).getTime() || 0;
      const tb = new Date(a.averbadoEm).getTime() || 0;
      return ta - tb;
    });
  }, [contratosBackend]);

  const contratos = filtro === "todas"
    ? todosContratos
    : todosContratos.filter((c) => (filtro === "geradas" ? !!getAdf(c.idUnico) : !getAdf(c.idUnico)));

  const baixar = (c: Contrato) => {
    const adf = gerarAdf(c.idUnico);
    setVersion((v) => v + 1);
    // PDF oficial (Courier + Courier-Bold, gerado no cliente sem dependencias).
    const pdf = buildSimplePdf("AUTORIZACAO DE DESCONTO EM FOLHA (ADF)", [
      { text: `Numero: ${adf.numero}`, bold: true },
      `ID unico da operacao: ${c.idUnico}`,
      `Gerada em: ${fmtDateTime(adf.geradaEm)}`,
      "",
      { text: "SERVIDOR", bold: true },
      `Nome: ${c.nome}`,
      `CPF: ${c.cpfMasked}`,
      `Matricula: ${c.matricula}`,
      `Convenio: ${c.convenio}`,
      "",
      { text: "OPERACAO", bold: true },
      `Valor total: ${fmtBRL(c.valor).replace(/\s/g, " ")}`,
      `Parcelas: ${c.parcelas}x de ${fmtBRL(c.valorParcela).replace(/\s/g, " ")}`,
      `CCB: ${c.ccbUrl}`,
      "",
      "Este documento autoriza o desconto em folha das parcelas descritas",
      "acima, conforme convenio vigente entre o banco e a prefeitura.",
      "A conformidade da averbacao e responsabilidade da Atlas Averbadora.",
    ]);
    downloadPdf(`${adf.numero}.pdf`, pdf);
  };

  const geradasCount = todosContratos.filter((c) => getAdf(c.idUnico)).length;
  const contadores = {
    geradas: geradasCount,
    pendentes: todosContratos.length - geradasCount,
    total: todosContratos.length,
  };

  const columns: Column<Contrato>[] = [
    { key: "idUnico", header: "ID único", mono: true },
    {
      key: "nome",
      header: "Servidor",
      render: (r) => (
        <>
          <div>{r.nome}</div>
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{r.cpfMasked} / {r.matricula}</div>
        </>
      ),
    },
    { key: "convenio", header: "Convênio" },
    { key: "valorParcela", header: "Parcela", align: "right", render: (r) => fmtBRL(r.valorParcela) },
    {
      key: "adf",
      header: "ADF",
      render: (r) => {
        const adf = getAdf(r.idUnico);
        return adf ? (
          <>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{adf.numero}</div>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{fmtDateTime(adf.geradaEm)}</div>
          </>
        ) : (
          <Pill variant="pendente">Não gerada</Pill>
        );
      },
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Conformidade
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>ADF — Autorização de Desconto em Folha</h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 680 }}>
          Cada operação averbada gera e armazena sua ADF. O documento carrega o <strong>ID único da operação</strong>,
          fornecido pela averbadora. A ADF é baixada em PDF oficial.
        </p>
      </header>

      <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
        <SelectField
          label="Situação"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as FiltroAdf)}
          options={[
            { value: "todas", label: `Todas (${contadores.total})` },
            { value: "geradas", label: `Geradas (${contadores.geradas})` },
            { value: "pendentes", label: `Pendentes (${contadores.pendentes})` },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        rows={contratos}
        rowKey={(r) => r.idUnico}
        emptyState="Nenhuma operação averbada na carteira."
        actions={(r) =>
          perfil.perms.exportacao ? (
            <Button variant="ghost" size="sm" onClick={() => baixar(r)}>
              {getAdf(r.idUnico) ? "Baixar ADF" : "Gerar e baixar"}
            </Button>
          ) : (
            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>sem permissão</span>
          )
        }
      />
    </div>
  );
}
