import { useMemo, useState } from "react";
import { DataTable, Pill, SelectField, TextField, Button, type Column } from "@atlas/ui/web";
import { downloadCsv } from "../../lib/csv";
import { fmtBRL, getBancoPerfil, getBancoConvenios } from "../../lib/banco-propostas";
import {
  SITUACAO_LABEL,
  VINCULO_LABEL,
  getBancoServidores,
  type BancoServidorRow,
  type ServidorSituacao,
  type ServidorVinculo,
} from "../../lib/banco-servidores";

export function BancoServidores() {
  const perfil = getBancoPerfil();
  const [busca, setBusca] = useState("");
  const [convenio, setConvenio] = useState("");
  const [vinculo, setVinculo] = useState<"" | ServidorVinculo>("");
  const [situacao, setSituacao] = useState<"" | ServidorSituacao>("");
  const [soComContrato, setSoComContrato] = useState(false);

  const todos = getBancoServidores();
  const convenios = getBancoConvenios();

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return todos.filter((s) => {
      if (convenio && s.convenio !== convenio) return false;
      if (vinculo && s.vinculo !== vinculo) return false;
      if (situacao && s.situacao !== situacao) return false;
      if (soComContrato && !s.temContratoConosco) return false;
      if (q) {
        const hay = `${s.nome} ${s.matricula} ${s.cpfMasked} ${s.cargo}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [todos, busca, convenio, vinculo, situacao, soComContrato]);

  const resumo = useMemo(() => {
    const trabalhando = filtrados.filter((s) => s.situacao === "TRABALHANDO").length;
    const comContrato = filtrados.filter((s) => s.temContratoConosco).length;
    const semMargem = filtrados.filter((s) => s.margemDisponivel === 0).length;
    return { total: filtrados.length, trabalhando, comContrato, semMargem };
  }, [filtrados]);

  const columns: Column<BancoServidorRow>[] = [
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
    { key: "cargo", header: "Cargo" },
    { key: "vinculo", header: "Vínculo", render: (r) => VINCULO_LABEL[r.vinculo] },
    {
      key: "situacao",
      header: "Situação",
      render: (r) => (
        <Pill variant={r.situacao === "TRABALHANDO" ? "emdia" : r.situacao === "AFASTADO" ? "pendente" : r.situacao === "APOSENTADO" ? "aceita" : "rejeitada"}>
          {SITUACAO_LABEL[r.situacao]}
        </Pill>
      ),
    },
    { key: "salarioLiquido", header: "Salário líq.", align: "right", render: (r) => fmtBRL(r.salarioLiquido) },
    {
      key: "margemDisponivel",
      header: "Margem disp.",
      align: "right",
      render: (r) => (
        <span style={{ color: r.margemDisponivel === 0 ? "var(--danger-500)" : "var(--text)" }}>
          {fmtBRL(r.margemDisponivel)}
        </span>
      ),
    },
    {
      key: "temContratoConosco",
      header: "Contrato conosco",
      align: "center",
      render: (r) =>
        r.temContratoConosco ? (
          <Pill variant="averbado">{r.contratosAtivos > 1 ? `${r.contratosAtivos} ativos` : "1 ativo"}</Pill>
        ) : (
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>—</span>
        ),
    },
  ];

  const exportar = () => {
    downloadCsv(
      "servidores-banco.csv",
      filtrados.map((s) => ({
        nome: s.nome,
        cpfMasked: s.cpfMasked,
        matricula: s.matricula,
        convenio: s.convenio,
        cargo: s.cargo,
        vinculo: VINCULO_LABEL[s.vinculo],
        situacao: SITUACAO_LABEL[s.situacao],
        salarioLiquido: s.salarioLiquido,
        margemDisponivel: s.margemDisponivel,
        contratosConosco: s.contratosAtivos,
      })),
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Base
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Servidores dos convênios</h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 720 }}>
          Consulta <strong>read-only</strong> dos servidores dos convênios que o seu banco opera. A base é da prefeitura,
          consolidada pela averbadora — o banco não edita esses dados. CPF sai mascarado.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <Stat label="Total (filtrado)" value={`${resumo.total}`} />
        <Stat label="Trabalhando" value={`${resumo.trabalhando}`} />
        <Stat label="Com contrato conosco" value={`${resumo.comContrato}`} />
        <Stat label="Sem margem disp." value={`${resumo.semMargem}`} warn={resumo.semMargem > 0} />
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
        <div style={{ minWidth: 260, flex: "1 1 260px" }}>
          <TextField
            label="Buscar (nome, matrícula, CPF, cargo)"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Ex.: Maria, PALH-88213, ***.412..."
          />
        </div>
        <SelectField
          label="Convênio"
          value={convenio}
          onChange={(e) => setConvenio(e.target.value)}
          options={[{ value: "", label: "Todos" }, ...convenios.map((c) => ({ value: c, label: c }))]}
        />
        <SelectField
          label="Vínculo"
          value={vinculo}
          onChange={(e) => setVinculo(e.target.value as "" | ServidorVinculo)}
          options={[
            { value: "", label: "Todos" },
            ...(Object.keys(VINCULO_LABEL) as ServidorVinculo[]).map((v) => ({ value: v, label: VINCULO_LABEL[v] })),
          ]}
        />
        <SelectField
          label="Situação"
          value={situacao}
          onChange={(e) => setSituacao(e.target.value as "" | ServidorSituacao)}
          options={[
            { value: "", label: "Todas" },
            ...(Object.keys(SITUACAO_LABEL) as ServidorSituacao[]).map((s) => ({ value: s, label: SITUACAO_LABEL[s] })),
          ]}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={soComContrato} onChange={(e) => setSoComContrato(e.target.checked)} />
          Só com contrato conosco
        </label>
        {perfil.perms.exportacao ? (
          <Button
            variant="ghost"
            onClick={exportar}
            disabled={filtrados.length === 0}
            title={filtrados.length === 0 ? "Nada a exportar" : "Baixar CSV"}
          >
            Exportar CSV{filtrados.length > 0 ? ` (${filtrados.length})` : ""}
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        rows={filtrados}
        rowKey={(r) => r.matricula}
        emptyState="Nenhum servidor com esses filtros."
      />
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: warn ? "var(--gold-500)" : "var(--text)" }}>{value}</div>
    </div>
  );
}
