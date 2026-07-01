import { useMemo, useState } from "react";
import { Button, DataTable, Pill, SelectField, type Column } from "@atlas/ui/web";
import { downloadCsv, downloadJson } from "../../../lib/csv";
import {
  getBancoConvenios,
  PRODUTO_LABEL,
  fmtBRL,
  getBancoPerfil,
  type BancoProduto,
} from "../../../lib/banco-propostas";
import {
  CONTRATO_STATUS_LABEL,
  gerarAdf,
  getAdf,
  getCarteira,
  type Contrato,
  type ContratoStatus,
} from "../../../lib/banco-carteira";

function statusPill(s: ContratoStatus): "emdia" | "aceita" | "rejeitada" {
  return s === "em_dia" ? "emdia" : s === "quitado" ? "aceita" : "rejeitada";
}

export function BancoCarteira() {
  const perfil = getBancoPerfil();
  const [convenio, setConvenio] = useState("");
  const [produto, setProduto] = useState<"" | BancoProduto>("");
  const [status, setStatus] = useState<"" | ContratoStatus>("");
  const [version, setVersion] = useState(0);

  const contratos = useMemo(() => {
    void version;
    return getCarteira().filter((c) => {
      if (convenio && c.convenio !== convenio) return false;
      if (produto && c.produto !== produto) return false;
      if (status && c.status !== status) return false;
      return true;
    });
  }, [convenio, produto, status, version]);

  const exportRows = () =>
    contratos.map((c) => ({
      idUnico: c.idUnico,
      cpf: c.cpfMasked,
      nome: c.nome,
      convenio: c.convenio,
      matricula: c.matricula,
      produto: PRODUTO_LABEL[c.produto],
      valor: c.valor,
      parcelas: c.parcelas,
      valorParcela: c.valorParcela,
      status: CONTRATO_STATUS_LABEL[c.status],
      proximaParcela: c.proximaParcela,
      adf: getAdf(c.idUnico)?.numero ?? "",
      ccb: c.ccbUrl,
    }));

  const columns: Column<Contrato>[] = [
    { key: "status", header: "Status", render: (r) => <Pill variant={statusPill(r.status)}>{CONTRATO_STATUS_LABEL[r.status]}</Pill> },
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
    { key: "valor", header: "Valor", align: "right", render: (r) => fmtBRL(r.valor) },
    { key: "parcelas", header: "Parcelas", align: "right", render: (r) => `${r.parcelas}x de ${fmtBRL(r.valorParcela)}` },
    { key: "proximaParcela", header: "Próx. parcela", render: (r) => r.proximaParcela },
    {
      key: "ccb",
      header: "CCB",
      render: (r) => (
        <a href={r.ccbUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontSize: 13 }}>
          PDF
        </a>
      ),
    },
    {
      key: "adf",
      header: "ADF",
      render: (r) => {
        const adf = getAdf(r.idUnico);
        if (adf) return <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{adf.numero}</span>;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              gerarAdf(r.idUnico);
              setVersion((v) => v + 1);
            }}
          >
            Gerar
          </Button>
        );
      },
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Carteira
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Meus contratos</h1>
          <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 640 }}>
            Contratos averbados por convênio. O <strong>ID único</strong> é a chave de conciliação de cada operação.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {perfil.perms.exportacao ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => downloadCsv("carteira-banco.csv", exportRows())}>Exportar CSV</Button>
              <Button variant="ghost" size="sm" onClick={() => downloadJson("carteira-banco.json", exportRows())}>Exportar JSON</Button>
            </>
          ) : (
            <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Perfil sem permissão de exportação</span>
          )}
        </div>
      </header>

      <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
        <SelectField
          label="Convênio"
          value={convenio}
          onChange={(e) => setConvenio(e.target.value)}
          options={[{ value: "", label: "Todos" }, ...getBancoConvenios().map((c) => ({ value: c, label: c }))]}
        />
        <SelectField
          label="Produto"
          value={produto}
          onChange={(e) => setProduto(e.target.value as "" | BancoProduto)}
          options={[
            { value: "", label: "Todos" },
            { value: "novo", label: PRODUTO_LABEL.novo },
            { value: "portabilidade", label: PRODUTO_LABEL.portabilidade },
          ]}
        />
        <SelectField
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as "" | ContratoStatus)}
          options={[
            { value: "", label: "Todos" },
            { value: "em_dia", label: CONTRATO_STATUS_LABEL.em_dia },
            { value: "inadimplente", label: CONTRATO_STATUS_LABEL.inadimplente },
            { value: "quitado", label: CONTRATO_STATUS_LABEL.quitado },
          ]}
        />
      </div>

      <DataTable columns={columns} rows={contratos} rowKey={(r) => r.idUnico} emptyState="Nenhum contrato com esses filtros." />
    </div>
  );
}
