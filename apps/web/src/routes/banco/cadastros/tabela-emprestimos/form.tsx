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
import { ApiHttpError } from "@atlas/sdk";

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
  const [taxaPct, setTaxaPct] = useState(1.79);
  const [prazoMaxMeses, setPrazoMaxMeses] = useState(120);
  const [vigenciaInicio, setVigenciaInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [vigenciaFim, setVigenciaFim] = useState("");
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (existing.data) {
      const t = existing.data.tabela;
      setConvenioId(t.convenioId);
      // Migracao suave: taxa unica (taxaAm) preferida; se tabela legada so
      // tem taxaMinAm/taxaMaxAm, usa a max (que era o topo praticado) e
      // proximo save ja persiste como unica.
      const raw = (t as { taxaAm?: number; taxaMaxAm?: number; taxaMinAm?: number });
      setTaxaPct(((raw.taxaAm ?? raw.taxaMaxAm ?? raw.taxaMinAm ?? 0.0179)) * 100);
      setPrazoMaxMeses(t.prazoMaxMeses);
      setVigenciaInicio(t.vigenciaInicio);
      setVigenciaFim(t.vigenciaFim ?? "");
      setAtivo(t.ativo);
    } else if (convenios.data && !convenioId) {
      setConvenioId(convenios.data.convenios[0]?.id ?? "");
    }
  }, [existing.data, convenios.data, convenioId]);

  const convenioSelecionado = useMemo(() => convenios.data?.convenios.find((c) => c.id === convenioId), [convenios.data, convenioId]);
  const convenioNome = convenioSelecionado?.nome ?? "";
  /** Teto de parcelas definido pela prefeitura pro convenio selecionado.
   *  Banco nao pode ultrapassar — dropdown esconde opcoes acima e backend
   *  bloqueia com 422 se alguem burlar o UI. */
  const tetoPrefeitura = convenioSelecionado?.maxParcelas ?? 120;
  const opcoesPrazo = useMemo(() => [12, 24, 36, 48, 60, 72, 96, 120].filter((n) => n <= tetoPrefeitura), [tetoPrefeitura]);
  // Se o convenio mudou e o valor atual excede o teto novo, reduz automaticamente.
  useEffect(() => {
    if (prazoMaxMeses > tetoPrefeitura) setPrazoMaxMeses(tetoPrefeitura);
  }, [tetoPrefeitura, prazoMaxMeses]);

  const save = useMutation({
    mutationFn: () => {
      const body: BancoTabelaInput = {
        id,
        convenioId,
        convenio: convenioNome,
        taxaAm: Number((taxaPct / 100).toFixed(6)),
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
          <NumberField label="Taxa (% a.m.)" step={0.01} value={taxaPct} onChange={(e) => setTaxaPct(Number(e.target.value))} required hint="Taxa mensal única praticada nesta tabela. Vira o valor que o servidor simula." />
          {/* Prazo max fechado em opcoes fixas — filtradas pelo TETO DA
              PREFEITURA (convenio.maxParcelas). Servidor simulando so ve
              prazos ate esse teto. */}
          <SelectField
            label="Prazo max (meses)"
            value={String(prazoMaxMeses)}
            onChange={(e) => setPrazoMaxMeses(Number(e.target.value))}
            options={opcoesPrazo.map((n) => ({ value: String(n), label: `${n} meses` }))}
            hint={`Teto da prefeitura: ${tetoPrefeitura} meses. Nao e' possivel exceder esse limite.`}
            required
          />
          <TextField label="Vigência início" type="date" value={vigenciaInicio} onChange={(e) => setVigenciaInicio(e.target.value)} required />
          <TextField label="Vigência fim" type="date" value={vigenciaFim} onChange={(e) => setVigenciaFim(e.target.value)} hint="Opcional. Vazio = aberta" />
        </FormGrid>
      </section>

      {save.error ? (
        <div style={{ color: "var(--danger-500)", fontSize: 13, padding: 12, borderRadius: 8, background: "color-mix(in srgb, var(--danger-500) 8%, transparent)", border: "1px solid var(--danger-500)" }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {save.error instanceof Error ? save.error.message : "Erro ao salvar"}
          </div>
          {(() => {
            // Backend retorna motivos especificos em `details` (ex.: {prazoMaxMeses:
            // "excede teto da prefeitura"}). Antes so aparecia "Dados invalidos"
            // generico — usuario nao sabia o que corrigir.
            if (!(save.error instanceof ApiHttpError) || !save.error.details) return null;
            const d = save.error.details as Record<string, string>;
            return (
              <ul style={{ margin: "6px 0 0 18px", padding: 0, fontSize: 12 }}>
                {Object.entries(d).map(([campo, motivo]) => (
                  <li key={campo}><b>{campo}:</b> {String(motivo)}</li>
                ))}
              </ul>
            );
          })()}
        </div>
      ) : null}

      <FormActions>
        <Button variant="ghost" type="button" onClick={() => nav("/banco/cadastros/tabela-emprestimos")}>Cancelar</Button>
        <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
      </FormActions>
    </form>
  );
}
