import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  FormActions,
  FormGrid,
  SelectField,
  TextField,
  TextareaField,
} from "@atlas/ui/web";
import { atlas } from "../../../../lib/sdk";
import type { BancoPerfil, BancoPerfilPreset, BancoUsuarioInput } from "@atlas/sdk";
import {
  BANCO_PRESETS,
  BANCO_PRESET_LABELS,
  BANCO_RESOURCE_GROUPS,
  BANCO_TODAS_PERMISSOES,
  detectarBancoPreset,
  type BancoPerfilLabel,
} from "../../../../lib/banco-perms";

export function BancoUsuariosForm() {
  const params = useParams<{ id?: string }>();
  const isNovo = params.id === "novo" || !params.id;
  const id = isNovo ? undefined : params.id;
  const nav = useNavigate();
  const qc = useQueryClient();

  const existing = useQuery({
    queryKey: ["banco", "usuario", id],
    queryFn: () => atlas.banco.getUsuario(id!),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpfMasked, setCpfMasked] = useState("***.***.***-**");
  const [organizacao, setOrganizacao] = useState("46177 - DELTA GLOBAL SOCIEDADE DE CREDITO DIRETO S A");
  const [ipsRaw, setIpsRaw] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [permissoes, setPermissoes] = useState<string[]>([...BANCO_PRESETS.operador]);
  const [presetNome, setPresetNome] = useState("");
  // Etapa 2: quando clicar Salvar com config personalizada em criacao, abre
  // overlay dedicado pra nomear o preset ANTES de salvar. UX alinhado ao
  // padrao da prefeitura (colega refinou 22/07/2026).
  const [etapaNomePreset, setEtapaNomePreset] = useState(false);

  // Presets customizados do banco (nomeados). Aparecem no dropdown junto com
  // os presets nativos. Carrega uma vez no mount — invalida no onSuccess.
  const presetsQ = useQuery({
    queryKey: ["banco", "perfil-presets"],
    queryFn: () => atlas.banco.perfilPresetsBanco(),
    staleTime: 30_000,
  });
  const presetsCustom: BancoPerfilPreset[] = presetsQ.data?.presets ?? [];

  useEffect(() => {
    if (existing.data) {
      const u = existing.data.usuario;
      setNome(u.nome);
      setEmail(u.email);
      setCpfMasked(u.cpfMasked);
      setOrganizacao(u.organizacao);
      setIpsRaw(u.ipsPermitidos.join("\n"));
      setAtivo(u.ativo);
      setPermissoes(u.permissoes && u.permissoes.length > 0 ? [...u.permissoes] : [...(BANCO_PRESETS[u.perfil as BancoPerfilLabel] ?? [])]);
    }
  }, [existing.data]);

  const supervisor = permissoes.includes("*");
  const perfilDetectado = useMemo<BancoPerfilLabel>(() => detectarBancoPreset(permissoes), [permissoes]);
  const [presetEscolhido, setPresetEscolhido] = useState<string>(perfilDetectado);
  useEffect(() => { setPresetEscolhido(perfilDetectado); }, [perfilDetectado]);
  // Nomear preset e' obrigatorio apenas ao CRIAR (isNovo) com config
  // personalizada (nao bate com nenhum preset nativo nem salvo).
  const exigePresetNome = isNovo && perfilDetectado === "personalizado";
  // Preset SALVO ativo -> permissoes TRAVADAS. Padrao da prefeitura.
  const presetSalvoAtivo = presetsCustom.some((p) => p.key === presetEscolhido);

  function aplicarPreset(v: string) {
    setPresetEscolhido(v);
    const custom = presetsCustom.find((p) => p.key === v);
    if (custom) { setPermissoes([...custom.permissoes]); return; }
    setPermissoes([...(BANCO_PRESETS[v as BancoPerfilLabel] ?? [])]);
  }
  function togglePermissao(key: string) {
    if (supervisor) {
      setPermissoes(BANCO_TODAS_PERMISSOES.filter((k) => k !== key));
      return;
    }
    setPermissoes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  const save = useMutation({
    mutationFn: () => {
      const body: BancoUsuarioInput = {
        id,
        nome,
        email,
        cpfMasked,
        organizacao,
        perfil: perfilDetectado as BancoPerfil,
        permissoes,
        ipsPermitidos: ipsRaw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
        ativo,
        // So manda o nome do preset quando for criar com config personalizada.
        presetNome: exigePresetNome ? presetNome.trim() : undefined,
      };
      return atlas.banco.upsertUsuario(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banco", "usuarios"] });
      qc.invalidateQueries({ queryKey: ["banco", "perfil-presets"] });
      if (id) qc.invalidateQueries({ queryKey: ["banco", "usuario", id] });
      nav("/banco/cadastros/usuarios");
    },
  });

  const totalMarcadas = supervisor ? BANCO_TODAS_PERMISSOES.length : permissoes.length;

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (exigePresetNome) { setEtapaNomePreset(true); } else { save.mutate(); }
      }}
      style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%" }}
    >
      {etapaNomePreset ? (
        <div
          onClick={() => setEtapaNomePreset(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-elev)", border: "1px solid var(--border-strong)",
              borderRadius: 12, padding: 24, width: "min(480px, 92vw)",
              display: "flex", flexDirection: "column", gap: 12,
            }}
          >
            <h3 style={{ margin: 0 }}>Nome do preset</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
              Você personalizou as permissões (<b>{totalMarcadas}</b> marcada(s)). Dê um nome pra essa
              configuração — fica salva como preset e vira opção reutilizável pra outros usuários do banco.
            </p>
            <TextField
              label="Nome do preset"
              value={presetNome}
              onChange={(e) => setPresetNome(e.target.value)}
              placeholder="ex.: Analista de crédito"
              autoFocus
            />
            {save.error ? (
              <div style={{ color: "var(--danger-500)", fontSize: 13 }}>
                {save.error instanceof Error ? save.error.message : "Erro ao salvar"}
              </div>
            ) : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <Button variant="ghost" type="button" onClick={() => setEtapaNomePreset(false)}>Voltar</Button>
              <Button type="button" onClick={() => save.mutate()} disabled={save.isPending || presetNome.trim().length < 2}>
                {save.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Cadastros • Usuários
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>{id ? `Editar ${id}` : "Novo operador"}</h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 780, fontSize: 13 }}>
          Escolha um preset como ponto de partida ou marque/desmarque caixa a caixa para customizar o que este usuário pode ver e fazer.
        </p>
      </header>

      <section
        style={{
          background: "var(--bg-elev)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <FormGrid cols={2}>
          <TextField label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          <TextField label="Login (email/identificador)" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <TextField label="CPF (mascarado)" value={cpfMasked} onChange={(e) => setCpfMasked(e.target.value)} />
          <TextField label="Organização" value={organizacao} onChange={(e) => setOrganizacao(e.target.value)} />
          <SelectField
            label="Situação"
            value={ativo ? "1" : "0"}
            onChange={(e) => setAtivo(e.target.value === "1")}
            options={[
              { value: "1", label: "Ativo" },
              { value: "0", label: "Inativo" },
            ]}
          />
        </FormGrid>
        <TextareaField
          label="IPs permitidos (allowlist)"
          value={ipsRaw}
          onChange={(e) => setIpsRaw(e.target.value)}
          placeholder="Ex: 189.45.10.0/24, 200.150.20.42"
          hint="Um por linha ou separados por vírgula. Vazio = qualquer IP."
        />
      </section>

      <section
        style={{
          background: "var(--bg-elev)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Permissões</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Perfil atual: <b>{perfilDetectado}</b> · <b>{totalMarcadas}</b> {supervisor ? "(todas via *)" : "marcada(s)"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            {/* Lado 1 — presets nativos (built-in). */}
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 10, letterSpacing: "0.06em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>Presets</span>
              <select
                value={BANCO_PRESET_LABELS.some((p) => p.value === presetEscolhido) ? presetEscolhido : ""}
                onChange={(e) => { if (e.target.value) aplicarPreset(e.target.value); }}
                style={{
                  minWidth: 130, padding: "8px 10px", borderRadius: 8,
                  background: "var(--bg-elev-2)", color: "var(--text)",
                  border: "1px solid var(--border-strong)", fontSize: 13,
                }}
              >
                <option value="" disabled>— escolher —</option>
                {BANCO_PRESET_LABELS.map((p) => (
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
              <Button size="sm" variant="ghost" type="button" disabled={presetSalvoAtivo} onClick={() => setPermissoes(["*"])}>Marcar tudo</Button>
              <Button size="sm" variant="ghost" type="button" disabled={presetSalvoAtivo} onClick={() => setPermissoes([])}>Limpar</Button>
            </div>
          </div>
        </div>


        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12, maxHeight: 420, overflowY: "auto",
          padding: 12, background: "var(--bg-elev-2)", borderRadius: 10,
          opacity: presetSalvoAtivo ? 0.6 : 1,
        }}>
          {BANCO_RESOURCE_GROUPS.map((g) => (
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
      </section>

      {save.error ? (
        <div style={{ color: "var(--danger-500)", fontSize: 13 }}>
          {save.error instanceof Error ? save.error.message : "Erro ao salvar"}
        </div>
      ) : null}

      <FormActions>
        <Button variant="ghost" type="button" onClick={() => nav("/banco/cadastros/usuarios")}>Cancelar</Button>
        <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
      </FormActions>
    </form>
  );
}
