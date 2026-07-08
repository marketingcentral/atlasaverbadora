import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, DataTable, Pill, SelectField, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { buildSimplePdf, downloadPdf } from "../../lib/pdf";
import { fmtBRL, fmtDateTime } from "../../lib/banco-propostas";
import { gerarAdf, getAdf, type Contrato, type ContratoStatus } from "../../lib/banco-carteira";

// ADF da averbadora — visao GLOBAL de todos os bancos. Reaproveita:
// - lib/banco-carteira: gerarAdf/getAdf (localStorage) — o numero da ADF vive
//   no dispositivo de quem gera (o admin no caso), igual banco fazia.
// - lib/pdf: mesmo PDF Courier oficial.
// Diferenca vs banco/adf.tsx: chama atlas.admin.contratos() (sem filtro por
// banco) e adiciona coluna "Banco" no lugar de nenhuma.

type FiltroAdf = "todas" | "geradas" | "pendentes";

/** Uma linha da ADF admin: contrato + banco dono. */
interface ContratoComBanco extends Contrato {
  bancoNome: string;
}

function mapSituacaoBackend(situacao: string): ContratoStatus | null {
  const t = situacao.toLowerCase();
  if (t.includes("quitad")) return "quitado";
  if (t.includes("inadimpl")) return "inadimplente";
  if (t.includes("ativo") || t.includes("averb") || t.includes("libera")) return "em_dia";
  return null;
}

/** Parseia ISO ou DD/MM/YYYY (formato BR das fixtures do backend). 0 se falhar. */
function parseLancamento(raw: string | null | undefined): number {
  if (!raw) return 0;
  const iso = new Date(raw).getTime();
  if (!Number.isNaN(iso)) return iso;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
  return 0;
}

export function AdminAdf() {
  const [version, setVersion] = useState(0);
  const [filtro, setFiltro] = useState<FiltroAdf>("todas");
  const [bancoFiltro, setBancoFiltro] = useState<string>("");

  const q = useQuery({
    queryKey: ["admin", "contratos"],
    queryFn: () => atlas.admin.contratos(),
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
  });

  const contratosBackend: ContratoComBanco[] = useMemo(() => {
    const list = q.data?.contratos ?? [];
    return list
      .map((ct): ContratoComBanco | null => {
        const s = mapSituacaoBackend(ct.situacao);
        if (!s) return null;
        return {
          idUnico: ct.adf,
          cpfMasked: ct.cpfMasked,
          nome: ct.nome,
          convenio: ct.convenio,
          matricula: ct.matricula,
          produto: ct.tipoContrato?.toLowerCase().includes("portab") ? "portabilidade" : "novo",
          valor: ct.valorFinanciado,
          parcelas: ct.totalParcelas,
          valorParcela: ct.valorParcela,
          status: s,
          proximaParcela: "",
          averbadoEm: ct.atualizadoEm ?? (() => {
            const t = parseLancamento(ct.lancamento);
            return t > 0 ? new Date(t).toISOString() : new Date().toISOString();
          })(),
          ccbUrl: `https://formaliza.banco.com.br/ccb/${ct.adf}.pdf`,
          bancoNome: ct.bancoNome,
        };
      })
      .filter((c): c is ContratoComBanco => c !== null);
  }, [q.data]);

  void version;
  const todosContratos = useMemo(() => {
    const byId = new Map<string, ContratoComBanco>();
    for (const c of contratosBackend) byId.set(c.idUnico, c);
    return [...byId.values()].sort(
      (a, b) => parseLancamento(b.averbadoEm) - parseLancamento(a.averbadoEm),
    );
  }, [contratosBackend]);

  const bancosUnicos = useMemo(
    () => Array.from(new Set(todosContratos.map((c) => c.bancoNome))).sort(),
    [todosContratos],
  );

  const contratos = todosContratos.filter((c) => {
    if (bancoFiltro && c.bancoNome !== bancoFiltro) return false;
    if (filtro === "geradas") return !!getAdf(c.idUnico);
    if (filtro === "pendentes") return !getAdf(c.idUnico);
    return true;
  });

  const baixar = (c: ContratoComBanco) => {
    const adf = gerarAdf(c.idUnico);
    setVersion((v) => v + 1);
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
      { text: "BANCO", bold: true },
      `Instituicao: ${c.bancoNome}`,
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

  const columns: Column<ContratoComBanco>[] = [
    { key: "idUnico", header: "ID único", mono: true },
    {
      key: "bancoNome",
      header: "Banco",
      render: (r) => <span style={{ fontSize: 12 }}>{r.bancoNome}</span>,
    },
    {
      key: "nome",
      header: "Servidor",
      render: (r) => (
        <>
          <div>{r.nome}</div>
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
            {r.cpfMasked} / {r.matricula}
          </div>
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
        <span
          style={{
            fontSize: 12,
            letterSpacing: "0.1em",
            fontWeight: 700,
            color: "var(--text-dim)",
            textTransform: "uppercase",
          }}
        >
          Conformidade
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>
          ADF — Autorização de Desconto em Folha
        </h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 720 }}>
          Visão consolidada de todos os bancos: cada operação averbada gera e armazena sua ADF.
          O documento carrega o <strong>ID único da operação</strong>. A ADF é baixada em PDF oficial.
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
        <SelectField
          label="Banco"
          value={bancoFiltro}
          onChange={(e) => setBancoFiltro(e.target.value)}
          options={[{ value: "", label: "Todos" }, ...bancosUnicos.map((b) => ({ value: b, label: b }))]}
        />
      </div>

      <DataTable
        columns={columns}
        rows={contratos}
        rowKey={(r) => r.idUnico}
        emptyState="Nenhuma operação averbada."
        actions={(r) => (
          <Button variant="ghost" size="sm" onClick={() => baixar(r)}>
            {getAdf(r.idUnico) ? "Baixar ADF" : "Gerar e baixar"}
          </Button>
        )}
      />
    </div>
  );
}
