import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, FilterBar, IconButton, Pill, SelectField, type Column } from "@atlas/ui/web";
import { atlas } from "../../../lib/sdk";
import { downloadCsv } from "../../../lib/csv";
import type { AdminServidor, ServidorCampoConfig } from "@atlas/sdk";
import { EditModal } from "./_editModal";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const fmtCpf = (cpf: string) => {
  const d = (cpf ?? "").replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : (cpf || "—");
};

/** Fallback usado enquanto o endpoint /campos-config nao esta deployado ou falha.
 *  Mesma lista de campos built-in que o backend usa como default. */
const DEFAULT_CAMPOS_FALLBACK: ServidorCampoConfig[] = [
  { key: "nome", label: "Nome", tipo: "texto", visivel: true, obrigatorio: true, ordem: 0, sistema: true, travado: true },
  { key: "matricula", label: "Matrícula", tipo: "texto", visivel: true, obrigatorio: true, ordem: 1, sistema: true, travado: true },
  { key: "cpf", label: "CPF", tipo: "texto", visivel: true, obrigatorio: true, ordem: 2, sistema: true, travado: true },
  { key: "cargo", label: "Cargo", tipo: "texto", visivel: true, obrigatorio: false, ordem: 3, sistema: true },
  { key: "origem", label: "Origem", tipo: "texto", visivel: true, obrigatorio: false, ordem: 4, sistema: true },
  { key: "vinculo", label: "Vínculo", tipo: "texto", visivel: true, obrigatorio: false, ordem: 5, sistema: true },
  { key: "situacaoFuncional", label: "Situação funcional", tipo: "texto", visivel: true, obrigatorio: false, ordem: 6, sistema: true },
  { key: "salarioLiquido", label: "Salário líq.", tipo: "moeda", visivel: true, obrigatorio: false, ordem: 7, sistema: true },
  { key: "idConvenio", label: "Convênio", tipo: "texto", visivel: true, obrigatorio: false, ordem: 8, sistema: true },
  { key: "email", label: "E-mail", tipo: "email", visivel: true, obrigatorio: true, ordem: 9, sistema: true, travado: true },
  { key: "telefone", label: "Telefone", tipo: "telefone", visivel: true, obrigatorio: false, ordem: 10, sistema: true },
  { key: "status", label: "Status", tipo: "texto", visivel: true, obrigatorio: false, ordem: 11, sistema: true },
];

/** Extrai o valor de um servidor pra qualquer key (built-in ou custom). */
function getValor(s: AdminServidor, key: string): string | number | null | undefined {
  if (key === "cpf") return s.cpf;
  if (key.startsWith("custom_")) return s.camposCustom?.[key];
  return (s as unknown as Record<string, string | number | null | undefined>)[key];
}

/** Converte um campo da config em Column<AdminServidor> com render por tipo. */
function campoParaColuna(campo: ServidorCampoConfig, onEdit: (s: AdminServidor) => void): Column<AdminServidor> {
  if (campo.key === "acoes") {
    return { key: "acoes", header: "", render: (s) => <IconButton title="Editar" onClick={() => onEdit(s)}>✎</IconButton> };
  }
  const base: Column<AdminServidor> = {
    key: campo.key,
    header: campo.label,
    wrap: campo.tipo === "texto" && !["matricula", "cpf"].includes(campo.key),
    mono: campo.tipo === "texto" ? ["matricula", "cpf", "idConvenio", "codigoIbge"].includes(campo.key) : false,
  };
  base.render = (s) => {
    const v = getValor(s, campo.key);
    if (v == null || v === "") return <span style={{ color: "var(--text-dim)" }}>—</span>;
    if (campo.key === "cpf") return fmtCpf(String(v));
    if (campo.key === "status") {
      const st = String(v) as AdminServidor["status"];
      return <Pill variant={st === "ativo" ? "averbado" : st === "bloqueado" ? "rejeitada" : "expirado"}>{st}</Pill>;
    }
    switch (campo.tipo) {
      case "moeda":
        return typeof v === "number" ? fmtBRL(v) : fmtBRL(Number(v) || 0);
      case "numero":
        return String(v);
      default:
        return String(v);
    }
  };
  if (campo.tipo === "moeda" || campo.tipo === "numero") base.align = "right";
  return base;
}

export function AdminServidoresVisualizar() {
  const qc = useQueryClient();
  const prefeituras = useQuery({ queryKey: ["admin", "prefeituras"], queryFn: () => atlas.admin.listPrefeituras() });
  const [prefId, setPrefId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AdminServidor | null>(null);

  const prefIdNum = Number(prefId);
  const prefSelecionada = (prefeituras.data?.prefeituras ?? []).find((p) => String(p.id) === prefId);

  const configQ = useQuery({
    queryKey: ["admin", "servidor-campos-config", prefIdNum],
    queryFn: () => atlas.admin.getServidorCamposConfig(prefIdNum),
    enabled: !!prefId,
  });

  const dataQ = useQuery({
    queryKey: ["admin", "servidores", prefId],
    queryFn: () => atlas.admin.listServidores({ prefeitura_id: prefIdNum }),
    enabled: !!prefId,
  });

  const filtered = useMemo(
    () => (dataQ.data?.servidores ?? []).filter((s) =>
      search ? `${s.nome} ${s.matricula} ${s.cpf} ${s.cpfMasked} ${s.email}`.toLowerCase().includes(search.toLowerCase()) : true,
    ),
    [dataQ.data?.servidores, search],
  );

  const total = filtered.length;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  useEffect(() => { setPage(1); }, [search, prefId, pageSize]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pageStart = (pageSafe - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  const columns: Column<AdminServidor>[] = useMemo(() => {
    const config = configQ.data?.config;
    // Fallback: se o endpoint de config nao existe ainda (backend nao deployado)
    // ou falhou, monta colunas built-in default equivalentes ao antigo servidores.tsx.
    // Assim a tela nao aparece em branco enquanto a API nao tem os novos endpoints.
    if (!config) {
      return DEFAULT_CAMPOS_FALLBACK
        .map((c) => campoParaColuna(c, setEditing))
        .concat([{ key: "acoes", header: "", render: (s) => <IconButton title="Editar" onClick={() => setEditing(s)}>✎</IconButton> }]);
    }
    const visiveis = config.campos.filter((c) => c.visivel).sort((a, b) => a.ordem - b.ordem);
    const cols = visiveis.map((c) => campoParaColuna(c, setEditing));
    cols.push({ key: "acoes", header: "", render: (s) => <IconButton title="Editar" onClick={() => setEditing(s)}>✎</IconButton> });
    return cols;
  }, [configQ.data?.config]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Averbadora
        </span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Ver servidores</h1>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {prefId ? (dataQ.isLoading ? "Carregando…" : `${total} servidor${total === 1 ? "" : "es"}`) : "Selecione uma prefeitura"}
          </span>
        </div>
      </header>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        onReset={() => { setSearch(""); setPrefId(""); }}
        onExport={total > 0 ? () => downloadCsv(
          `servidores-${prefSelecionada?.nome ?? "todos"}.csv`,
          filtered.map((s) => {
            const row: Record<string, string | number> = {};
            const config = configQ.data?.config;
            const visiveis = config ? config.campos.filter((c) => c.visivel).sort((a, b) => a.ordem - b.ordem) : [];
            for (const c of visiveis) {
              const v = getValor(s, c.key);
              row[c.key] = v == null ? "" : (typeof v === "number" ? v : String(v));
            }
            return row;
          }),
        ) : undefined}
        actions={
          <Link to="/averbadora/servidores/importar" style={{ textDecoration: "none" }}>
            <Button size="sm">↑ Importar servidores</Button>
          </Link>
        }
      >
        <div style={{ maxWidth: 320 }}>
          <SelectField
            label="Prefeitura"
            value={prefId}
            onChange={(e) => setPrefId(e.target.value)}
            options={[{ value: "", label: "— Selecione —" }, ...((prefeituras.data?.prefeituras ?? []).map((p) => ({ value: String(p.id), label: `${p.nome}/${p.uf}` })))]}
          />
        </div>
      </FilterBar>

      {!prefId ? (
        <div style={{ padding: 36, textAlign: "center", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 12 }}>
          Selecione uma prefeitura acima para listar os servidores.
        </div>
      ) : (
        <>
          <DataTable columns={columns} rows={pageRows} rowKey={(s) => String(s.id)} loading={dataQ.isLoading || configQ.isLoading} />

          {total > 0 ? (
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 12, flexWrap: "wrap",
                padding: "10px 14px", background: "var(--bg-elev-1)",
                border: "1px solid var(--border)", borderRadius: 10, fontSize: 13,
              }}
            >
              <div style={{ color: "var(--text-muted)" }}>
                Mostrando <b style={{ color: "var(--text)" }}>{pageStart + 1}</b>–
                <b style={{ color: "var(--text)" }}>{Math.min(pageStart + pageSize, total)}</b>
                {" "}de <b style={{ color: "var(--text)" }}>{total.toLocaleString("pt-BR")}</b>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  Por página:
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    style={{
                      marginLeft: 6, padding: "4px 8px", borderRadius: 6,
                      background: "var(--surface)", color: "var(--text)",
                      border: "1px solid var(--border-strong)", fontSize: 12,
                    }}
                  >
                    {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <Button size="sm" variant="ghost" onClick={() => setPage(1)} disabled={pageSafe <= 1}>«</Button>
                <Button size="sm" variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageSafe <= 1}>‹ Anterior</Button>
                <span style={{ color: "var(--text-muted)", fontSize: 12, minWidth: 90, textAlign: "center" }}>
                  Página <b style={{ color: "var(--text)" }}>{pageSafe}</b> de <b style={{ color: "var(--text)" }}>{totalPages}</b>
                </span>
                <Button size="sm" variant="ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageSafe >= totalPages}>Próxima ›</Button>
                <Button size="sm" variant="ghost" onClick={() => setPage(totalPages)} disabled={pageSafe >= totalPages}>»</Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {editing ? (
        <EditModal
          servidor={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin", "servidores"] }); }}
        />
      ) : null}
    </div>
  );
}
