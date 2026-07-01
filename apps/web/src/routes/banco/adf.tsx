import { useMemo, useState } from "react";
import { Button, DataTable, Pill, SelectField, type Column } from "@atlas/ui/web";
import { buildSimplePdf, downloadPdf } from "../../lib/pdf";
import { fmtBRL, fmtDateTime, getBancoPerfil } from "../../lib/banco-propostas";
import { gerarAdf, getAdf, getCarteira, type Contrato } from "../../lib/banco-carteira";

type FiltroAdf = "todas" | "geradas" | "pendentes";

export function BancoAdf() {
  const perfil = getBancoPerfil();
  const [version, setVersion] = useState(0);
  const [filtro, setFiltro] = useState<FiltroAdf>("todas");
  const todosContratos = getCarteira();
  void version;

  const contratos = useMemo(() => {
    if (filtro === "todas") return todosContratos;
    return todosContratos.filter((c) => (filtro === "geradas" ? !!getAdf(c.idUnico) : !getAdf(c.idUnico)));
  }, [todosContratos, filtro, version]);

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

  const contadores = useMemo(() => {
    const geradas = todosContratos.filter((c) => getAdf(c.idUnico)).length;
    const pendentes = todosContratos.length - geradas;
    return { geradas, pendentes, total: todosContratos.length };
  }, [todosContratos, version]);

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
