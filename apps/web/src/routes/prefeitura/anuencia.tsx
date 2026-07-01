import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, DataTable, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { PageHeader, inp } from "./_ui";

export function PrefeituraAnuencia() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["prefeitura", "anuencia"], queryFn: () => atlas.prefeitura.anuencia() });
  const [aceitoPor, setAceitoPor] = useState("");
  const [check, setCheck] = useState(false);

  const aceitar = useMutation({
    mutationFn: () => atlas.prefeitura.aceitarAnuencia(aceitoPor),
    onSuccess: () => { setCheck(false); setAceitoPor(""); qc.invalidateQueries({ queryKey: ["prefeitura"] }); },
  });

  const vigente = q.data?.vigente ?? null;

  const columns: Column<{ id: string; versao: string; aceitoPor: string; aceitoEm: string; ip?: string }>[] = [
    { key: "id", header: "ID", mono: true },
    { key: "versao", header: "Versão" },
    { key: "aceitoPor", header: "Aceito por" },
    { key: "aceitoEm", header: "Data", render: (a) => new Date(a.aceitoEm).toLocaleString("pt-BR") },
    { key: "ip", header: "IP", render: (a) => a.ip ?? "—" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader title="Anuência de dados" subtitle="Autorização formal (opt-in auditável) para uso da base de servidores pela averbadora e bancos." />

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "var(--text-dim)", textTransform: "uppercase" }}>Termo {q.data?.versaoAtual}</span>
          {vigente ? <Pill variant="averbado">Vigente — aceito por {vigente.aceitoPor}</Pill> : <Pill variant="pendente">Pendente de aceite</Pill>}
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 12, lineHeight: 1.6 }}>{q.data?.termo}</p>

        {!vigente ? (
          <div style={{ marginTop: 12, display: "grid", gap: 10, maxWidth: 480 }}>
            <input style={inp} placeholder="Nome do responsável (RH/Gestor)" value={aceitoPor} onChange={(e) => setAceitoPor(e.target.value)} />
            <label style={{ display: "flex", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={check} onChange={(e) => setCheck(e.target.checked)} />
              Li e autorizo o uso da base conforme o termo acima (LGPD).
            </label>
            <div><Button onClick={() => aceitar.mutate()} disabled={!check || aceitoPor.length < 2 || aceitar.isPending}>{aceitar.isPending ? "Registrando…" : "Registrar anuência"}</Button></div>
            {aceitar.isError ? <p style={{ color: "#ef4444", fontSize: 13 }}>{(aceitar.error as Error).message}</p> : null}
          </div>
        ) : null}
      </Card>

      <Card>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "var(--text-dim)", textTransform: "uppercase" }}>Histórico auditável</span>
        <div style={{ marginTop: 10 }}>
          <DataTable columns={columns} rows={q.data?.historico ?? []} rowKey={(a) => a.id} loading={q.isLoading} emptyState="Nenhuma anuência registrada." />
        </div>
      </Card>
    </div>
  );
}
