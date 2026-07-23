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
 *  Retorna false quando o campo NAO faz sentido pra aquele evento (vira "n/a"
 *  na UI, cinza dim); true quando faz sentido mas veio vazio → "—" (sinaliza
 *  bug de instrumentacao). Heuristica corrigida em 22/07/2026:
 *
 *  Antes: lista de acoes/categorias hardcoded — deu falsos negativos com
 *  acoes admin novas (folha_consolidada, adf_aplicada_admin, etc) que caem
 *  em categoria=margem mas nao referenciam servidor. Resultado: "—" onde
 *  devia ser "n/a".
 *
 *  Agora: PRESENCA de cpf/matricula no entry + relacao a um servidor
 *  especifico. Se o entry veio SEM cpf, ele so seria "esperado" quando o
 *  userRole indica que o ator e o proprio servidor OU quando a acao esta na
 *  lista pequena de eventos que sabidamente carregam cpf mesmo do lado
 *  admin (pre_reserva_cancelada). Fora disso, ausencia = n/a. */
function isServidorCentric(e: AdminAuditEntry): boolean {
  if (e.userRole === "servidor") return true;
  const acoesServidorCentric = new Set([
    "pre_reserva_criada", "pre_reserva_cancelada",
    "termo_confirmado_na_proposta",
    "primeiro_acesso_conclusao", "senha_redefinida",
    "servidor_editado", "base_importada_matricula",
    "adf_aprovada_prefeitura", "adf_negada_prefeitura",
  ]);
  return acoesServidorCentric.has(e.acao);
}
function cpfAplicavel(e: AdminAuditEntry): boolean {
  if (e.cpf) return true;
  return isServidorCentric(e);
}
function matriculaAplicavel(e: AdminAuditEntry): boolean {
  if (e.matricula) return true;
  return isServidorCentric(e);
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
    { key: "categoria", header: "Categoria", render: (e) => <Pill variant={VAR_BY_CAT[e.categoria] ?? "emdia"}>{e.categoria}</Pill> },
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
