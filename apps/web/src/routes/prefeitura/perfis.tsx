import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { PrefeituraPerfil } from "@atlas/sdk";
import { PageHeader, Modal, Field, inp, selStyle } from "./_ui";
import {
  PREFEITURA_PRESETS,
  PREFEITURA_PRESET_LABELS,
  PREFEITURA_RESOURCE_GROUPS,
  PREFEITURA_TODAS_PERMISSOES,
  detectarPrefeituraPreset,
  type PrefeituraAreaLabel,
} from "../../lib/prefeitura-perms";

const AREA_LABEL: Record<string, string> = {
  rh: "Recursos Humanos",
  financeiro: "Financeiro",
  gestor: "Gestor",
  personalizado: "Personalizado",
};

export function PrefeituraPerfis() {
  const qc = useQueryClient();
  const [modalPerfil, setModalPerfil] = useState<PrefeituraPerfil | "new" | null>(null);
  const [secret, setSecret] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const q = useQuery({ queryKey: ["prefeitura", "perfis"], queryFn: () => atlas.prefeitura.perfis() });

  const del = useMutation({ mutationFn: (id: number) => atlas.prefeitura.excluirPerfil(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["prefeitura", "perfis"] }) });
  const reactivate = useMutation({ mutationFn: (id: number) => atlas.prefeitura.reativarPerfil(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["prefeitura", "perfis"] }) });
  const rotate = useMutation({ mutationFn: (id: number) => atlas.prefeitura.rotate2fa(id), onSuccess: (d) => { setSecret(d); qc.invalidateQueries({ queryKey: ["prefeitura", "perfis"] }); } });
  const disable = useMutation({ mutationFn: (id: number) => atlas.prefeitura.disable2fa(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["prefeitura", "perfis"] }) });

  const columns: Column<PrefeituraPerfil>[] = [
    { key: "nome", header: "Nome" },
    { key: "email", header: "E-mail", mono: true },
    { key: "area", header: "Perfil", render: (p) => <Pill variant="aceita">{AREA_LABEL[p.area] ?? p.area}</Pill> },
    {
      key: "permissoes", header: "Permissões",
      render: (p) => (
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {p.permissoes?.includes("*") ? "todas (*)" : `${p.permissoes?.length ?? 0} marcadas`}
        </span>
      ),
    },
    { key: "ativo", header: "Ativo", render: (p) => <Pill variant={p.ativo ? "emdia" : "expirado"}>{p.ativo ? "sim" : "não"}</Pill> },
    { key: "twofa", header: "2FA", render: (p) => <Pill variant={p.twofaEnabled ? "averbado" : "pendente"}>{p.twofaEnabled ? "ativo" : "off"}</Pill> },
    {
      key: "acoes",
      header: "",
      align: "right",
      render: (p) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Button size="sm" variant="ghost" onClick={() => setModalPerfil(p)}>✎ Editar</Button>
          <Button size="sm" variant="ghost" onClick={() => rotate.mutate(p.id)}>
            {p.twofaEnabled ? "↻ 2FA" : "🔐 2FA"}
          </Button>
          {p.twofaEnabled ? (
            <Button size="sm" variant="ghost" onClick={() => disable.mutate(p.id)}>Desativar 2FA</Button>
          ) : null}
          {p.ativo ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { if (confirm(`Desativar ${p.nome}?\n\nO usuário para de acessar, mas nada é apagado — você pode reativar depois.`)) del.mutate(p.id); }}
              style={{ color: "var(--danger-500)", borderColor: "var(--danger-500)" }}
            >
              ⏸ Desativar
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => reactivate.mutate(p.id)}>▶ Reativar</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader
        title="Usuários e acessos"
        subtitle="Cada usuário tem suas próprias permissões (caixas marcadas). Presets são atalhos de partida — depois marque/desmarque caixa a caixa. Login: CPF/e-mail + senha + 2FA opcional."
        actions={<Button onClick={() => setModalPerfil("new")}>+ Novo usuário</Button>}
      />

      <DataTable columns={columns} rows={q.data?.perfis ?? []} rowKey={(p) => String(p.id)} loading={q.isLoading} emptyState="Nenhum usuário." />

      {modalPerfil ? (
        <PerfilModal
          initial={modalPerfil === "new" ? null : modalPerfil}
          onClose={() => setModalPerfil(null)}
          onSaved={() => { setModalPerfil(null); qc.invalidateQueries({ queryKey: ["prefeitura", "perfis"] }); }}
        />
      ) : null}
      {secret ? (
        <Modal title="2FA (TOTP) provisionado" onClose={() => setSecret(null)}>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Cadastre este segredo no app autenticador (Google Authenticator, Authy). Exibido só agora.</p>
          <pre style={{ padding: 12, background: "var(--bg-elev-2)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 14, userSelect: "all" }}>{secret.secret}</pre>
          <p style={{ fontSize: 11, color: "var(--text-muted)", wordBreak: "break-all" }}>{secret.otpauthUrl}</p>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><Button variant="ghost" onClick={() => setSecret(null)}>Fechar</Button></div>
        </Modal>
      ) : null}
    </div>
  );
}

function PerfilModal({
  initial, onClose, onSaved,
}: {
  initial: PrefeituraPerfil | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [ativo, setAtivo] = useState(initial?.ativo ?? true);
  const [permissoes, setPermissoes] = useState<string[]>(() => {
    if (initial?.permissoes && initial.permissoes.length > 0) return [...initial.permissoes];
    return [...PREFEITURA_PRESETS.rh];
  });
  const supervisor = permissoes.includes("*");
  const areaDetectada = useMemo<PrefeituraAreaLabel>(() => detectarPrefeituraPreset(permissoes), [permissoes]);
  const [presetEscolhido, setPresetEscolhido] = useState<PrefeituraAreaLabel>(areaDetectada);
  useEffect(() => { setPresetEscolhido(areaDetectada); }, [areaDetectada]);

  function aplicarPreset(v: PrefeituraAreaLabel) {
    setPresetEscolhido(v);
    setPermissoes([...(PREFEITURA_PRESETS[v] ?? [])]);
  }
  function togglePermissao(key: string) {
    if (supervisor) {
      setPermissoes(PREFEITURA_TODAS_PERMISSOES.filter((k) => k !== key));
      return;
    }
    setPermissoes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  const save = useMutation({
    mutationFn: () => atlas.prefeitura.salvarPerfil({
      id: initial?.id,
      nome, email,
      area: areaDetectada,
      permissoes,
      ativo,
    }),
    onSuccess: onSaved,
  });

  const totalMarcadas = supervisor ? PREFEITURA_TODAS_PERMISSOES.length : permissoes.length;

  return (
    <Modal title={initial ? `Editar ${initial.nome}` : "Novo usuário da prefeitura"} onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <Field lbl="Nome"><input style={inp} value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
        <Field lbl="E-mail"><input style={inp} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field lbl="Ativo">
          <select style={selStyle} value={ativo ? "1" : "0"} onChange={(e) => setAtivo(e.target.value === "1")}>
            <option value="1">Sim</option>
            <option value="0">Não</option>
          </select>
        </Field>
      </div>

      <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Permissões</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Perfil atual: <b>{areaDetectada}</b> · <b>{totalMarcadas}</b> {supervisor ? "(todas via *)" : "marcada(s)"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <select
              style={{ ...selStyle, minWidth: 140 }}
              value={presetEscolhido}
              onChange={(e) => aplicarPreset(e.target.value as PrefeituraAreaLabel)}
            >
              {PREFEITURA_PRESET_LABELS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <Button size="sm" variant="ghost" type="button" onClick={() => setPermissoes(["*"])}>Marcar tudo</Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => setPermissoes([])}>Limpar</Button>
          </div>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 10, maxHeight: 340, overflowY: "auto",
          padding: 12, background: "var(--bg-elev-2)", borderRadius: 10,
        }}>
          {PREFEITURA_RESOURCE_GROUPS.map((g) => (
            <div key={g.titulo} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", fontWeight: 700, color: "var(--gold-500)", textTransform: "uppercase", marginBottom: 4 }}>
                {g.titulo}
              </div>
              {g.recursos.map((r) => {
                const marcada = supervisor || permissoes.includes(r.key);
                return (
                  <label
                    key={r.key}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 8,
                      padding: "6px 8px", borderRadius: 6, cursor: "pointer",
                      background: marcada ? "color-mix(in srgb, var(--emerald-500) 12%, transparent)" : "transparent",
                      border: marcada ? "1px solid var(--emerald-500)" : "1px solid var(--border)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={marcada}
                      onChange={() => togglePermissao(r.key)}
                      style={{ marginTop: 3 }}
                    />
                    <span style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{r.label}</span>
                      {r.descricao ? (
                        <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)" }}>{r.descricao}</span>
                      ) : null}
                      <code style={{ fontSize: 10, color: "var(--text-dim)" }}>{r.key}</code>
                    </span>
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !nome || !email}>
          {save.isPending ? "Salvando…" : initial ? "Salvar" : "Criar"}
        </Button>
      </div>
      {save.isError ? <p style={{ color: "var(--danger-500)", marginTop: 12, fontSize: 13 }}>{(save.error as Error).message}</p> : null}
    </Modal>
  );
}
