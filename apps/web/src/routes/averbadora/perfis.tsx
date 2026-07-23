import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, FormActions, FormGrid, IconButton, Pill, SelectField, TextField, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { AdminAverbadoraUser, AverbadoraPerfil, AverbadoraPerfilPreset } from "@atlas/sdk";
import { PRESETS, RESOURCE_GROUPS, TODAS_PERMISSOES, detectarPreset } from "../../lib/averbadora-perms";

type PerfilOpcao = { value: AverbadoraPerfil; label: string; descricao: string; permissoes: string[] };

export function AdminPerfis() {
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ["admin", "perfis"], queryFn: () => atlas.admin.listPerfisAdmin() });
  const [editing, setEditing] = useState<AdminAverbadoraUser | "new" | null>(null);
  const [twofa, setTwofa] = useState<{ user: AdminAverbadoraUser; secret: string; otpauthUrl: string } | null>(null);

  const remove = useMutation({
    mutationFn: (id: number) => atlas.admin.deletePerfilAdmin(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "perfis"] }),
  });
  const reactivate = useMutation({
    mutationFn: (id: number) => atlas.admin.reativarPerfilAdmin(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "perfis"] }),
  });
  const rotate = useMutation({
    mutationFn: (u: AdminAverbadoraUser) =>
      atlas.admin.rotate2FA(u.id).then((r) => ({ user: u, ...r })),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["admin", "perfis"] });
      setTwofa(r);
    },
  });
  const disable = useMutation({
    mutationFn: (id: number) => atlas.admin.disable2FA(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "perfis"] }),
  });

  const columns: Column<AdminAverbadoraUser>[] = [
    {
      key: "status",
      header: "Status",
      render: (u) => <Pill variant={u.ativo ? "averbado" : "expirado"}>{u.ativo ? "ativo" : "inativo"}</Pill>,
    },
    { key: "nome", header: "Nome" },
    { key: "email", header: "Email" },
    {
      key: "perfil", header: "Perfil",
      render: (u) => <Pill variant="emdia">{u.perfil}</Pill>,
    },
    {
      key: "permissoes", header: "Permissoes",
      render: (u) => (
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {u.permissoes?.includes("*") ? "todas (*)" : `${u.permissoes?.length ?? 0} marcadas`}
        </span>
      ),
    },
    { key: "twoFactorEnabled", header: "2FA", render: (u) => u.twoFactorEnabled ? <Pill variant="averbado">on</Pill> : <Pill variant="expirado">off</Pill> },
    { key: "ultimoLogin", header: "Último login", render: (u) => u.ultimoLogin ? new Date(u.ultimoLogin).toLocaleString("pt-BR") : "—" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Averbadora
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Usuários e permissões</h1>
          <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 780 }}>
            Cada usuário tem um conjunto próprio de permissões (caixas marcadas). Presets são apenas atalhos —
            depois de escolher um, você pode marcar/desmarcar caixa por caixa e o usuário vira "personalizado".
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>+ Novo usuário</Button>
      </header>

      <DataTable
        columns={columns}
        rows={data.data?.usuarios ?? []}
        rowKey={(u) => String(u.id)}
        loading={data.isLoading}
        actions={(u) => (
          <>
            <IconButton title="Editar" onClick={() => setEditing(u)}>✎</IconButton>
            {u.twoFactorEnabled ? (
              <IconButton title="Desativar 2FA" onClick={() => { if (confirm(`Desativar 2FA de ${u.email}?`)) disable.mutate(u.id); }}>🔓</IconButton>
            ) : (
              <IconButton title="Ativar/rotacionar 2FA" onClick={() => rotate.mutate(u)}>🔐</IconButton>
            )}
            {u.ativo ? (
              <IconButton
                title="Desativar usuário"
                danger
                onClick={() => { if (confirm(`Desativar ${u.email}?\n\nO usuário para de acessar, mas nada é apagado — você pode reativar depois.`)) remove.mutate(u.id); }}
              >
                ⏸
              </IconButton>
            ) : (
              <IconButton title="Reativar usuário" onClick={() => reactivate.mutate(u.id)}>▶</IconButton>
            )}
          </>
        )}
      />

      {editing ? (
        <UserModal
          initial={editing === "new" ? null : editing}
          perfis={data.data?.perfis ?? []}
          presetsCustom={data.data?.presets ?? []}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {twofa ? <TwoFactorModal data={twofa} onClose={() => setTwofa(null)} /> : null}
    </div>
  );
}

function UserModal({
  initial, perfis, presetsCustom, onClose,
}: {
  initial: AdminAverbadoraUser | null;
  perfis: PerfilOpcao[];
  presetsCustom: AverbadoraPerfilPreset[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [ativo, setAtivo] = useState(initial?.ativo ?? true);
  const [password, setPassword] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(initial?.twoFactorEnabled ?? false);

  // Fonte da verdade: o array `permissoes`. O preset e apenas um atalho de preenchimento.
  const [permissoes, setPermissoes] = useState<string[]>(() => {
    if (initial?.permissoes && initial.permissoes.length > 0) return [...initial.permissoes];
    return [...PRESETS.operador]; // default pra novo usuario
  });
  const supervisor = permissoes.includes("*");
  const perfilDetectado = useMemo(() => detectarPreset(permissoes), [permissoes]);
  const [presetEscolhido, setPresetEscolhido] = useState<string>(perfilDetectado);
  // Nome do preset customizado — obrigatorio quando a config e' "personalizado"
  // e esta CRIANDO um usuario (nao editando). Salva a config como preset reusavel.
  const [presetNome, setPresetNome] = useState("");
  // Etapa 2: ao clicar Criar/Salvar com config personalizada, abre a tela de
  // nomear o preset ANTES de salvar. Alinhado ao padrao da prefeitura (colega).
  const [etapaNomePreset, setEtapaNomePreset] = useState(false);
  // Exige nomear o preset so ao CRIAR com config personalizada.
  const exigePresetNome = !initial && perfilDetectado === "personalizado";
  // Preset SALVO ativo -> permissoes TRAVADAS (nao pode marcar/desmarcar). Pra
  // editar, escolhe um preset normal no dropdown "Presets". Padrao prefeitura.
  const presetSalvoAtivo = presetsCustom.some((p) => p.key === presetEscolhido);

  const [error, setError] = useState<string | null>(null);

  function aplicarPreset(v: string) {
    setPresetEscolhido(v);
    const custom = presetsCustom.find((p) => p.key === v);
    if (custom) { setPermissoes([...custom.permissoes]); return; }
    setPermissoes([...(PRESETS[v as AverbadoraPerfil] ?? [])]);
  }
  function togglePermissao(key: string) {
    if (supervisor) {
      // Se e supervisor (*), desmarcar uma caixa vira personalizado com "tudo menos essa".
      setPermissoes(TODAS_PERMISSOES.filter((k) => k !== key));
      return;
    }
    setPermissoes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }
  function marcarTodas() { setPermissoes(["*"]); }
  function desmarcarTodas() { setPermissoes([]); }

  const save = useMutation({
    mutationFn: () => atlas.admin.upsertPerfilAdmin({
      id: initial?.id,
      nome,
      email,
      perfil: perfilDetectado,
      permissoes,
      ativo,
      password: password || undefined,
      twoFactorEnabled,
      // So manda o nome do preset quando for criar com config personalizada —
      // ai o backend salva a config como preset reutilizavel.
      presetNome: exigePresetNome ? presetNome.trim() : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "perfis"] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Erro ao salvar"),
  });

  const totalMarcadas = supervisor ? TODAS_PERMISSOES.length : permissoes.length;

  // Etapa 2 — tela dedicada de "Nome do preset" (só ao criar personalizado).
  if (etapaNomePreset) {
    return (
      <div onClick={() => setEtapaNomePreset(false)} style={modalBackdrop}>
        <div onClick={(e) => e.stopPropagation()} style={{ ...modalCard, maxWidth: 480 }}>
          <h3 style={{ margin: 0 }}>Nome do preset</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            Você personalizou as permissões (<b>{totalMarcadas}</b> marcada(s)). Dê um nome pra essa
            configuração — ela fica salva como preset e vira opção reutilizável pra outros usuários da averbadora.
          </p>
          <TextField
            label="Nome do preset (obrigatório)"
            value={presetNome}
            onChange={(e) => setPresetNome(e.target.value)}
            placeholder="ex.: Auditor sênior"
            autoFocus
          />
          <div style={{ fontSize: 12, color: presetNome.trim().length < 2 ? "var(--gold-500)" : "var(--text-muted)", marginTop: 6 }}>
            {presetNome.trim().length < 2 ? "Digite um nome (mínimo 2 letras) para poder salvar." : "Pronto — pode salvar."}
          </div>
          {error ? <div style={{ color: "var(--danger-500)", fontSize: 13, marginTop: 8 }}>{error}</div> : null}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
            <Button variant="ghost" onClick={() => setEtapaNomePreset(false)}>Voltar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || presetNome.trim().length < 2}>
              {save.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={modalCard}>
        <h3 style={{ margin: 0 }}>{initial ? `Editar ${initial.email}` : "Novo usuário"}</h3>

        <FormGrid cols={2}>
          <TextField label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <TextField
            label={initial ? "Nova senha (opcional)" : "Senha"}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={initial ? "deixe em branco para manter" : "min. 6 caracteres"}
          />
          <SelectField
            label="Status"
            value={ativo ? "1" : "0"}
            onChange={(e) => setAtivo(e.target.value === "1")}
            options={[{ value: "1", label: "Ativo" }, { value: "0", label: "Inativo" }]}
          />
          <SelectField
            label="2FA"
            value={twoFactorEnabled ? "1" : "0"}
            onChange={(e) => setTwoFactorEnabled(e.target.value === "1")}
            options={[{ value: "0", label: "Desativado" }, { value: "1", label: "Ativado (gera secret)" }]}
          />
        </FormGrid>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Permissões</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Marque o que este usuário pode ver e fazer.
                {" "}
                Perfil atual: <b>{perfilDetectado}</b> · <b>{totalMarcadas}</b> {supervisor ? "(todas via *)" : "marcada(s)"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
              {/* Lado 1 — presets nativos (built-in). */}
              <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 10, letterSpacing: "0.06em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>Presets</span>
                <select
                  value={perfis.some((p) => p.value === presetEscolhido) ? presetEscolhido : ""}
                  onChange={(e) => { if (e.target.value) aplicarPreset(e.target.value); }}
                  style={{
                    minWidth: 130, padding: "8px 10px", borderRadius: 8,
                    background: "var(--bg-elev-2)", color: "var(--text)",
                    border: "1px solid var(--border-strong)", fontSize: 13,
                  }}
                >
                  <option value="" disabled>— escolher —</option>
                  {perfis.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </label>

              {/* Lado 2 — presets salvos (customizados). */}
              <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 10, letterSpacing: "0.06em", fontWeight: 700, color: "var(--gold-500)", textTransform: "uppercase" }}>Presets salvos</span>
                <select
                  value={presetsCustom.some((p) => p.key === presetEscolhido) ? presetEscolhido : ""}
                  onChange={(e) => { if (e.target.value) aplicarPreset(e.target.value); }}
                  disabled={presetsCustom.length === 0}
                  style={{
                    minWidth: 140, padding: "8px 10px", borderRadius: 8,
                    background: "var(--bg-elev-2)", color: "var(--text)",
                    border: "1px solid var(--border-strong)", fontSize: 13,
                  }}
                >
                  <option value="" disabled>{presetsCustom.length === 0 ? "nenhum ainda" : "— escolher —"}</option>
                  {presetsCustom.map((p) => (
                    <option key={p.key} value={p.key}>{p.nome}</option>
                  ))}
                </select>
              </label>

              <div style={{ display: "flex", gap: 6, alignSelf: "flex-end" }}>
                <Button size="sm" variant="ghost" type="button" disabled={presetSalvoAtivo} onClick={marcarTodas}>Marcar tudo</Button>
                <Button size="sm" variant="ghost" type="button" disabled={presetSalvoAtivo} onClick={desmarcarTodas}>Limpar</Button>
              </div>
            </div>
          </div>



          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12, maxHeight: 380, overflowY: "auto",
            padding: 12, background: "var(--bg-elev)", borderRadius: 10,
            opacity: presetSalvoAtivo ? 0.6 : 1,
          }}>
            {RESOURCE_GROUPS.map((g) => (
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
                        padding: "6px 8px", borderRadius: 6, cursor: presetSalvoAtivo ? "not-allowed" : "pointer",
                        background: marcada ? "color-mix(in srgb, var(--emerald-500) 12%, transparent)" : "transparent",
                        border: marcada ? "1px solid var(--emerald-500)" : "1px solid var(--border)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={marcada}
                        disabled={presetSalvoAtivo}
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

        {error ? <div style={{ color: "var(--danger-500)", fontSize: 13 }}>{error}</div> : null}
        <FormActions>
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button
            type="button"
            disabled={save.isPending || !nome || !email}
            onClick={() => { if (exigePresetNome) { setEtapaNomePreset(true); } else { save.mutate(); } }}
          >
            {save.isPending ? "Salvando..." : initial ? "Salvar" : "Criar"}
          </Button>
        </FormActions>
      </div>
    </div>
  );
}

function TwoFactorModal({
  data, onClose,
}: {
  data: { user: AdminAverbadoraUser; secret: string; otpauthUrl: string };
  onClose: () => void;
}) {
  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalCard, maxWidth: 520 }}>
        <h3 style={{ margin: 0 }}>2FA habilitado — {data.user.email}</h3>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13 }}>
          Entregue o segredo a seguir ao usuário. Ele deve cadastrar no autenticador (Authy, 1Password, Google Authenticator).
          Este segredo <strong>não será mostrado novamente</strong>.
        </p>
        <div style={{ background: "var(--bg-elev)", border: "1px solid var(--gold-500)", borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>Segredo (base32)</div>
          <code style={{ fontSize: 16, wordBreak: "break-all" }}>{data.secret}</code>
          <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>otpauth:// URL</div>
          <code style={{ fontSize: 12, wordBreak: "break-all", color: "var(--text-muted)" }}>{data.otpauthUrl}</code>
        </div>
        <FormActions>
          <Button onClick={onClose}>Entendi, copiei o segredo</Button>
        </FormActions>
      </div>
    </div>
  );
}

const modalBackdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(10,22,40,.6)",
  display: "grid", placeItems: "center", zIndex: 100, backdropFilter: "blur(6px)",
};
const modalCard: React.CSSProperties = {
  background: "var(--bg-elev)", border: "1px solid var(--border-strong)",
  borderRadius: 14, padding: 24, maxWidth: 900, width: "calc(100% - 48px)",
  display: "flex", flexDirection: "column", gap: 16, boxShadow: "var(--shadow-lg)",
  maxHeight: "calc(100vh - 48px)", overflowY: "auto",
};
