import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  DataTable,
  FilterBar,
  FormActions,
  IconButton,
  Pill,
  SelectField,
  TextField,
  type Column,
} from "@atlas/ui/web";
import { atlas } from "../../../../lib/sdk";
import type { BancoPerfil, BancoUsuario } from "@atlas/sdk";
import {
  BANCO_RESOURCE_GROUPS,
  BANCO_TODAS_PERMISSOES,
} from "../../../../lib/banco-perms";

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
  { value: "personalizado", label: "Personalizado" },
];

export function BancoUsuariosLista() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [perfil, setPerfil] = useState<BancoPerfil | "">("");
  const [search, setSearch] = useState("");
  const [somenteAdmin, setSomenteAdmin] = useState(false);
  const [novoPreset, setNovoPreset] = useState(false);

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
    {
      key: "permissoes", header: "Permissões",
      render: (u) => (
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {u.permissoes?.includes("*") ? "todas (*)" : `${u.permissoes?.length ?? 0} marcadas`}
        </span>
      ),
    },
    { key: "organizacao", header: "Organização" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Cadastros
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Operadores</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-muted)", maxWidth: 640 }}>
            Sub-usuários do time do banco que acessam este painel (analistas, gerentes, atendentes).
            Servidores/clientes que têm contrato com este banco aparecem em <b>Meus Contratos</b> e <b>Bate de Carteira</b>.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={() => setNovoPreset(true)}>+ Novo preset</Button>
          <Button onClick={() => nav("novo")}>+ Inserir</Button>
        </div>
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

      {novoPreset ? <NovoPresetModal onClose={() => setNovoPreset(false)} /> : null}
    </div>
  );
}

/** Modal dedicado pra criar preset novo (nome + permissoes). Standalone —
 *  nao passa pelo fluxo de criacao de usuario. O preset criado aqui aparece
 *  no dropdown "Preset" ao criar/editar qualquer usuario do banco. */
function NovoPresetModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [permissoes, setPermissoes] = useState<string[]>([]);
  const supervisor = permissoes.includes("*");

  function togglePermissao(key: string) {
    if (supervisor) { setPermissoes(BANCO_TODAS_PERMISSOES.filter((k) => k !== key)); return; }
    setPermissoes((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  }
  const save = useMutation({
    mutationFn: () => atlas.banco.criarPerfilPresetBanco({ nome: nome.trim(), permissoes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banco", "perfil-presets"] });
      qc.invalidateQueries({ queryKey: ["banco", "usuarios"] });
      onClose();
    },
  });
  const totalMarcadas = supervisor ? BANCO_TODAS_PERMISSOES.length : permissoes.length;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: 24, width: "min(720px, 94vw)", maxHeight: "88vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}
      >
        <h3 style={{ margin: 0 }}>Novo preset</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
          Presets são atalhos de permissão. Nomeie a configuração aqui — depois de salva, ela aparece no dropdown "Preset" ao criar/editar qualquer usuário do banco.
        </p>

        <TextField
          label="Nome do preset"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="ex.: Analista de crédito"
          required
          autoFocus
        />

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Permissões</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                <b>{totalMarcadas}</b> {supervisor ? "(todas via *)" : "marcada(s)"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="sm" variant="ghost" type="button" onClick={() => setPermissoes(["*"])}>Marcar tudo</Button>
              <Button size="sm" variant="ghost" type="button" onClick={() => setPermissoes([])}>Limpar</Button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, padding: 10, background: "var(--bg-elev-2)", borderRadius: 8 }}>
            {BANCO_RESOURCE_GROUPS.map((g) => (
              <div key={g.titulo} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 11, letterSpacing: "0.08em", fontWeight: 700, color: "var(--gold-500)", textTransform: "uppercase", marginBottom: 4 }}>
                  {g.titulo}
                </div>
                {g.recursos.map((r) => {
                  const marcada = supervisor || permissoes.includes(r.key);
                  return (
                    <label key={r.key} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 8px", borderRadius: 6, cursor: "pointer", background: marcada ? "color-mix(in srgb, var(--emerald-500) 12%, transparent)" : "transparent", border: marcada ? "1px solid var(--emerald-500)" : "1px solid var(--border)" }}>
                      <input type="checkbox" checked={marcada} onChange={() => togglePermissao(r.key)} style={{ marginTop: 3 }} />
                      <span style={{ flex: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{r.label}</span>
                        {r.descricao ? <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)" }}>{r.descricao}</span> : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {save.error ? (
          <div style={{ color: "var(--danger-500)", fontSize: 13 }}>
            {save.error instanceof Error ? save.error.message : "Erro ao salvar preset"}
          </div>
        ) : null}

        <FormActions>
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={() => save.mutate()} disabled={save.isPending || nome.trim().length < 2 || (permissoes.length === 0 && !supervisor)}>
            {save.isPending ? "Salvando..." : "Salvar preset"}
          </Button>
        </FormActions>
      </div>
    </div>
  );
}
