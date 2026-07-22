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

/** Regras de aplicabilidade das colunas CPF/Matricula/ID unico por evento.
 *  Retorna false quando o campo NAO faz sentido pra aquele evento (vira
 *  "n/a" na UI, cinza dim); true quando faz sentido — se vier vazio, vira
 *  "—" pra sinalizar dado ausente. Regras derivadas dos appendAudit em
 *  apps/api/src/modules/{auth,servidores,admin,prefeitura}/*.ts. */
function cpfAplicavel(e: AdminAuditEntry): boolean {
  // Login/2FA de banco/prefeitura/averbadora e por email — sem CPF.
  if (e.categoria === "acesso" && e.userRole && e.userRole !== "servidor" && e.userRole !== "-") return false;
  // Tombamento e convenio_config sao acoes admin agregadas.
  if (e.categoria === "tombamento" || e.categoria === "convenio_config") return false;
  // Acoes admin agregadas dentro de margem/termo_aceite/acesso/id_unico.
  const acoesAgregadas = new Set([
    "reverter_desligamento", "marcar_portabilidade", "limpar_ccb",
    "anuencia_removida", "destructive_unlock",
    "banco_desativado", "prefeitura_desativada", "prefeitura_hard_deleted",
    "config_atualizada", "id_emitido",
  ]);
  if (acoesAgregadas.has(e.acao)) return false;
  return true;
}
function matriculaAplicavel(e: AdminAuditEntry): boolean {
  // Mesma regra do CPF — matricula so faz sentido quando o evento e sobre um
  // servidor especifico. login_falhou por email nao tem matricula tambem.
  return cpfAplicavel(e);
}
function idUnicoAplicavel(e: AdminAuditEntry): boolean {
  // ID Unico so aparece em eventos da categoria id_unico ou pre_reserva
  // cancelada (que carrega o ID da reserva). No resto — nao aplicavel.
  if (e.categoria === "id_unico") return true;
  if (e.acao === "pre_reserva_cancelada") return true;
  return false;
}
function renderCampo(valor: string | undefined, aplicavel: boolean) {
  if (valor) return valor;
  if (!aplicavel) return <span style={{ color: "var(--text-dim)", fontStyle: "italic" }}>n/a</span>;
  return "—";
}

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
    { key: "cpf", header: "CPF", render: (e) => renderCampo(e.cpf, cpfAplicavel(e)) },
    { key: "matricula", header: "Matrícula", render: (e) => renderCampo(e.matricula, matriculaAplicavel(e)) },
    { key: "idUnico", header: "ID único", mono: true, render: (e) => renderCampo(e.idUnico, idUnicoAplicavel(e)) },
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
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 780 }}>
          Trilha de auditoria append-only: pré-reservas, aceites de termo, alterações de dados pessoais, movimentações de margem, tombamento, config de convênio, ID único e acessos ao painel.
          Cada registro guarda timestamp, IP/device quando aplicável, CPF mascarado, ID da proposta e termo aceito. Campos marcados como <em style={{ color: "var(--text-dim)" }}>n/a</em> não se aplicam ao tipo do evento (ex.: um login por e-mail não carrega CPF).
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
