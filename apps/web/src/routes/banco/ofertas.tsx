import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, DataTable, IconButton, Input, Pill, TextField, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { BancoOferta, BancoOfertaInput, BancoOfertaFiltro } from "@atlas/sdk";
import { fmtBRL } from "../../lib/banco-propostas";

const VINCULOS = ["CLT", "ESTATUTARIO", "COMISSIONADO", "APOSENTADO", "PENSIONISTA"];
const SITUACOES = ["ATIVO", "TRABALHANDO", "FERIAS", "AFASTADO", "LICENCA", "APOSENTADO"];

export function BancoOfertas() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<BancoOferta | "new" | null>(null);
  const ofertasQ = useQuery({ queryKey: ["banco", "ofertas"], queryFn: () => atlas.banco.ofertas.list() });
  const conveniosQ = useQuery({ queryKey: ["banco", "convenios"], queryFn: () => atlas.banco.convenios() });

  const pausar = useMutation({
    mutationFn: (id: string) => atlas.banco.ofertas.pausar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["banco", "ofertas"] }),
  });
  const reativar = useMutation({
    mutationFn: (id: string) => atlas.banco.ofertas.reativar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["banco", "ofertas"] }),
  });

  const columns: Column<BancoOferta>[] = [
    { key: "ativo", header: "Situação", render: (o) => <Pill variant={o.ativo ? "averbado" : "expirado"}>{o.ativo ? "Ativa" : "Pausada"}</Pill> },
    { key: "titulo", header: "Título" },
    { key: "taxa", header: "Taxa a.m.", align: "right", render: (o) => `${o.taxaAm.toFixed(2)}%` },
    { key: "prazo", header: "Prazo máx.", align: "right", render: (o) => `${o.parcelasMax}x` },
    { key: "valor", header: "Valor máx.", align: "right", render: (o) => fmtBRL(o.valorMax) },
    {
      key: "publico",
      header: "Público-alvo",
      render: (o) => {
        const f = o.filtro;
        const partes: string[] = [];
        if (f.convenioIds?.length) partes.push(`${f.convenioIds.length} convênio(s)`);
        if (f.vinculos?.length) partes.push(f.vinculos.join("/"));
        if (f.situacaoFuncional?.length) partes.push(f.situacaoFuncional.join("/"));
        if (f.salarioMin != null || f.salarioMax != null) partes.push(`salário ${f.salarioMin ?? "—"}—${f.salarioMax ?? "—"}`);
        if (f.idadeMin != null || f.idadeMax != null) partes.push(`idade ${f.idadeMin ?? "—"}—${f.idadeMax ?? "—"}`);
        return partes.length ? partes.join(" · ") : <span style={{ color: "var(--text-dim)" }}>todos os elegíveis</span>;
      },
    },
    { key: "criadoEm", header: "Criada em", render: (o) => new Date(o.criadoEm).toLocaleDateString("pt-BR") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Marketing
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Ofertas</h1>
          <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 640 }}>
            Crie ofertas de crédito filtradas por perfil. Servidores compatíveis recebem a oferta no sino do app; ao clicar, podem iniciar a proposta com você.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>+ Nova oferta</Button>
      </header>

      <DataTable
        columns={columns}
        rows={ofertasQ.data?.ofertas ?? []}
        rowKey={(o) => o.id}
        loading={ofertasQ.isLoading}
        emptyState="Nenhuma oferta criada ainda."
        actions={(o) => (
          <>
            <IconButton title="Editar" onClick={() => setEditing(o)}>✎</IconButton>
            {o.ativo ? (
              <IconButton title="Pausar" danger onClick={() => { if (confirm(`Pausar "${o.titulo}"?\n\nEla para de aparecer no sino dos servidores até você reativar.`)) pausar.mutate(o.id); }}>⏸</IconButton>
            ) : (
              <IconButton title="Reativar" onClick={() => reativar.mutate(o.id)}>▶</IconButton>
            )}
          </>
        )}
      />

      {editing ? (
        <OfertaModal
          initial={editing === "new" ? null : editing}
          convenios={conveniosQ.data?.convenios ?? []}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

function OfertaModal({
  initial, convenios, onClose,
}: {
  initial: BancoOferta | null;
  convenios: { id: string; nome: string }[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<BancoOfertaInput>({
    id: initial?.id,
    titulo: initial?.titulo ?? "",
    mensagem: initial?.mensagem ?? "",
    taxaAm: initial?.taxaAm ?? 1.79,
    parcelasMax: initial?.parcelasMax ?? 84,
    valorMax: initial?.valorMax ?? 50000,
    ativo: initial?.ativo ?? true,
    expiraEm: initial?.expiraEm ?? "",
    filtro: initial?.filtro ?? {},
  });
  const [error, setError] = useState<string | null>(null);
  // Promocao relampago: duracao em horas a partir de agora. Se preenchido,
  // sobrescreve a data absoluta acima (calcula expiraEm = now + horas).
  const [duracaoHoras, setDuracaoHoras] = useState<string>("");
  const save = useMutation({
    mutationFn: () => {
      const horas = Number(duracaoHoras);
      const expiraCalc = duracaoHoras && Number.isFinite(horas) && horas > 0
        ? new Date(Date.now() + horas * 3600 * 1000).toISOString()
        : (form.expiraEm || undefined);
      return atlas.banco.ofertas.upsert({
        ...form,
        expiraEm: expiraCalc,
        filtro: form.filtro ?? {},
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banco", "ofertas"] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Erro ao salvar"),
  });

  function toggleArrayItem(key: keyof BancoOfertaFiltro, item: string | number): void {
    setForm((f) => {
      const cur = (f.filtro?.[key] as (string | number)[] | undefined) ?? [];
      const has = cur.includes(item);
      const next = has ? cur.filter((x) => x !== item) : [...cur, item];
      return { ...f, filtro: { ...f.filtro, [key]: next.length ? next : undefined } };
    });
  }

  const filtro = form.filtro ?? {};

  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={modalCard}>
        <h3 style={{ margin: 0 }}>{initial ? `Editar ${initial.titulo}` : "Nova oferta"}</h3>

        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionHead>Conteúdo da oferta</SectionHead>
          <TextField label="Título" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex.: Crédito consignado com taxa promocional" required />
          <TextField label="Mensagem (aparece no sino)" value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} placeholder="Ex.: Aproveite: 1,79% a.m. em até 84x." required />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <TextField label="Taxa a.m. (%)" type="number" value={String(form.taxaAm)} onChange={(e) => setForm({ ...form, taxaAm: Number(e.target.value) })} />
            <TextField label="Prazo máx. (x)" type="number" value={String(form.parcelasMax)} onChange={(e) => setForm({ ...form, parcelasMax: Number(e.target.value) })} />
            <TextField label="Valor máx. (R$)" type="number" value={String(form.valorMax)} onChange={(e) => setForm({ ...form, valorMax: Number(e.target.value) })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <TextField
              label="Expira em (opcional)"
              type="date"
              value={form.expiraEm ?? ""}
              onChange={(e) => setForm({ ...form, expiraEm: e.target.value })}
              hint="Ideal para ofertas mensais/sazonais."
              disabled={!!duracaoHoras && Number(duracaoHoras) > 0}
            />
            <TextField
              label="Ou duração em horas (promoção relâmpago)"
              type="number"
              min="0"
              step="0.5"
              value={duracaoHoras}
              onChange={(e) => setDuracaoHoras(e.target.value)}
              placeholder="Ex.: 24"
              hint="Se preenchido, começa a contar a partir de agora."
            />
          </div>
          {duracaoHoras && Number(duracaoHoras) > 0 ? (
            <div style={{ padding: "8px 12px", borderRadius: 8, border: "1px dashed var(--gold-500)", background: "color-mix(in srgb, var(--gold-500) 10%, transparent)", fontSize: 12 }}>
              ⏱ Promoção relâmpago: expira em <b>{new Date(Date.now() + Number(duracaoHoras) * 3600 * 1000).toLocaleString("pt-BR")}</b>. O servidor vê um contador regressivo.
            </div>
          ) : null}
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionHead>Público-alvo (deixe vazio para atingir todos os elegíveis)</SectionHead>

          <FieldGroup label="Convênios">
            {convenios.length === 0 ? <span style={{ color: "var(--text-dim)", fontSize: 13 }}>Nenhum convênio ativo.</span> : convenios.map((cv) => {
              const on = filtro.convenioIds?.includes(cv.id) ?? false;
              return <Chip key={cv.id} on={on} onClick={() => toggleArrayItem("convenioIds", cv.id)}>{cv.nome}</Chip>;
            })}
          </FieldGroup>

          <FieldGroup label="Vínculos">
            {VINCULOS.map((v) => {
              const on = filtro.vinculos?.includes(v) ?? false;
              return <Chip key={v} on={on} onClick={() => toggleArrayItem("vinculos", v)}>{v}</Chip>;
            })}
          </FieldGroup>

          <FieldGroup label="Situação funcional">
            {SITUACOES.map((s) => {
              const on = filtro.situacaoFuncional?.includes(s) ?? false;
              return <Chip key={s} on={on} onClick={() => toggleArrayItem("situacaoFuncional", s)}>{s}</Chip>;
            })}
          </FieldGroup>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <TextField
              label="Salário mín. (R$)"
              type="number"
              value={filtro.salarioMin != null ? String(filtro.salarioMin) : ""}
              onChange={(e) => setForm({ ...form, filtro: { ...filtro, salarioMin: e.target.value ? Number(e.target.value) : undefined } })}
            />
            <TextField
              label="Salário máx. (R$)"
              type="number"
              value={filtro.salarioMax != null ? String(filtro.salarioMax) : ""}
              onChange={(e) => setForm({ ...form, filtro: { ...filtro, salarioMax: e.target.value ? Number(e.target.value) : undefined } })}
            />
            <TextField
              label="Idade mín."
              type="number"
              value={filtro.idadeMin != null ? String(filtro.idadeMin) : ""}
              onChange={(e) => setForm({ ...form, filtro: { ...filtro, idadeMin: e.target.value ? Number(e.target.value) : undefined } })}
            />
            <TextField
              label="Idade máx."
              type="number"
              value={filtro.idadeMax != null ? String(filtro.idadeMax) : ""}
              onChange={(e) => setForm({ ...form, filtro: { ...filtro, idadeMax: e.target.value ? Number(e.target.value) : undefined } })}
            />
          </div>
        </section>

        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text-muted)" }}>
          <input type="checkbox" checked={form.ativo ?? true} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
          Publicar imediatamente (aparece no sino dos servidores compatíveis)
        </label>

        {error ? <div style={{ color: "var(--danger-500)", fontSize: 13 }}>{error}</div> : null}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={save.isPending || !form.titulo || !form.mensagem} onClick={() => save.mutate()}>{save.isPending ? "Salvando..." : "Salvar oferta"}</Button>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 700, color: "var(--text-dim)" }}>{children}</div>;
}
function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>
    </div>
  );
}
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "5px 10px",
        borderRadius: 999,
        border: "1px solid",
        borderColor: on ? "var(--emerald-500)" : "var(--border-strong)",
        background: on ? "var(--emerald-500)" : "transparent",
        color: on ? "var(--navy-900)" : "var(--text)",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

const modalBackdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(10,22,40,.6)",
  display: "grid", placeItems: "center", zIndex: 100, backdropFilter: "blur(6px)", padding: 16,
};
const modalCard: React.CSSProperties = {
  background: "var(--bg-elev)", border: "1px solid var(--border-strong)",
  borderRadius: 14, padding: 24, maxWidth: 640, width: "calc(100% - 32px)",
  display: "flex", flexDirection: "column", gap: 16, boxShadow: "var(--shadow-lg)",
  maxHeight: "calc(100vh - 32px)", overflowY: "auto",
};
