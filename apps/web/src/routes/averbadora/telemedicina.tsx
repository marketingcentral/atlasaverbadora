import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, IconButton, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { AdminBeneficio } from "@atlas/sdk";

/** Tela dedicada de Telemedicina. Cliente pediu aba separada de "Benefícios" —
 *  aqui só aparecem beneficios com categoria=telemedicina. Reusa o mesmo form
 *  de /averbadora/beneficios/novo (com categoria pre-marcada). A logica de
 *  pausar/reativar/editar continua a mesma. */
export function AverbadoraTelemedicina() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const beneficiosQ = useQuery({ queryKey: ["admin", "beneficios"], queryFn: () => atlas.admin.beneficios.list() });
  const prefeiturasQ = useQuery({ queryKey: ["admin", "prefeituras"], queryFn: () => atlas.admin.listPrefeituras() });

  const pausar = useMutation({
    mutationFn: (id: string) => atlas.admin.beneficios.pausar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "beneficios"] }),
  });
  const reativar = useMutation({
    mutationFn: (id: string) => atlas.admin.beneficios.reativar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "beneficios"] }),
  });

  const prefNome = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of prefeiturasQ.data?.prefeituras ?? []) map.set(p.id, `${p.nome}/${p.uf}`);
    return map;
  }, [prefeiturasQ.data]);

  const rows = useMemo(
    () => (beneficiosQ.data?.beneficios ?? []).filter((b) => b.categorias.includes("telemedicina")),
    [beneficiosQ.data],
  );

  const columns: Column<AdminBeneficio>[] = [
    { key: "ativo", header: "Situação", render: (b) => <Pill variant={b.ativo ? "averbado" : "expirado"}>{b.ativo ? "Ativo" : "Pausado"}</Pill> },
    {
      key: "icone",
      header: "",
      render: (b) => (
        <span style={{
          width: 32, height: 32, borderRadius: 8,
          background: `color-mix(in srgb, ${b.cor} 15%, transparent)`,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, overflow: "hidden",
        }}>
          {b.icone.startsWith("http")
            ? <img src={b.icone} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            : b.icone}
        </span>
      ),
    },
    { key: "nome", header: "Nome" },
    { key: "pref", header: "Prefeitura", render: (b) => prefNome.get(b.prefeituraId) ?? `#${b.prefeituraId}` },
    { key: "local", header: "Local" },
    { key: "desc", header: "Desconto/preço", render: (b) => `${b.descontoLabel} ${b.descontoComplemento}` },
    { key: "origem", header: "Origem", render: (b) => <Pill variant={b.origem === "banco" ? "aceita" : "emdia"}>{b.origem}</Pill> },
    { key: "link", header: "Link", render: (b) => b.linkAcesso?.url ? <span style={{ fontSize: 11, color: "var(--emerald-500)" }}>✓ Sim</span> : <span style={{ color: "var(--text-dim)" }}>—</span> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Averbadora
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>📱 Telemedicina</h1>
          <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 720, fontSize: 13 }}>
            Parcerias de telemedicina — consultas online, plataformas de agendamento e assinaturas médicas digitais.
            Aparecem numa aba própria no app do servidor, separada dos parceiros de saúde presencial.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={() => nav("/averbadora/interessados?categoria=telemedicina")}>
            👥 Interessados
          </Button>
          <Button onClick={() => nav("/averbadora/beneficios/novo?categoria=telemedicina")}>
            + Nova parceria de telemedicina
          </Button>
        </div>
      </header>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(b) => b.id}
        loading={beneficiosQ.isLoading}
        emptyState="Nenhuma parceria de telemedicina ainda. Clique em '+ Nova parceria' pra começar."
        actions={(b) => (
          <>
            <IconButton title="Editar" onClick={() => nav(`/averbadora/beneficios/${b.id}/editar`)}>✎</IconButton>
            {b.ativo ? (
              <IconButton
                title="Pausar"
                danger
                onClick={() => { if (confirm(`Pausar "${b.nome}"?\n\nSai do app do servidor até você reativar.`)) pausar.mutate(b.id); }}
              >⏸</IconButton>
            ) : (
              <IconButton title="Reativar" onClick={() => reativar.mutate(b.id)}>▶</IconButton>
            )}
          </>
        )}
      />
    </div>
  );
}
