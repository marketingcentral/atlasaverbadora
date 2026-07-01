import { useState } from "react";
import { Button, DataTable, Pill, type Column } from "@atlas/ui/web";
import { downloadJson } from "../../lib/csv";
import { fmtBRL, fmtDateTime, getBancoPerfil } from "../../lib/banco-propostas";
import { gerarAdf, getAdf, getCarteira, type Contrato } from "../../lib/banco-carteira";

export function BancoAdf() {
  const perfil = getBancoPerfil();
  const [version, setVersion] = useState(0);
  const contratos = getCarteira();
  void version;

  const baixar = (c: Contrato) => {
    const adf = gerarAdf(c.idUnico);
    setVersion((v) => v + 1);
    downloadJson(`${adf.numero}.json`, {
      documento: "Autorização de Desconto em Folha",
      numero: adf.numero,
      idUnicoOperacao: c.idUnico, // ID único fornecido pela averbadora — chave da ADF
      convenio: c.convenio,
      servidor: { nome: c.nome, cpf: c.cpfMasked, matricula: c.matricula },
      operacao: { valor: c.valor, parcelas: c.parcelas, valorParcela: c.valorParcela },
      geradaEm: adf.geradaEm,
    });
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
          fornecido pela averbadora.
        </p>
      </header>

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
