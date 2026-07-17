import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, FormActions, IconButton, Pill, SelectField, TextField, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { AdminPreReserva, PreReservaStatus } from "@atlas/sdk";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DT_BR = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
});

export function AdminPreReservas() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"" | PreReservaStatus>("");
  const data = useQuery({
    queryKey: ["admin", "pre-reservas", statusFilter],
    queryFn: () => atlas.admin.listPreReservas(statusFilter ? { status: statusFilter } : undefined),
    refetchInterval: 10_000,
    placeholderData: (prev) => prev,
  });
  const sweep = useMutation({
    mutationFn: () => atlas.admin.sweepPreReservas(),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["admin", "pre-reservas"] });
      alert(r.expiradas === 0 ? "Nenhuma pré-reserva expirou agora." : `${r.expiradas} pré-reserva(s) expiraram.`);
    },
  });
  const [cancelling, setCancelling] = useState<AdminPreReserva | null>(null);

  const resumo = data.data?.resumo;

  const columns: Column<AdminPreReserva>[] = [
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Pill
          variant={
            r.status === "ativa" ? "pendente" : r.status === "confirmada" ? "averbado" : r.status === "expirada" ? "expirado" : "rejeitada"
          }
        >
          {r.status}
        </Pill>
      ),
    },
    { key: "idUnico", header: "ID único", mono: true },
    { key: "bancoNome", header: "Banco" },
    { key: "prefeituraNome", header: "Prefeitura" },
    { key: "servidorNome", header: "Servidor", render: (r) => (<><div>{r.servidorNome}</div><div style={{ fontSize: 11, color: "var(--text-dim)" }}>{r.servidorCpfMasked} / {r.matricula}</div></>) },
    { key: "tipoOperacao", header: "Tipo" },
    { key: "valorMargem", header: "Margem", align: "right", render: (r) => BRL.format(r.valorMargem) },
    {
      key: "expiraEm",
      header: "Expira",
      render: (r) => {
        if (r.status !== "ativa") return <span style={{ color: "var(--text-dim)" }}>—</span>;
        const ms = new Date(r.expiraEm).getTime() - Date.now();
        if (ms <= 0) return <span style={{ color: "var(--danger-500)" }}>expirou</span>;
        const h = Math.floor(ms / 3600_000);
        const m = Math.floor((ms % 3600_000) / 60_000);
        const danger = ms <= 24 * 3600_000;
        return (
          <span style={{ color: danger ? "var(--gold-500)" : "var(--text)", fontWeight: danger ? 600 : 400 }}>
            em {h}h {m}m
          </span>
        );
      },
    },
    { key: "criadoEm", header: "Criada", render: (r) => (
        <span title={`Expira em ${DT_BR.format(new Date(r.expiraEm))} (BRT)`}>
          {DT_BR.format(new Date(r.criadoEm))}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Averbadora
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Pré-reservas e travas de margem</h1>
          <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 720 }}>
            Fila de propostas com margem travada. Expiração automática conforme regra do convênio (padrão 48h / 7 dias úteis para portabilidade); ao expirar, a margem retorna para "disponível".
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" onClick={() => sweep.mutate()} disabled={sweep.isPending}>
            {sweep.isPending ? "Varrendo..." : "Varrer expiradas agora"}
          </Button>
        </div>
      </header>

      <SummaryBar resumo={resumo} />

      <div style={{ display: "flex", gap: 12, alignItems: "end" }}>
        <SelectField
          label="Filtrar status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | PreReservaStatus)}
          options={[
            { value: "", label: "Todos" },
            { value: "ativa", label: "Ativas" },
            { value: "confirmada", label: "Confirmadas" },
            { value: "expirada", label: "Expiradas" },
            { value: "cancelada", label: "Canceladas" },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        rows={data.data?.preReservas ?? []}
        rowKey={(r) => r.id}
        loading={data.isLoading}
        actions={(r) => (
          r.status === "ativa" ? (
            <IconButton title="Cancelar manualmente" onClick={() => setCancelling(r)}>✕</IconButton>
          ) : null
        )}
      />

      {cancelling ? <CancelModal preReserva={cancelling} onClose={() => setCancelling(null)} /> : null}
    </div>
  );
}

function SummaryBar({ resumo }: { resumo: { ativas: number; expirandoEm24h: number; confirmadasHoje: number; expiradasHoje: number; margemTotalTravada: number } | undefined }) {
  const cards = useMemo(() => [
    { label: "Pré-reservas ativas", value: resumo?.ativas ?? "—" },
    { label: "Expirando em 24h", value: resumo?.expirandoEm24h ?? "—", warn: (resumo?.expirandoEm24h ?? 0) > 0 },
    { label: "Confirmadas hoje", value: resumo?.confirmadasHoje ?? "—" },
    { label: "Expiradas hoje", value: resumo?.expiradasHoje ?? "—" },
    { label: "Margem travada (R$)", value: resumo ? BRL.format(resumo.margemTotalTravada) : "—" },
  ], [resumo]);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
      {cards.map((c) => (
        <div key={c.label} style={{
          background: "var(--bg-elev)", border: "1px solid var(--border-strong)",
          borderRadius: 12, padding: "14px 16px",
        }}>
          <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{c.label}</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6, color: c.warn ? "var(--gold-500)" : "var(--text)" }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

function CancelModal({ preReserva, onClose }: { preReserva: AdminPreReserva; onClose: () => void }) {
  const qc = useQueryClient();
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const cancel = useMutation({
    mutationFn: () => atlas.admin.cancelarPreReserva(preReserva.id, motivo.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "pre-reservas"] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Erro ao cancelar"),
  });
  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={modalCard}>
        <h3 style={{ margin: 0 }}>Cancelar pré-reserva</h3>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          <div>ID único: <code>{preReserva.idUnico}</code></div>
          <div>Servidor: {preReserva.servidorNome} ({preReserva.servidorCpfMasked})</div>
          <div>Margem: {BRL.format(preReserva.valorMargem)}</div>
        </div>
        <TextField
          label="Motivo (obrigatório, 3-200 chars)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          required
          minLength={3}
          maxLength={200}
        />
        {error ? <div style={{ color: "var(--danger-500)", fontSize: 13 }}>{error}</div> : null}
        <FormActions>
          <Button variant="ghost" type="button" onClick={onClose}>Voltar</Button>
          <Button type="button" disabled={cancel.isPending || motivo.trim().length < 3} onClick={() => cancel.mutate()}>
            {cancel.isPending ? "Cancelando..." : "Confirmar cancelamento"}
          </Button>
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
  borderRadius: 14, padding: 24, maxWidth: 520, width: "calc(100% - 48px)",
  display: "flex", flexDirection: "column", gap: 16, boxShadow: "var(--shadow-lg)",
};
