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

function formatCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function CopyCpfButton({ usuarioId }: { usuarioId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  async function copy() {
    if (state === "loading") return;
    setState("loading");
    try {
      const { cpf } = await atlas.banco.revealUsuarioCpf(usuarioId);
      await navigator.clipboard.writeText(formatCpf(cpf));
      setState("ok");
    } catch {
      setState("err");
    } finally {
      setTimeout(() => setState("idle"), 1800);
    }
  }
  const title = state === "ok" ? "CPF copiado!" : state === "err" ? "Falha ao copiar" : "Copiar CPF";
  const glyph = state === "ok" ? "✓" : state === "err" ? "!" : state === "loading" ? "…" : "⧉";
  return (
    <IconButton title={title} onClick={copy} danger={state === "err"}>
      {glyph}
    </IconButton>
  );
}

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
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["banco", "usuarios"] });
      qc.invalidateQueries({ queryKey: ["banco", "usuario", id] });
    },
  });
  const reactivate = useMutation({
    mutationFn: (id: string) => atlas.banco.reativarUsuario(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["banco", "usuarios"] });
      qc.invalidateQueries({ queryKey: ["banco", "usuario", id] });
    },
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
        actions={(u) => (
          <>
            <IconButton title="Editar" onClick={() => nav(u.id)}>✎</IconButton>
            <CopyCpfButton usuarioId={u.id} />
            {u.ativo ? (
              <IconButton
                title="Desativar"
                danger
                onClick={() => {
                  if (confirm(`Desativar ${u.nome}?\n\nO usuário para de operar, mas nada é apagado — você pode reativar depois.`)) remove.mutate(u.id);
                }}
              >
                ⏸
              </IconButton>
            ) : (
              <IconButton title="Reativar" onClick={() => reactivate.mutate(u.id)}>▶</IconButton>
            )}
          </>
        )}
      />
    </div>
  );
}
