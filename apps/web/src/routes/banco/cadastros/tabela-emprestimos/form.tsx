import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  FormActions,
  FormGrid,
  NumberField,
  SelectField,
  TextField,
} from "@atlas/ui/web";
import { atlas } from "../../../../lib/sdk";
import type { BancoTabelaInput } from "@atlas/sdk";

export function BancoTabelaEmprestimosForm() {
  const params = useParams<{ id?: string }>();
  const isNovo = params.id === "novo" || !params.id;
  const id = isNovo ? undefined : params.id;
  const nav = useNavigate();
  const qc = useQueryClient();

  const convenios = useQuery({ queryKey: ["banco", "convenios"], queryFn: () => atlas.banco.convenios() });
  const existing = useQuery({
    queryKey: ["banco", "tabela", id],
    queryFn: () => atlas.banco.getTabela(id!),
    enabled: !!id,
    // Nunca serve cache stale no form de edicao — precisa refletir o que
    // foi salvo na ultima passagem, senao usuario ve o valor antigo.
    staleTime: 0,
    refetchOnMount: "always",
    // Desabilita refetch em foco: se o usuario Alt-Tab enquanto edita
    // partial, o refetch poderia sobrescrever suas alteracoes ainda nao
    // salvas via o useEffect que sincroniza data -> state.
    refetchOnWindowFocus: false,
  });

  const [convenioId, setConvenioId] = useState("");
  const [taxaMinPct, setTaxaMinPct] = useState(1.5);
  const [taxaMaxPct, setTaxaMaxPct] = useState(2.0);
  const [prazoMaxMeses, setPrazoMaxMeses] = useState(120);
  const [vigenciaInicio, setVigenciaInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [vigenciaFim, setVigenciaFim] = useState("");
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (existing.data) {
      const t = existing.data.tabela;
      setConvenioId(t.convenioId);
      setTaxaMinPct(t.taxaMinAm * 100);
      setTaxaMaxPct(t.taxaMaxAm * 100);
      setPrazoMaxMeses(t.prazoMaxMeses);
      setVigenciaInicio(t.vigenciaInicio);
      setVigenciaFim(t.vigenciaFim ?? "");
      setAtivo(t.ativo);
    } else if (convenios.data && !convenioId) {
      setConvenioId(convenios.data.convenios[0]?.id ?? "");
    }
  }, [existing.data, convenios.data, convenioId]);

  const convenioNome = useMemo(() => convenios.data?.convenios.find((c) => c.id === convenioId)?.nome ?? "", [convenios.data, convenioId]);

  const save = useMutation({
    mutationFn: () => {
      const body: BancoTabelaInput = {
        id,
        convenioId,
        convenio: convenioNome,
        taxaMinAm: Number((taxaMinPct / 100).toFixed(6)),
        taxaMaxAm: Number((taxaMaxPct / 100).toFixed(6)),
        prazoMaxMeses,
        vigenciaInicio,
        vigenciaFim: vigenciaFim || undefined,
        ativo,
      };
      return atlas.banco.upsertTabela(body);
    },
    onSuccess: () => {
      // Invalida BOTH: a lista ('tabelas') e o item individual ('tabela', id).
      // Sem invalidar o singular, ao reabrir o form o React Query retornava
      // o cache stale de antes do save — usuario via valor antigo.
      qc.invalidateQueries({ queryKey: ["banco", "tabelas"] });
      if (id) qc.invalidateQueries({ queryKey: ["banco", "tabela", id] });
      // Marketplace do servidor tambem le tabelas (via ofertas): invalidar
      // pra que o servidor veja imediatamente a nova taxa/prazo.
      qc.invalidateQueries({ queryKey: ["servidor", "ofertas"] });
      nav("/banco/cadastros/tabela-emprestimos");
    },
  });

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        save.mutate();
      }}
      style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 840 }}
    >
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Cadastros • Tabela de Empréstimos
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>{id ? `Editar ${id}` : "Nova tabela"}</h1>
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
          <SelectField
            label="Convênio"
            value={convenioId}
            onChange={(e) => setConvenioId(e.target.value)}
            options={(convenios.data?.convenios ?? []).map((c) => ({ value: c.id, label: c.nome }))}
            required
          />
          <SelectField
            label="Situação"
            value={ativo ? "1" : "0"}
            onChange={(e) => setAtivo(e.target.value === "1")}
            options={[
              { value: "1", label: "Ativo" },
              { value: "0", label: "Inativo" },
            ]}
          />
          <NumberField label="Taxa min (% a.m.)" step={0.01} value={taxaMinPct} onChange={(e) => setTaxaMinPct(Number(e.target.value))} required />
          <NumberField label="Taxa max (% a.m.)" step={0.01} value={taxaMaxPct} onChange={(e) => setTaxaMaxPct(Number(e.target.value))} required />
          {/* Prazo max fechado em opcoes fixas (12/24/36/48/60/72/96/120) —
              cliente pediu pra remover a edicao livre em numeros. Servidor
              simulando so ve prazos ate esse teto (bate em tempo real via
              atlas.servidor.tabelas). */}
          <SelectField
            label="Prazo max (meses)"
            value={String(prazoMaxMeses)}
            onChange={(e) => setPrazoMaxMeses(Number(e.target.value))}
            options={[12, 24, 36, 48, 60, 72, 96, 120].map((n) => ({ value: String(n), label: `${n} meses` }))}
            required
          />
          <TextField label="Vigência início" type="date" value={vigenciaInicio} onChange={(e) => setVigenciaInicio(e.target.value)} required />
          <TextField label="Vigência fim" type="date" value={vigenciaFim} onChange={(e) => setVigenciaFim(e.target.value)} hint="Opcional. Vazio = aberta" />
        </FormGrid>
      </section>

      {save.error ? (
        <div style={{ color: "var(--danger-500)", fontSize: 13 }}>
          {save.error instanceof Error ? save.error.message : "Erro ao salvar"}
        </div>
      ) : null}

      <FormActions>
        <Button variant="ghost" type="button" onClick={() => nav("/banco/cadastros/tabela-emprestimos")}>Cancelar</Button>
        <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
      </FormActions>
    </form>
  );
}
