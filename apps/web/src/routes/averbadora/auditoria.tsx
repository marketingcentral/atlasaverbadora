import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable, FormGrid, Pill, SelectField, TextField, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { AdminAuditEntry, AuditCategoria } from "@atlas/sdk";

const VAR_BY_CAT: Record<AuditCategoria, "averbado" | "emdia" | "pendente" | "rejeitada" | "expirado" | "aceita"> = {
  pre_reserva: "pendente",
  termo_aceite: "aceita",
  biometria: "averbado",
  dados_pessoais: "emdia",
  margem: "expirado",
  tombamento: "averbado",
  id_unico: "emdia",
  convenio_config: "emdia",
  acesso: "aceita",
};

export function AdminAuditoria() {
  const [categoria, setCategoria] = useState<"" | AuditCategoria>("");
  const [cpf, setCpf] = useState("");
  const [matricula, setMatricula] = useState("");
  const [propostaId, setPropostaId] = useState("");
  const [desde, setDesde] = useState("");
  const [ate, setAte] = useState("");

  const data = useQuery({
    queryKey: ["admin", "auditoria", categoria, cpf, matricula, propostaId, desde, ate],
    queryFn: () =>
      atlas.admin.listAuditoria({
        categoria: categoria || undefined,
        cpf: cpf || undefined,
        matricula: matricula || undefined,
        proposta_id: propostaId || undefined,
        desde: desde ? new Date(desde).toISOString() : undefined,
        ate: ate ? new Date(ate).toISOString() : undefined,
        limit: 300,
      }),
  });

  const columns: Column<AdminAuditEntry>[] = [
    { key: "ts", header: "Quando", render: (e) => new Date(e.ts).toLocaleString("pt-BR") },
    { key: "categoria", header: "Categoria", render: (e) => <Pill variant={VAR_BY_CAT[e.categoria]}>{e.categoria}</Pill> },
    { key: "acao", header: "Ação", mono: true },
    { key: "cpf", header: "CPF", render: (e) => e.cpf ?? "—" },
    { key: "matricula", header: "Matrícula", render: (e) => e.matricula ?? "—" },
    { key: "idUnico", header: "ID único", mono: true, render: (e) => e.idUnico ?? "—" },
    { key: "user", header: "Usuário", render: (e) => e.userId ? `${e.userId}` : "—" },
    { key: "detalhes", header: "Detalhes", render: (e) => e.detalhes },
    { key: "trace_id", header: "Trace", mono: true },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Averbadora
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Auditoria</h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 720 }}>
          Trilha de auditoria append-only: pré-reservas, aceites de termo, biometria, alterações de dados pessoais, movimentações de margem, tombamento e acessos.
          Cada registro guarda timestamp, IP/device quando aplicável, CPF mascarado, ID da proposta e termo aceito.
        </p>
      </header>

      <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: 20 }}>
        <FormGrid cols={3}>
          <SelectField
            label="Categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as "" | AuditCategoria)}
            options={[
              { value: "", label: "Todas" },
              ...(data.data?.categorias ?? []).map((c) => ({ value: c.value, label: c.label })),
            ]}
          />
          <TextField label="CPF mascarado" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="ex: 000.***.***-33" />
          <TextField label="Matrícula" value={matricula} onChange={(e) => setMatricula(e.target.value)} placeholder="ex: M-9001" />
          <TextField label="ID da proposta" value={propostaId} onChange={(e) => setPropostaId(e.target.value)} />
          <TextField label="Desde" type="datetime-local" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <TextField label="Até" type="datetime-local" value={ate} onChange={(e) => setAte(e.target.value)} />
        </FormGrid>
      </div>

      <DataTable
        columns={columns}
        rows={data.data?.entries ?? []}
        rowKey={(e) => e.id}
        loading={data.isLoading}
      />
    </div>
  );
}
