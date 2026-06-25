import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ContratosTable,
  MargemCalculadorBox,
  MargemColaboradorCard,
  MargemProjecaoLinha,
  OperacoesGrid,
} from "@atlas/ui/web";
import { atlas } from "../../../lib/sdk";

export function BancoMargemContratacaoFicha() {
  const { idMatricula = "" } = useParams<{ idMatricula: string }>();
  const nav = useNavigate();

  const ficha = useQuery({
    queryKey: ["banco", "margem", idMatricula],
    queryFn: () => atlas.banco.margemBuscar({ matricula: idMatricula.replace(/^MAT-/, "") }),
    enabled: !!idMatricula,
  });

  const hoje = new Date();
  const [mes, setMes] = useState<string>(monthLabel(hoje.getMonth() + 1));
  const [ano, setAno] = useState<number>(hoje.getFullYear());

  const calcular = useMutation({
    mutationFn: () => atlas.banco.margemCalcular(idMatricula, { mes: monthIndex(mes), ano }),
  });

  const contratos = useQuery({
    queryKey: ["banco", "contratos", idMatricula],
    queryFn: () =>
      atlas.banco.contratos({ colaborador: idMatricula.replace(/^MAT-/, "") }),
    enabled: !!idMatricula,
  });

  if (ficha.isLoading) return <div style={{ color: "var(--text-muted)" }}>Carregando ficha...</div>;
  if (ficha.error || !ficha.data) return <div style={{ color: "var(--danger-500)" }}>Erro ao carregar colaborador.</div>;

  const f = ficha.data.ficha;
  const margem = calcular.data ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1200 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Margem / Contratação
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>{f.nome}</h1>
      </header>

      <MargemColaboradorCard
        ficha={{
          matricula: f.matricula,
          cpf: f.cpf,
          cpfMasked: f.cpfMasked,
          nome: f.nome,
          dataAdmissao: f.dataAdmissao,
          vinculo: f.vinculo,
          origem: f.origem,
          situacaoFuncional: f.situacaoFuncional,
        }}
        onClose={() => nav("/banco/margem-contratacao")}
      />

      <MargemCalculadorBox
        mes={mes}
        ano={ano}
        onMesChange={setMes}
        onAnoChange={setAno}
        total={margem?.total ?? null}
        disponivel={margem?.disponivel ?? null}
        tipo="EMPRESTIMO"
        calculando={calcular.isPending}
        onCalcular={() => calcular.mutate()}
      />

      {margem ? <MargemProjecaoLinha meses={margem.projecao} /> : null}

      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, color: "var(--text-muted)" }}>Novas Contratações</h2>
        <OperacoesGrid
          titulo="Averbações"
          cols={2}
          itens={[
            { key: "av-emp", label: "Empréstimo", disponivel: true, icon: "✱", onClick: () => nav("averbar/EMPRESTIMO") },
            { key: "av-ref", label: "Refinanciamento", disponivel: true, icon: "↻", onClick: () => nav("averbar/REFIN") },
          ]}
        />
        <OperacoesGrid
          titulo="Reservas"
          cols={4}
          itens={[
            { key: "rs-emp", label: "Empréstimo", disponivel: true, icon: "✱", onClick: () => nav("reservar/EMPRESTIMO") },
            { key: "rs-ref", label: "Refinanciamento", disponivel: true, icon: "↻", onClick: () => nav("reservar/REFIN") },
            { key: "rs-comp", label: "Composta", disponivel: true, icon: "⊞", onClick: () => nav("reservar/COMPOSTA") },
            { key: "rs-port", label: "Portabilidade", disponivel: true, icon: "⇄", onClick: () => nav("reservar/PORTABILIDADE") },
          ]}
        />
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16, color: "var(--text-muted)" }}>Contratos do colaborador</h2>
        <ContratosTable
          loading={contratos.isLoading}
          rows={(contratos.data?.contratos ?? []).map((c) => ({
            adf: c.adf,
            situacao: c.situacao,
            lancamento: c.lancamento,
            expiracao: c.expiracao,
            tipoContrato: c.tipoContrato,
            totalParcelas: c.totalParcelas,
            valorParcela: c.valorParcela,
            convenio: c.convenio,
          }))}
          emptyState="Este colaborador não possui contratos neste convênio."
        />
      </section>
    </div>
  );
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
function monthLabel(m: number): string { return MESES[m - 1] ?? "Janeiro"; }
function monthIndex(label: string): number { return MESES.indexOf(label) + 1 || 1; }
