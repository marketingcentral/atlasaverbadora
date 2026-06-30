import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, DataTable, FormGrid, Pill, SelectField, TextField, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { AdminBateCarteiraLinha, AdminBateCarteiraResultado } from "@atlas/sdk";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function AdminBateCarteira() {
  const bancos = useQuery({ queryKey: ["admin", "bancos"], queryFn: () => atlas.admin.listBancos() });
  const prefeituras = useQuery({ queryKey: ["admin", "prefeituras"], queryFn: () => atlas.admin.listPrefeituras() });
  const [bancoId, setBancoId] = useState<number | null>(null);
  const [prefeituraId, setPrefeituraId] = useState<number | "all">("all");
  const [competencia, setCompetencia] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [resultado, setResultado] = useState<AdminBateCarteiraResultado | null>(null);

  const gerar = useMutation({
    mutationFn: () =>
      atlas.admin.bateCarteira({
        bancoId: bancoId ?? 0,
        competencia,
        prefeituraId: prefeituraId === "all" ? undefined : prefeituraId,
        format: "json",
      }),
    onSuccess: (r) => setResultado(r),
    onError: (err) => alert(err instanceof Error ? err.message : "Erro ao gerar"),
  });

  async function baixarCsv() {
    if (!bancoId) return;
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787"}/v1/admin/bate-carteira`, {
      method: "POST",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("atlas:tokens") ? JSON.parse(localStorage.getItem("atlas:tokens")!).access_token : ""}`,
      },
      body: JSON.stringify({ bancoId, competencia, prefeituraId: prefeituraId === "all" ? undefined : prefeituraId, format: "csv" }),
    });
    if (!res.ok) {
      alert(`Erro ${res.status}`);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bate-carteira-${bancoId}-${competencia}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const columns: Column<AdminBateCarteiraLinha>[] = [
    { key: "origem", header: "Origem", render: (l) => <Pill variant={l.origem === "tombamento" ? "averbado" : "emdia"}>{l.origem === "tombamento" ? "tombamento" : "pré-reserva"}</Pill> },
    { key: "cpfMasked", header: "CPF" },
    { key: "matricula", header: "Matrícula" },
    { key: "idUnico", header: "ID único", mono: true },
    { key: "adfBanco", header: "ADF banco", mono: true, render: (l) => l.adfBanco ?? "—" },
    { key: "valorParcela", header: "Parcela", align: "right", render: (l) => BRL.format(l.valorParcela) },
    { key: "saldoDevedor", header: "Saldo devedor", align: "right", render: (l) => BRL.format(l.saldoDevedor ?? 0) },
    { key: "status", header: "Status" },
    { key: "data", header: "Data" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Averbadora
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Bate-de-carteira</h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 720 }}>
          Relatório mensal por banco para conciliação. Saída: CPF mascarado + ID único + dados da operação, em CSV/JSON.
        </p>
      </header>

      <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: 20 }}>
        <FormGrid cols={3}>
          <SelectField
            label="Banco"
            value={bancoId ? String(bancoId) : ""}
            onChange={(e) => setBancoId(e.target.value ? Number(e.target.value) : null)}
            options={[{ value: "", label: "—" }, ...(bancos.data?.bancos.map((b) => ({ value: String(b.id), label: b.nome })) ?? [])]}
          />
          <TextField
            label="Competência (YYYYMM)"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            maxLength={6}
          />
          <SelectField
            label="Prefeitura (opcional)"
            value={String(prefeituraId)}
            onChange={(e) => setPrefeituraId(e.target.value === "all" ? "all" : Number(e.target.value))}
            options={[{ value: "all", label: "Todas" }, ...(prefeituras.data?.prefeituras.map((p) => ({ value: String(p.id), label: `${p.nome}/${p.uf}` })) ?? [])]}
          />
        </FormGrid>
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <Button onClick={() => gerar.mutate()} disabled={!bancoId || gerar.isPending}>
            {gerar.isPending ? "Gerando..." : "Gerar relatório"}
          </Button>
          <Button variant="ghost" onClick={baixarCsv} disabled={!bancoId}>Baixar CSV</Button>
        </div>
      </div>

      {resultado ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <Stat label="Banco" value={resultado.bancoNome} />
            <Stat label="Competência" value={resultado.competencia} />
            <Stat label="Linhas" value={resultado.totalLinhas.toLocaleString("pt-BR")} />
            <Stat label="Soma saldo devedor" value={BRL.format(resultado.somaSaldoDevedor)} />
            <Stat label="Soma parcelas" value={BRL.format(resultado.somaValorParcela)} />
          </div>
          <DataTable
            columns={columns}
            rows={resultado.linhas}
            rowKey={(l) => `${l.matricula}-${l.idUnico}-${l.adfBanco ?? "x"}-${l.origem}`}
          />
        </>
      ) : (
        <div style={{ padding: 32, textAlign: "center", color: "var(--text-dim)" }}>
          Selecione banco e competência para gerar o relatório.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{value}</div>
    </div>
  );
}
