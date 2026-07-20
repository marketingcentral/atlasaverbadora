import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  FormActions,
  FormGrid,
  Pill,
  SelectField,
  TextField,
  TextareaField,
} from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { Comunicado, ComunicadoPublico } from "@atlas/sdk";

const PUBLICO_LABEL: Record<ComunicadoPublico, string> = {
  banco: "Banco",
  servidor: "Servidor",
  prefeitura: "Prefeitura",
};

export function AdminComunicados({ publico }: { publico?: ComunicadoPublico } = {}) {
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ["admin", "comunicados"], queryFn: () => atlas.admin.listComunicados() });
  const [editing, setEditing] = useState<Comunicado | "new" | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "comunicados"] });

  const remover = useMutation({
    mutationFn: (id: string) => atlas.admin.deleteComunicado(id),
    onSuccess: invalidate,
  });
  // Reordenar por drag-and-drop — envia a lista inteira de ids na nova ordem.
  // A UI atualiza otimisticamente (localOrder) pra o arrastar ficar fluido;
  // se o backend retornar, invalida e o TanStack repuxa a ordem oficial.
  const reordenar = useMutation({
    mutationFn: (ids: string[]) => atlas.admin.reordenarComunicados(ids),
    onSuccess: invalidate,
  });

  // Quando o menu esta em Comunicados > Banco ou > Servidor, filtramos a lista
  // pra so mostrar (e reordenar) o publico correspondente. O backend mantem a
  // ordem absoluta — o payload de reordenar carrega SO os ids visiveis; o
  // handler re-lineariza mantendo os outros publicos no fim.
  const todos = data.data?.comunicados ?? [];
  const comunicados = useMemo(
    () => (publico ? todos.filter((c) => (c.publico ?? "banco") === publico) : todos),
    [todos, publico],
  );

  // Estado local do drag: item sendo arrastado + item sobre o qual esta
  // hovering. localOrder guarda a ordem otimista antes de o backend confirmar.
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  // Sincroniza localOrder quando a lista real muda (fetch, invalidate, filtro).
  useEffect(() => {
    setLocalOrder(comunicados.map((c) => c.id));
  }, [comunicados]);

  const linhas = useMemo(() => {
    if (!localOrder) return comunicados;
    const mapa = new Map(comunicados.map((c) => [c.id, c]));
    return localOrder.map((id) => mapa.get(id)).filter((c): c is Comunicado => !!c);
  }, [localOrder, comunicados]);

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId || !localOrder) return;
    const from = localOrder.indexOf(dragId);
    const to = localOrder.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...localOrder];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    setLocalOrder(next);
    setDragId(null);
    setOverId(null);
    reordenar.mutate(next);
  };

  const ellipsis: React.CSSProperties = {
    display: "inline-block",
    verticalAlign: "middle",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Averbadora {publico ? `· Comunicados · ${PUBLICO_LABEL[publico]}` : ""}
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>
            {publico === "banco"
              ? "Comunicados para bancos"
              : publico === "servidor"
                ? "Comunicados para servidores"
                : publico === "prefeitura"
                  ? "Comunicados para prefeituras"
                  : "Comunicados"}
          </h1>
          <p style={{ color: "var(--text-muted)" }}>
            {publico === "banco"
              ? "Avisos que aparecem no portal dos bancos parceiros."
              : publico === "servidor"
                ? "Avisos que aparecem no app dos servidores municipais."
                : publico === "prefeitura"
                  ? "Avisos que aparecem no portal das prefeituras conveniadas."
                  : "Publique avisos para bancos, servidores ou prefeituras. Cada comunicado aparece somente no público escolhido."}
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>+ Novo comunicado</Button>
      </header>

      {data.isLoading ? (
        <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Carregando…</div>
      ) : linhas.length === 0 ? (
        <div style={{
          padding: 40, textAlign: "center", color: "var(--text-muted)",
          fontSize: 14, border: "1px dashed var(--border)", borderRadius: 12,
        }}>
          Nenhum comunicado ainda. Clique em "+ Novo comunicado" pra criar o primeiro.
        </div>
      ) : (
        <div style={{
          border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden",
        }}>
          {/* Cabecalho */}
          <div style={{
            display: "grid",
            gridTemplateColumns: publico
              ? "36px 110px 1fr 1fr 220px"
              : "36px 110px 90px 1fr 1fr 220px",
            gap: 12, padding: "10px 16px",
            fontSize: 11, letterSpacing: "0.06em", fontWeight: 700,
            color: "var(--text-dim)", textTransform: "uppercase",
            background: "var(--bg-elev)", borderBottom: "1px solid var(--border)",
          }}>
            <span />
            <span>ID</span>
            {publico ? null : <span>Público</span>}
            <span>Título</span>
            <span>Conteúdo</span>
            <span style={{ textAlign: "right" }}>Ações</span>
          </div>
          {linhas.map((c) => {
            const isDragging = dragId === c.id;
            const isOver = overId === c.id && dragId && dragId !== c.id;
            return (
              <div
                key={c.id}
                draggable
                onDragStart={(e) => {
                  setDragId(c.id);
                  e.dataTransfer.effectAllowed = "move";
                  // Firefox exige algum dado pro drag iniciar
                  e.dataTransfer.setData("text/plain", c.id);
                }}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                onDragOver={(e) => {
                  if (!dragId || dragId === c.id) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (overId !== c.id) setOverId(c.id);
                }}
                onDragLeave={() => { if (overId === c.id) setOverId(null); }}
                onDrop={(e) => { e.preventDefault(); handleDrop(c.id); }}
                style={{
                  display: "grid",
                  gridTemplateColumns: publico
                    ? "36px 110px 1fr 1fr 220px"
                    : "36px 110px 90px 1fr 1fr 220px",
                  gap: 12, padding: "12px 16px",
                  fontSize: 14, alignItems: "center",
                  borderTop: isOver ? "2px solid var(--accent)" : "1px solid var(--border)",
                  background: isDragging ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent",
                  opacity: isDragging ? 0.55 : 1,
                  transition: "background .12s ease",
                }}
              >
                {/* Grip handle — dica visual de "arraste aqui" */}
                <span
                  aria-label="Arraste para reordenar"
                  title="Arraste para reordenar"
                  style={{
                    cursor: "grab", color: "var(--text-dim)", fontSize: 18,
                    userSelect: "none", lineHeight: 1, textAlign: "center",
                  }}
                >
                  ⋮⋮
                </span>
                <span style={{ ...ellipsis, maxWidth: 96, fontFamily: "var(--font-mono)", fontSize: 12 }} title={c.id}>
                  {c.id}
                </span>
                {publico ? null : (
                  <span>
                    <Pill variant={(c.publico ?? "banco") === "servidor" ? "averbado" : (c.publico === "prefeitura" ? "aceita" : "emdia")}>
                      {PUBLICO_LABEL[c.publico ?? "banco"]}
                    </Pill>
                  </span>
                )}
                <span style={{ ...ellipsis, maxWidth: 240 }} title={c.titulo}>{c.titulo}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: 300 }}>
                  <span style={{ ...ellipsis, maxWidth: 260, color: "var(--text-muted)" }} title={c.corpo}>
                    {c.corpo}
                  </span>
                  {c.linkHref ? (
                    <span title={c.linkLabel ?? c.linkHref} style={{ color: "var(--accent)", fontSize: 12 }}>🔗</span>
                  ) : null}
                </span>
                <div style={{ display: "inline-flex", gap: 4, alignItems: "center", justifyContent: "flex-end" }}>
                  <Button variant="ghost" size="sm" type="button" onClick={() => setEditing(c)}>Editar</Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    disabled={remover.isPending}
                    onClick={() => {
                      if (window.confirm(`Remover o comunicado "${c.titulo}"? Essa acao nao pode ser desfeita.`)) {
                        remover.mutate(c.id);
                      }
                    }}
                    style={{ color: "#F87171" }}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing ? (
        <ComunicadoModal
          defaultPublico={publico}
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["admin", "comunicados"] })}
        />
      ) : null}
    </div>
  );
}

function ComunicadoModal({
  initial,
  defaultPublico,
  onClose,
  onSaved,
}: {
  initial: Comunicado | null;
  defaultPublico?: ComunicadoPublico;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    id: initial?.id,
    titulo: initial?.titulo ?? "",
    corpo: initial?.corpo ?? "",
    linkLabel: initial?.linkLabel ?? "",
    linkHref: initial?.linkHref ?? "",
    // Ao criar via submenu, ja vem pre-selecionado o publico daquele submenu.
    publico: (initial?.publico ?? defaultPublico ?? "banco") as ComunicadoPublico,
  });

  const save = useMutation({
    mutationFn: () =>
      atlas.admin.upsertComunicado({
        ...(form.id ? { id: form.id } : {}),
        titulo: form.titulo,
        corpo: form.corpo,
        publico: form.publico,
        ...(form.linkLabel ? { linkLabel: form.linkLabel } : {}),
        ...(form.linkHref ? { linkHref: form.linkHref } : {}),
      }),
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });

  const canSave = form.titulo.trim().length > 0 && form.corpo.trim().length > 0 && !save.isPending;

  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={modalCard}>
        <h3 style={{ margin: 0 }}>
          {initial ? "Editar comunicado" : "Novo comunicado"}
          {defaultPublico ? (
            <span style={{ fontWeight: 500, fontSize: 14, color: "var(--text-muted)", marginLeft: 8 }}>
              · {PUBLICO_LABEL[defaultPublico]}
            </span>
          ) : null}
        </h3>
        {/* Se o modal foi aberto de dentro de um submenu (Banco/Servidor), o
            publico ja esta fixado — nao mostramos o seletor, sao criados apenas
            para aquele publico. Fora do submenu (rota /comunicados sem filho),
            mantemos a escolha manual. */}
        {defaultPublico ? (
          <TextField
            label="Título"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            required
          />
        ) : (
          <FormGrid cols={2}>
            <SelectField
              label="Público-alvo"
              value={form.publico}
              onChange={(e) => setForm({ ...form, publico: e.target.value as ComunicadoPublico })}
              options={[
                { value: "banco", label: "Banco (aparece no portal dos bancos)" },
                { value: "servidor", label: "Servidor (aparece no app do servidor)" },
                { value: "prefeitura", label: "Prefeitura (aparece no portal das prefeituras)" },
              ]}
              required
            />
            <TextField
              label="Título"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              required
            />
          </FormGrid>
        )}
        <TextareaField
          label="Conteúdo"
          value={form.corpo}
          onChange={(e) => setForm({ ...form, corpo: e.target.value })}
          rows={4}
          required
        />
        <FormGrid cols={2}>
          <TextField
            label="Texto do link (opcional)"
            value={form.linkLabel}
            onChange={(e) => setForm({ ...form, linkLabel: e.target.value })}
            placeholder="Ex.: Acessar Cadastros"
          />
          <TextField
            label="URL do link (opcional)"
            value={form.linkHref}
            onChange={(e) => setForm({ ...form, linkHref: e.target.value })}
            placeholder="Ex.: /banco/cadastros/tabela-empréstimos"
          />
        </FormGrid>
        {save.isError ? (
          <p style={{ color: "var(--text-danger, #ff6b6b)", margin: 0 }}>
            Não foi possível salvar. Verifique os campos e tente de novo.
          </p>
        ) : null}
        <FormActions>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={!canSave} onClick={() => save.mutate()}>
            {save.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </FormActions>
      </div>
    </div>
  );
}

const modalBackdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(10,22,40,.6)",
  display: "grid",
  placeItems: "center",
  zIndex: 100,
  backdropFilter: "blur(6px)",
};
const modalCard: React.CSSProperties = {
  background: "var(--bg-elev)",
  border: "1px solid var(--border-strong)",
  borderRadius: 14,
  padding: 24,
  maxWidth: 720,
  width: "calc(100% - 48px)",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  boxShadow: "var(--shadow-lg)",
};
