import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  DataTable,
  FilterBar,
  IconButton,
  Pill,
  SelectField,
  type Column,
} from "@atlas/ui/web";
import { atlas } from "../../../../lib/sdk";
import type { BancoPerfil, BancoUsuario } from "@atlas/sdk";

const PERFIS: { value: BancoPerfil | ""; label: string }[] = [
  { value: "", label: "Todos os perfis" },
  { value: "admin", label: "Admin" },
  { value: "operador", label: "Operador" },
  { value: "consulta", label: "Consulta" },
  { value: "relatorios", label: "Relatórios" },
];

export function BancoUsuariosLista() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [perfil, setPerfil] = useState<BancoPerfil | "">("");
  const [search, setSearch] = useState("");
  const [somenteAdmin, setSomenteAdmin] = useState(false);

  const data = useQuery({
    queryKey: ["banco", "usuarios", perfil, somenteAdmin],
    queryFn: () => atlas.banco.listUsuarios({ perfil: perfil || undefined, somenteAdmin }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => atlas.banco.removerUsuario(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["banco", "usuarios"] }),
  });

  const filtered = (data.data?.usuarios ?? []).filter((u) =>
    search ? `${u.nome} ${u.email}`.toLowerCase().includes(search.toLowerCase()) : true,
  );

  const columns: Column<BancoUsuario>[] = [
    { key: "ativo", header: "Situação", render: (u) => <Pill variant={u.ativo ? "averbado" : "expirado"}>{u.ativo ? "Ativo" : "Inativo"}</Pill> },
    { key: "codigo", header: "Código", mono: true },
    { key: "nome", header: "Nome" },
    { key: "email", header: "Login" },
    { key: "cpfMasked", header: "CPF", mono: true },
    { key: "perfil", header: "Perfil" },
    { key: "organizacao", header: "Organização" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Cadastros
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Usuários do banco</h1>
        </div>
        <Button onClick={() => nav("novo")}>+ Inserir</Button>
      </header>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        onReset={() => {
          setSearch("");
          setPerfil("");
          setSomenteAdmin(false);
        }}
      >
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ minWidth: 220 }}>
            <SelectField label="Perfil" value={perfil} onChange={(e) => setPerfil(e.target.value as BancoPerfil | "")} options={PERFIS.map((p) => ({ value: p.value, label: p.label }))} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
            <input type="checkbox" checked={somenteAdmin} onChange={(e) => setSomenteAdmin(e.target.checked)} />
            Listar apenas administradores
          </label>
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(u) => u.id}
        loading={data.isLoading}
        onRowClick={(u) => nav(u.id)}
        actions={(u) => (
          <>
            <IconButton title="Editar" onClick={() => nav(u.id)}>✎</IconButton>
            <IconButton
              title="Remover"
              danger
              onClick={() => {
                if (confirm(`Remover ${u.nome}?`)) remove.mutate(u.id);
              }}
            >
              🗑
            </IconButton>
          </>
        )}
      />
    </div>
  );
}
