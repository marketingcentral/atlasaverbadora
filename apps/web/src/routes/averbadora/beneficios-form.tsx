import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Card, TextField, TextareaField, CnpjField, CepField, TelefoneField } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type {
  AdminBeneficio, AdminBeneficioInput, CategoriaBeneficio,
  OrigemBeneficio, TipoDesconto, ModoUso, DestaqueBeneficio,
} from "@atlas/sdk";

// ============================================================
// Formulario COMPLETO de beneficio — todas as facetas que um admin de
// averbadora precisa cadastrar num beneficio pra servidor publico consignado.
//
// Estrutura em SECOES COLAPSAVEIS. Comeca com "Identificação" e "Desconto"
// abertas (obrigatorias). As demais o admin abre sob demanda.
// ============================================================

const CATEGORIAS: { id: CategoriaBeneficio; label: string; icone: string }[] = [
  { id: "saude", label: "Saúde", icone: "🩺" },
  { id: "telemedicina", label: "Telemedicina", icone: "📱" },
  { id: "farmacia", label: "Farmácia", icone: "💊" },
  { id: "supermercado", label: "Supermercado", icone: "🛒" },
  { id: "academia", label: "Academia", icone: "🏋️" },
  { id: "alimentacao", label: "Alimentação", icone: "🍽️" },
  { id: "educacao", label: "Educação", icone: "🎓" },
  { id: "lazer", label: "Lazer", icone: "🎭" },
];

const ORIGENS: { id: OrigemBeneficio; label: string; descricao: string }[] = [
  { id: "averbadora", label: "Averbadora", descricao: "Parceria negociada pela averbadora com comércio local." },
  { id: "banco", label: "Banco parceiro", descricao: "Via cartão consignado do banco." },
  { id: "prefeitura", label: "Prefeitura", descricao: "Benefício direto oferecido pela prefeitura ao servidor." },
  { id: "convenio", label: "Convênio", descricao: "Convênio médico/farmácia da prefeitura." },
];

const TIPOS_DESCONTO: { id: TipoDesconto; label: string }[] = [
  { id: "percentual", label: "Percentual (%)" },
  { id: "valor_fixo", label: "Valor fixo em R$" },
  { id: "preco_especial", label: "Preço especial" },
  { id: "gratuidade", label: "Gratuidade" },
];

const MODOS_USO: { id: ModoUso; label: string; descricao: string }[] = [
  { id: "cartao_consignado", label: "Cartão consignado", descricao: "Servidor paga com o cartão consignado." },
  { id: "matricula", label: "Matrícula", descricao: "Informa a matrícula no parceiro pra validar." },
  { id: "cpf", label: "CPF", descricao: "Só informa o CPF." },
  { id: "codigo", label: "Código promocional", descricao: "Usa um código exclusivo (ex: SERVIDOR2026)." },
  { id: "qr", label: "QR code", descricao: "Escaneia um QR no app do parceiro." },
];

const DESTAQUES: { id: DestaqueBeneficio; label: string; cor: string }[] = [
  { id: "novo", label: "Novo", cor: "var(--emerald-500)" },
  { id: "popular", label: "Popular", cor: "var(--accent)" },
  { id: "exclusivo", label: "Exclusivo", cor: "var(--gold-500)" },
  { id: "desconto_extra", label: "Desconto extra", cor: "var(--danger-500)" },
];

const CORES_SUGERIDAS = ["#dc2626", "#0891b2", "#f59e0b", "#c2410c", "#2563eb", "#7c3aed", "#059669", "#be185d"];

/** Emojis curados agrupados por contexto — cobre os principais tipos de
 *  beneficio pra servidor publico. Admin pode digitar/colar outro no campo
 *  livre abaixo do grid OU passar uma URL de icone customizado (SVG/PNG). */
const EMOJIS_POR_CATEGORIA: { grupo: string; emojis: string[] }[] = [
  { grupo: "Saúde", emojis: ["💊", "🩺", "💉", "🦷", "🩹", "🏥", "🧴", "🌡️", "❤️", "🧬", "👓", "🦴"] },
  { grupo: "Alimentação", emojis: ["🍽️", "🛒", "🥗", "🍔", "🥖", "☕", "🍕", "🍰", "🥩", "🍎", "🥑", "🧀"] },
  { grupo: "Educação", emojis: ["🎓", "📚", "✏️", "📖", "🏫", "💻", "🎒", "📝", "🔬", "🎨", "🌍", "🧮"] },
  { grupo: "Lazer & esporte", emojis: ["🎭", "🎬", "🏋️", "🎯", "🎮", "🎵", "🎪", "🎳", "🏖️", "⚽", "🏊", "🚴"] },
  { grupo: "Casa & serviços", emojis: ["🏠", "🛋️", "🛏️", "🚿", "🍳", "💡", "🔧", "🌱", "🧹", "🐾", "🎁", "📦"] },
  { grupo: "Mobilidade", emojis: ["🚗", "🚙", "🚕", "🚌", "🚲", "🏍️", "⛽", "🅿️", "✈️", "🛴", "🚆", "🚀"] },
  { grupo: "Financeiro & outros", emojis: ["💰", "💳", "🏦", "⭐", "✨", "💎", "🔥", "🎯", "🔔", "📱", "🎓", "🛡️"] },
];

const VINCULOS = ["CLT", "ESTATUTARIO", "COMISSIONADO", "APOSENTADO", "PENSIONISTA"];
const SITUACOES = ["ATIVO", "TRABALHANDO", "FERIAS", "AFASTADO", "LICENCA", "APOSENTADO"];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export function AdminBeneficiosForm() {
  const nav = useNavigate();
  const { id } = useParams(); // undefined = novo, string = editar
  const [sp] = useSearchParams();
  // ?categoria=telemedicina -> pre-marca a categoria no formulario (usado
  // pelo botao "+ Nova parceria" da tela /averbadora/telemedicina).
  const categoriaPreset = sp.get("categoria") as CategoriaBeneficio | null;

  const beneficiosQ = useQuery({ queryKey: ["admin", "beneficios"], queryFn: () => atlas.admin.beneficios.list() });
  const prefeiturasQ = useQuery({ queryKey: ["admin", "prefeituras"], queryFn: () => atlas.admin.listPrefeituras() });
  const conveniosQ = useQuery({ queryKey: ["admin", "convenios"], queryFn: () => atlas.admin.listConvenios() });

  const initial = useMemo<AdminBeneficio | null>(() => {
    if (!id) return null;
    return beneficiosQ.data?.beneficios.find((b) => b.id === id) ?? null;
  }, [id, beneficiosQ.data]);

  const [form, setForm] = useState<AdminBeneficioInput>({
    prefeituraId: 1,
    nome: "",
    categorias: categoriaPreset ? [categoriaPreset] : ["saude"],
    local: "",
    icone: categoriaPreset === "telemedicina" ? "📱" : "🎁",
    cor: "#059669",
    descontoLabel: "",
    descontoComplemento: "",
    origem: "averbadora",
    ativo: true,
  });
  useEffect(() => {
    if (initial) setForm(initial);
    else if (prefeiturasQ.data?.prefeituras[0]) setForm((f) => ({ ...f, prefeituraId: prefeiturasQ.data.prefeituras[0]!.id }));
  }, [initial, prefeiturasQ.data]);

  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => atlas.admin.beneficios.upsert({ ...form, id: initial?.id }),
    onSuccess: () => {
      nav("/averbadora/beneficios");
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Erro ao salvar"),
  });

  function set<K extends keyof AdminBeneficioInput>(key: K, valor: AdminBeneficioInput[K]): void {
    setForm((f) => ({ ...f, [key]: valor }));
  }

  function toggleArrayItem<T extends string | number>(list: T[] | undefined, item: T): T[] {
    const cur = list ?? [];
    return cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item];
  }

  const bancosQ = useQuery({ queryKey: ["admin", "bancos"], queryFn: () => atlas.admin.listBancos() });

  const prefeituras = prefeiturasQ.data?.prefeituras ?? [];
  const convenios = conveniosQ.data?.convenios ?? [];
  const bancosLista = bancosQ.data?.bancos ?? [];
  const conveniosDaPref = convenios.filter((cv) => cv.prefeituraId === form.prefeituraId);
  // Se origem=banco, restringe a lista de bancos aos que tem convenio nessa prefeitura
  // (evita cadastrar beneficio de banco que nem opera na cidade).
  const bancoIdsComConvenioNaPref = new Set(conveniosDaPref.map((cv) => cv.bancoId));
  const bancosParaEscolher = bancosLista.filter((b) => bancoIdsComConvenioNaPref.has(b.id));

  // Preview "onde vai aparecer pro servidor" — atualiza em tempo real com o form.
  const telasQueMostram = useMemo(() => {
    const telas: string[] = [];
    if (form.categorias.includes("saude")) telas.push("/servidor/beneficios (aba Saúde)");
    if (form.categorias.some((c) => c === "alimentacao" || c === "educacao" || c === "lazer")) {
      telas.push("/servidor/beneficios (aba Descontos e Benefícios)");
    }
    return telas;
  }, [form.categorias]);
  const prefeiturasAlvo = useMemo(() => {
    if (form.todasPrefeiturasParceiras) return prefeituras;
    const ids = [form.prefeituraId, ...(form.prefeituraIdsExtras ?? [])];
    return ids.map((id) => prefeituras.find((p) => p.id === id)).filter(Boolean) as { id: number; nome: string; uf: string }[];
  }, [form.prefeituraId, form.prefeituraIdsExtras, form.todasPrefeiturasParceiras, prefeituras]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <button
            type="button"
            onClick={() => nav("/averbadora/beneficios")}
            style={{
              background: "transparent", border: 0, color: "var(--text-muted)",
              fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 4,
            }}
          >
            ← Voltar
          </button>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", display: "block" }}>
            Averbadora
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>
            {initial ? `Editar: ${initial.nome}` : "Novo benefício"}
          </h1>
          <p style={{ color: "var(--text-muted)", margin: "6px 0 0", fontSize: 13, maxWidth: 660 }}>
            Cadastre todos os detalhes do parceiro. Só as seções <b>Identificação</b> e <b>Desconto</b> são obrigatórias — as demais dão contexto e melhoram a experiência do servidor.
          </p>
        </div>
      </header>

      {/* Preview de "onde vai aparecer" — sempre visivel no topo, ajuda o admin
          a saber exatamente o que a decisao dele faz aparecer pra o servidor. */}
      <Card style={{ borderColor: "var(--gold-500)", background: "color-mix(in srgb, var(--gold-500) 6%, var(--surface))" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.08em", fontWeight: 700, color: "var(--gold-500)", textTransform: "uppercase", marginBottom: 6 }}>
          Onde este benefício vai aparecer
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
          <li>
            <b style={{ color: "var(--text)" }}>Telas do servidor:</b>{" "}
            {telasQueMostram.length ? telasQueMostram.join(" e ") : <span style={{ color: "var(--text-dim)" }}>escolha ao menos uma categoria</span>}
          </li>
          <li>
            <b style={{ color: "var(--text)" }}>Prefeituras alvo:</b>{" "}
            {form.todasPrefeiturasParceiras ? (
              <>
                <b style={{ color: "var(--emerald-500)" }}>Todas as prefeituras parceiras</b>{" "}
                ({prefeiturasAlvo.length} atualmente + qualquer nova que for cadastrada)
              </>
            ) : (
              <>
                {prefeiturasAlvo.length ? prefeiturasAlvo.map((p) => `${p.nome}/${p.uf}`).join(", ") : "—"}
                {" "}<span style={{ color: "var(--text-dim)" }}>(servidores dessas prefeituras verão o benefício)</span>
              </>
            )}
          </li>
          {form.origem === "banco" ? (
            <li>
              <b style={{ color: "var(--text)" }}>Banco parceiro:</b>{" "}
              {form.bancoId
                ? (bancosLista.find((b) => b.id === form.bancoId)?.nome ?? `#${form.bancoId}`)
                : <span style={{ color: "var(--danger-500)" }}>escolha um banco na seção Identificação</span>}
              {" "}<span style={{ color: "var(--text-dim)" }}>(aparece como "oferecido por..." no card do servidor)</span>
            </li>
          ) : null}
          {form.origem === "convenio" ? (
            <li>
              <b style={{ color: "var(--text)" }}>Convênio:</b>{" "}
              {form.convenioId
                ? (conveniosDaPref.find((cv) => cv.id === form.convenioId)?.nome ?? form.convenioId)
                : <span style={{ color: "var(--danger-500)" }}>escolha um convênio na seção Identificação</span>}
            </li>
          ) : null}
          {form.origem === "prefeitura" ? (
            <li>
              <b style={{ color: "var(--text)" }}>Direto da prefeitura</b>{" "}
              <span style={{ color: "var(--text-dim)" }}>(não vinculado a banco/convênio específico)</span>
            </li>
          ) : null}
          {form.origem === "averbadora" ? (
            <li>
              <b style={{ color: "var(--text)" }}>Direto da averbadora</b>{" "}
              <span style={{ color: "var(--text-dim)" }}>(parceria negociada com comércio local, sem vínculo a banco)</span>
            </li>
          ) : null}
          {!(form.ativo ?? true) ? (
            <li style={{ color: "var(--gold-500)" }}>
              <b>Não vai aparecer ainda</b> — está como rascunho (checkbox "Publicar" no fim está desmarcado).
            </li>
          ) : null}
        </ul>
      </Card>

      {/* ============ 1. IDENTIFICACAO ============ */}
      <Secao titulo="Identificação" descricao="Nome, categoria e visual do card." icone="🏷️" defaultOpen>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TextField label="Nome do parceiro" value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex.: Farmácia São João" />
          <CnpjField label="CNPJ (opcional)" value={form.cnpj ?? ""} onChange={(e) => set("cnpj", e.target.value)} />
        </div>

        <TextField label="Descrição curta (aparece no card)" value={form.descricaoCurta ?? ""} onChange={(e) => set("descricaoCurta", e.target.value)} placeholder="Ex.: Rede de farmácias com atendimento 24h em Palhoça" maxLength={280} />

        <FieldGroup label="Categorias *">
          {CATEGORIAS.map((c) => {
            const on = form.categorias.includes(c.id);
            return (
              <Chip key={c.id} on={on} onClick={() => set("categorias", toggleArrayItem(form.categorias, c.id) as CategoriaBeneficio[])}>
                {c.icone} {c.label}
              </Chip>
            );
          })}
        </FieldGroup>

        <FieldGroup label="Origem *">
          {ORIGENS.map((o) => (
            <OpcaoRadio
              key={o.id}
              on={form.origem === o.id}
              titulo={o.label}
              descricao={o.descricao}
              onClick={() => {
                // Ao trocar de origem, limpa vinculo que nao faz mais sentido.
                setForm((f) => ({
                  ...f,
                  origem: o.id,
                  bancoId: o.id === "banco" ? f.bancoId : undefined,
                  convenioId: o.id === "convenio" ? f.convenioId : undefined,
                }));
              }}
            />
          ))}
        </FieldGroup>

        {form.origem === "banco" ? (
          <div>
            <div style={fieldLabelStyle}>
              Qual banco parceiro oferece? *
              <span style={{ color: "var(--text-dim)", marginLeft: 6, fontWeight: 400 }}>
                (aparece como "oferecido por..." no card do servidor)
              </span>
            </div>
            <select
              value={form.bancoId ?? ""}
              onChange={(e) => set("bancoId", e.target.value ? Number(e.target.value) : undefined)}
              style={selectStyle}
            >
              <option value="">— escolha um banco —</option>
              {bancosParaEscolher.length === 0 ? (
                <option disabled>Nenhum banco tem convênio nesta prefeitura</option>
              ) : bancosParaEscolher.map((b) => (
                <option key={b.id} value={b.id}>{b.nome}</option>
              ))}
            </select>
            {bancosParaEscolher.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--danger-500)", marginTop: 6 }}>
                Nenhum banco tem convênio ativo na prefeitura selecionada. Cadastre o convênio antes.
              </div>
            ) : null}
          </div>
        ) : null}

        {form.origem === "convenio" ? (
          <div>
            <div style={fieldLabelStyle}>
              Qual convênio da prefeitura oferece? *
            </div>
            <select
              value={form.convenioId ?? ""}
              onChange={(e) => set("convenioId", e.target.value || undefined)}
              style={selectStyle}
            >
              <option value="">— escolha um convênio —</option>
              {conveniosDaPref.length === 0 ? (
                <option disabled>Nenhum convênio nesta prefeitura</option>
              ) : conveniosDaPref.map((cv) => (
                <option key={cv.id} value={cv.id}>{cv.nome}</option>
              ))}
            </select>
          </div>
        ) : null}

        <SeletorIcone valor={form.icone} onChange={(v) => set("icone", v)} corDestaque={form.cor} />

        <div>
          <div style={fieldLabelStyle}>Cor de destaque</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {CORES_SUGERIDAS.map((cor) => (
              <button
                key={cor}
                type="button"
                onClick={() => set("cor", cor)}
                aria-label={`Cor ${cor}`}
                style={{
                  width: 32, height: 32, borderRadius: 6, background: cor,
                  border: form.cor === cor ? "3px solid var(--text)" : "1px solid var(--border)",
                  cursor: "pointer",
                }}
              />
            ))}
            <input
              type="color"
              value={form.cor}
              onChange={(e) => set("cor", e.target.value)}
              style={{ width: 32, height: 32, cursor: "pointer", background: "transparent", border: "1px solid var(--border-strong)", borderRadius: 6 }}
              title="Cor personalizada"
            />
          </div>
        </div>

        <TextField
          label="Logo (URL da imagem — opcional)"
          value={form.logoUrl ?? ""}
          onChange={(e) => set("logoUrl", e.target.value)}
          placeholder="https://..."
        />

        <FieldGroup label="Destaque (opcional — vira badge no card)">
          <Chip on={!form.destaque} onClick={() => set("destaque", undefined)}>Nenhum</Chip>
          {DESTAQUES.map((d) => (
            <Chip key={d.id} on={form.destaque === d.id} onClick={() => set("destaque", d.id)}>
              {d.label}
            </Chip>
          ))}
        </FieldGroup>
      </Secao>

      {/* ============ 1B. IMAGENS ============ */}
      <Secao titulo="Imagens do parceiro" descricao="Imagem estática única OU carrossel de várias — aparecem no card do servidor." icone="🖼️">
        <FieldGroup label="Modo de exibição">
          <Chip on={(form.modoImagens ?? "nenhum") === "nenhum"} onClick={() => set("modoImagens", "nenhum")}>Sem imagem (só ícone)</Chip>
          <Chip on={form.modoImagens === "unica"} onClick={() => setForm((f) => ({ ...f, modoImagens: "unica", imagens: f.imagens?.slice(0, 1) ?? [] }))}>Imagem única</Chip>
          <Chip on={form.modoImagens === "carrossel"} onClick={() => set("modoImagens", "carrossel")}>Carrossel</Chip>
        </FieldGroup>

        {form.modoImagens && form.modoImagens !== "nenhum" ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(form.imagens ?? []).map((url, idx) => (
                <div key={idx} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: 8,
                    border: "1px solid var(--border-strong)", background: "var(--bg-elev-2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden", flexShrink: 0,
                  }}>
                    {url ? (
                      <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    ) : <span style={{ fontSize: 24, color: "var(--text-dim)" }}>🖼️</span>}
                  </div>
                  <TextField
                    label=""
                    value={url}
                    onChange={(e) => {
                      const novas = [...(form.imagens ?? [])];
                      novas[idx] = e.target.value;
                      set("imagens", novas);
                    }}
                    placeholder="https://exemplo.com/foto.jpg"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => set("imagens", (form.imagens ?? []).filter((_, i) => i !== idx))}
                    style={{
                      padding: "8px 12px", borderRadius: 8,
                      border: "1px solid var(--danger-500)", background: "transparent",
                      color: "var(--danger-500)", cursor: "pointer", fontSize: 13,
                    }}
                  >
                    Remover
                  </button>
                </div>
              ))}
              {form.modoImagens === "carrossel" || !(form.imagens?.length) ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={form.modoImagens === "unica" && (form.imagens?.length ?? 0) >= 1}
                  onClick={() => set("imagens", [...(form.imagens ?? []), ""])}
                >
                  + Adicionar imagem
                </Button>
              ) : null}
            </div>
            {form.modoImagens === "unica" ? (
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                Modo "única" — só 1 imagem permitida. Troque pra "carrossel" pra usar mais.
              </div>
            ) : null}
          </>
        ) : null}
      </Secao>

      {/* ============ 1C. LINK DE ACESSO ============ */}
      <Secao titulo="Botão de acesso" descricao="Botão que leva o servidor pro site ou app do parceiro (deep-link)." icone="🔗">
        <TextField
          label="URL de destino"
          value={form.linkAcesso?.url ?? ""}
          onChange={(e) => set("linkAcesso", e.target.value ? { url: e.target.value, textoBotao: form.linkAcesso?.textoBotao } : undefined)}
          placeholder="https://parceiro.com/promo ou app://..."
        />
        <TextField
          label="Texto do botão (opcional — default: 'Acessar')"
          value={form.linkAcesso?.textoBotao ?? ""}
          onChange={(e) => set("linkAcesso", form.linkAcesso ? { ...form.linkAcesso, textoBotao: e.target.value || undefined } : undefined)}
          placeholder="Ex.: Agendar consulta, Ver cardápio, Baixar app"
          disabled={!form.linkAcesso?.url}
          maxLength={40}
        />
      </Secao>

      {/* ============ 2. DESCONTO ============ */}
      <Secao titulo="Desconto e vantagem" descricao="O que o servidor ganha usando o benefício." icone="💰" defaultOpen>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TextField label="Título do desconto (aparece no card)" value={form.descontoLabel} onChange={(e) => set("descontoLabel", e.target.value)} placeholder="Ex.: 10% desconto" />
          <TextField label="Complemento" value={form.descontoComplemento} onChange={(e) => set("descontoComplemento", e.target.value)} placeholder="Ex.: em medicamentos" />
        </div>

        <FieldGroup label="Tipo de desconto">
          {TIPOS_DESCONTO.map((t) => (
            <Chip
              key={t.id}
              on={(form.desconto?.tipo ?? "percentual") === t.id}
              onClick={() => set("desconto", { ...(form.desconto ?? {}), tipo: t.id })}
            >
              {t.label}
            </Chip>
          ))}
        </FieldGroup>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <TextField
            label={form.desconto?.tipo === "percentual" ? "Percentual (%)" : "Valor (R$)"}
            type="number"
            value={form.desconto?.valor != null ? String(form.desconto.valor) : ""}
            onChange={(e) => set("desconto", { ...(form.desconto ?? { tipo: "percentual" }), valor: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Ex.: 10"
            disabled={form.desconto?.tipo === "gratuidade"}
          />
          <TextField
            label="Limite mensal por servidor (R$)"
            type="number"
            value={form.desconto?.limiteMensal != null ? String(form.desconto.limiteMensal) : ""}
            onChange={(e) => set("desconto", { ...(form.desconto ?? { tipo: "percentual" }), limiteMensal: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Opcional"
          />
          <TextField
            label="Comissão da averbadora (%)"
            type="number"
            value={form.comissaoPct != null ? String(form.comissaoPct) : ""}
            onChange={(e) => set("comissaoPct", e.target.value ? Number(e.target.value) : undefined)}
            placeholder="Ex.: 2.5"
          />
        </div>

        <TextField
          label="Aplicável em"
          value={form.desconto?.aplicavelEm ?? ""}
          onChange={(e) => set("desconto", { ...(form.desconto ?? { tipo: "percentual" }), aplicavelEm: e.target.value })}
          placeholder="Ex.: medicamentos genéricos, todo o cardápio, matrículas novas"
        />

        <label style={checkboxLabel}>
          <input
            type="checkbox"
            checked={form.desconto?.cumulativo ?? false}
            onChange={(e) => set("desconto", { ...(form.desconto ?? { tipo: "percentual" }), cumulativo: e.target.checked })}
          />
          Cumulativo com outros descontos
        </label>

        <TextareaField
          label="Restrições (texto livre)"
          value={form.restricoes ?? ""}
          onChange={(e) => set("restricoes", e.target.value)}
          placeholder="Ex.: Não válido em produtos em promoção. Máx. 1 uso por dia."
          rows={3}
        />

        <TextField
          label="Compromisso mínimo (meses)"
          type="number"
          value={form.duracaoMinimaMeses ?? 0}
          onChange={(e) => set("duracaoMinimaMeses", Math.max(0, Number(e.target.value) || 0))}
          hint="0 = sem compromisso (cancelável a qualquer momento). Telemedicina padrão = 12."
        />
      </Secao>

      {/* ============ 3. ENDERECO E CONTATO ============ */}
      <Secao titulo="Endereço e contato" descricao="Onde e como o servidor encontra o parceiro." icone="📍">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr 1fr", gap: 12 }}>
          <CepField label="CEP" value={form.endereco?.cep ?? ""} onChange={(e) => set("endereco", { ...form.endereco, cep: e.target.value })} />
          <TextField label="Logradouro" value={form.endereco?.logradouro ?? ""} onChange={(e) => set("endereco", { ...form.endereco, logradouro: e.target.value })} placeholder="Rua Principal" />
          <TextField label="Número" value={form.endereco?.numero ?? ""} onChange={(e) => set("endereco", { ...form.endereco, numero: e.target.value })} placeholder="123" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TextField label="Complemento" value={form.endereco?.complemento ?? ""} onChange={(e) => set("endereco", { ...form.endereco, complemento: e.target.value })} placeholder="Sala 4" />
          <TextField label="Bairro" value={form.endereco?.bairro ?? ""} onChange={(e) => set("endereco", { ...form.endereco, bairro: e.target.value })} placeholder="Centro" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 12 }}>
          <TextField label="Cidade" value={form.endereco?.cidade ?? ""} onChange={(e) => set("endereco", { ...form.endereco, cidade: e.target.value })} placeholder="Palhoça" />
          <div>
            <div style={fieldLabelStyle}>UF</div>
            <select value={form.endereco?.uf ?? ""} onChange={(e) => set("endereco", { ...form.endereco, uf: e.target.value })} style={selectStyle}>
              <option value="">—</option>
              {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <TextField label="Local (bairro/cidade que aparece no card)" value={form.local} onChange={(e) => set("local", e.target.value)} placeholder="Ex.: Palhoça Centro" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TelefoneField label="Telefone" value={form.contato?.telefone ?? ""} onChange={(e) => set("contato", { ...form.contato, telefone: e.target.value })} />
          <TextField label="WhatsApp" value={form.contato?.whatsapp ?? ""} onChange={(e) => set("contato", { ...form.contato, whatsapp: e.target.value })} placeholder="(48) 99999-9999" />
          <TextField label="E-mail" type="email" value={form.contato?.email ?? ""} onChange={(e) => set("contato", { ...form.contato, email: e.target.value })} placeholder="contato@parceiro.com" />
          <TextField label="Site" value={form.contato?.site ?? ""} onChange={(e) => set("contato", { ...form.contato, site: e.target.value })} placeholder="https://..." />
          <TextField label="Instagram" value={form.contato?.instagram ?? ""} onChange={(e) => set("contato", { ...form.contato, instagram: e.target.value })} placeholder="@parceiro" />
        </div>
      </Secao>

      {/* ============ 4. COMO O SERVIDOR USA ============ */}
      <Secao titulo="Como o servidor usa" descricao="Como o servidor comprova o benefício no parceiro." icone="🎫">
        <FieldGroup label="Modo de identificação">
          {MODOS_USO.map((m) => (
            <OpcaoRadio
              key={m.id}
              on={form.comoUsar?.modo === m.id}
              titulo={m.label}
              descricao={m.descricao}
              onClick={() => set("comoUsar", { ...(form.comoUsar ?? {}), modo: m.id })}
            />
          ))}
        </FieldGroup>

        {form.comoUsar?.modo === "codigo" ? (
          <TextField
            label="Código promocional *"
            value={form.comoUsar?.codigoPromocional ?? ""}
            onChange={(e) => set("comoUsar", { ...(form.comoUsar ?? { modo: "codigo" }), codigoPromocional: e.target.value.toUpperCase() })}
            placeholder="SERVIDOR2026"
          />
        ) : null}

        <TextareaField
          label="Instruções pro servidor"
          value={form.comoUsar?.instrucoes ?? ""}
          onChange={(e) => set("comoUsar", { ...(form.comoUsar ?? { modo: "cartao_consignado" }), instrucoes: e.target.value })}
          placeholder="Ex.: Chegue com sua matrícula em mãos. Peça a promoção 'Servidor Atlas' no caixa."
          rows={3}
        />
      </Secao>

      {/* ============ 5. PUBLICO-ALVO ============ */}
      <Secao titulo="Público-alvo" descricao="Deixe vazio pra atingir todos os elegíveis desta prefeitura." icone="🎯">
        <FieldGroup label="Convênios elegíveis">
          {conveniosDaPref.length === 0 ? (
            <span style={{ color: "var(--text-dim)", fontSize: 13 }}>Nenhum convênio nesta prefeitura.</span>
          ) : conveniosDaPref.map((cv) => {
            const on = form.filtro?.convenioIds?.includes(cv.id) ?? false;
            return (
              <Chip key={cv.id} on={on} onClick={() => set("filtro", { ...form.filtro, convenioIds: toggleArrayItem(form.filtro?.convenioIds, cv.id) as string[] })}>
                {cv.nome}
              </Chip>
            );
          })}
        </FieldGroup>

        <FieldGroup label="Vínculos">
          {VINCULOS.map((v) => {
            const on = form.filtro?.vinculos?.includes(v) ?? false;
            return (
              <Chip key={v} on={on} onClick={() => set("filtro", { ...form.filtro, vinculos: toggleArrayItem(form.filtro?.vinculos, v) as string[] })}>
                {v}
              </Chip>
            );
          })}
        </FieldGroup>

        <FieldGroup label="Situação funcional">
          {SITUACOES.map((s) => {
            const on = form.filtro?.situacaoFuncional?.includes(s) ?? false;
            return (
              <Chip key={s} on={on} onClick={() => set("filtro", { ...form.filtro, situacaoFuncional: toggleArrayItem(form.filtro?.situacaoFuncional, s) as string[] })}>
                {s}
              </Chip>
            );
          })}
        </FieldGroup>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
          <TextField label="Salário mín. (R$)" type="number" value={form.filtro?.salarioMin != null ? String(form.filtro.salarioMin) : ""} onChange={(e) => set("filtro", { ...form.filtro, salarioMin: e.target.value ? Number(e.target.value) : undefined })} />
          <TextField label="Salário máx. (R$)" type="number" value={form.filtro?.salarioMax != null ? String(form.filtro.salarioMax) : ""} onChange={(e) => set("filtro", { ...form.filtro, salarioMax: e.target.value ? Number(e.target.value) : undefined })} />
          <TextField label="Idade mín." type="number" value={form.filtro?.idadeMin != null ? String(form.filtro.idadeMin) : ""} onChange={(e) => set("filtro", { ...form.filtro, idadeMin: e.target.value ? Number(e.target.value) : undefined })} />
          <TextField label="Idade máx." type="number" value={form.filtro?.idadeMax != null ? String(form.filtro.idadeMax) : ""} onChange={(e) => set("filtro", { ...form.filtro, idadeMax: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
      </Secao>

      {/* ============ 6. VIGENCIA E HORARIOS ============ */}
      <Secao titulo="Vigência e horários" descricao="Quando o benefício vale." icone="🕒">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TextField label="Início" type="date" value={form.vigencia?.inicio ?? ""} onChange={(e) => set("vigencia", { ...form.vigencia, inicio: e.target.value })} />
          <TextField label="Fim (opcional — sem fim = permanente)" type="date" value={form.vigencia?.fim ?? ""} onChange={(e) => set("vigencia", { ...form.vigencia, fim: e.target.value })} />
        </div>

        <FieldGroup label="Dias da semana permitidos">
          {DIAS_SEMANA.map((d, idx) => {
            const on = form.vigencia?.diasSemana?.includes(idx) ?? false;
            return (
              <Chip key={idx} on={on} onClick={() => set("vigencia", { ...form.vigencia, diasSemana: toggleArrayItem(form.vigencia?.diasSemana, idx) as number[] })}>
                {d}
              </Chip>
            );
          })}
        </FieldGroup>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TextField label="Hora início" type="time" value={form.vigencia?.horaInicio ?? ""} onChange={(e) => set("vigencia", { ...form.vigencia, horaInicio: e.target.value })} />
          <TextField label="Hora fim" type="time" value={form.vigencia?.horaFim ?? ""} onChange={(e) => set("vigencia", { ...form.vigencia, horaFim: e.target.value })} />
        </div>
      </Secao>

      {/* ============ 7. PREFEITURA(S) ============ */}
      <Secao titulo="Prefeitura(s)" descricao="Onde o benefício aparece pros servidores." icone="🏛️" defaultOpen>
        {/* Modo de abrangencia: so principal / todas as parceiras / algumas escolhidas.
            "Todas" persiste como flag no backend — se novas prefeituras entrarem,
            o beneficio automaticamente aparece pra elas tambem. */}
        <FieldGroup label="Onde este benefício aparece">
          <OpcaoRadio
            on={!form.todasPrefeiturasParceiras && (!form.prefeituraIdsExtras || form.prefeituraIdsExtras.length === 0)}
            titulo="Só a prefeitura principal"
            descricao="Aparece apenas para servidores da prefeitura selecionada abaixo."
            onClick={() => setForm((f) => ({ ...f, todasPrefeiturasParceiras: false, prefeituraIdsExtras: [] }))}
          />
          <OpcaoRadio
            on={!!form.todasPrefeiturasParceiras}
            titulo="Todas as prefeituras parceiras"
            descricao="Aparece para servidores de todas as prefeituras — incluindo novas que forem cadastradas depois."
            onClick={() => setForm((f) => ({ ...f, todasPrefeiturasParceiras: true, prefeituraIdsExtras: undefined }))}
          />
          <OpcaoRadio
            on={!form.todasPrefeiturasParceiras && (form.prefeituraIdsExtras?.length ?? 0) > 0}
            titulo="Escolher prefeituras específicas"
            descricao="Marque abaixo apenas as prefeituras onde este benefício vai aparecer."
            onClick={() => setForm((f) => ({ ...f, todasPrefeiturasParceiras: false, prefeituraIdsExtras: f.prefeituraIdsExtras?.length ? f.prefeituraIdsExtras : [] }))}
          />
        </FieldGroup>

        <div>
          <div style={fieldLabelStyle}>Prefeitura principal *</div>
          <select
            value={form.prefeituraId}
            onChange={(e) => {
              const novoId = Number(e.target.value);
              // Ao trocar de prefeitura, limpa bancoId/convenioId — os antigos
              // podem nao existir na nova prefeitura.
              setForm((f) => ({
                ...f,
                prefeituraId: novoId,
                bancoId: undefined,
                convenioId: undefined,
                prefeituraIdsExtras: f.prefeituraIdsExtras?.filter((id) => id !== novoId),
              }));
            }}
            style={selectStyle}
          >
            {prefeituras.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}/{p.uf}</option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
            {form.todasPrefeiturasParceiras
              ? "No modo \"todas\" a prefeitura principal serve como fallback (ex: para o campo Local no card)."
              : "A prefeitura principal filtra também os bancos e convênios disponíveis nas outras seções."}
          </div>
        </div>

        {/* So mostra chips no modo "Escolher especificas". No "todas" ficam
            escondidos pra nao dar impressao errada. */}
        {!form.todasPrefeiturasParceiras && (form.prefeituraIdsExtras !== undefined) ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={fieldLabelStyle}>Prefeituras adicionais</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => set("prefeituraIdsExtras", prefeituras.filter((p) => p.id !== form.prefeituraId).map((p) => p.id))}
                  style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px", fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}
                >
                  Marcar todas
                </button>
                <button
                  type="button"
                  onClick={() => set("prefeituraIdsExtras", [])}
                  style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px", fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}
                >
                  Limpar
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {prefeituras.filter((p) => p.id !== form.prefeituraId).length === 0 ? (
                <span style={{ color: "var(--text-dim)", fontSize: 13 }}>Só há uma prefeitura cadastrada.</span>
              ) : prefeituras.filter((p) => p.id !== form.prefeituraId).map((p) => {
                const on = form.prefeituraIdsExtras?.includes(p.id) ?? false;
                return (
                  <Chip key={p.id} on={on} onClick={() => set("prefeituraIdsExtras", toggleArrayItem(form.prefeituraIdsExtras, p.id) as number[])}>
                    {p.nome}/{p.uf}
                  </Chip>
                );
              })}
            </div>
          </>
        ) : null}
      </Secao>

      {/* ============ 8. DESCRICAO LONGA / MARKETING ============ */}
      <Secao titulo="Descrição completa" descricao="Aparece na tela de detalhes do benefício no app do servidor." icone="📝">
        <TextareaField
          label="Descrição longa"
          value={form.descricaoLonga ?? ""}
          onChange={(e) => set("descricaoLonga", e.target.value)}
          placeholder="Ex.: A Farmácia São João é uma rede de farmácias com atendimento 24h nas 3 unidades de Palhoça..."
          rows={6}
          maxLength={4000}
        />
      </Secao>

      {/* ============ 9. RESPONSAVEL ============ */}
      <Secao titulo="Contato do responsável na parceira" descricao="Interno — só a averbadora vê." icone="👤">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TextField label="Nome" value={form.responsavel?.nome ?? ""} onChange={(e) => set("responsavel", { ...form.responsavel, nome: e.target.value })} placeholder="Maria Silva" />
          <TextField label="Cargo" value={form.responsavel?.cargo ?? ""} onChange={(e) => set("responsavel", { ...form.responsavel, cargo: e.target.value })} placeholder="Diretora Comercial" />
          <TextField label="E-mail" type="email" value={form.responsavel?.email ?? ""} onChange={(e) => set("responsavel", { ...form.responsavel, email: e.target.value })} />
          <TelefoneField label="Telefone" value={form.responsavel?.telefone ?? ""} onChange={(e) => set("responsavel", { ...form.responsavel, telefone: e.target.value })} />
        </div>
      </Secao>

      {/* ============ 10. NOTAS INTERNAS ============ */}
      <Secao titulo="Notas internas" descricao="Só a averbadora vê. Ideal pra registrar detalhes de negociação, prazos, etc." icone="📌">
        <TextareaField
          label="Notas internas"
          value={form.notasInternas ?? ""}
          onChange={(e) => set("notasInternas", e.target.value)}
          placeholder="Ex.: Contrato renovado até 12/2026. Comissão negociada com o Ricardo em jun/26."
          rows={4}
          maxLength={2000}
        />
      </Secao>

      {/* ============ Publicar + Salvar ============ */}
      <Card style={{ position: "sticky", bottom: 16, borderColor: "var(--gold-500)", zIndex: 10 }}>
        <label style={checkboxLabel}>
          <input type="checkbox" checked={form.ativo ?? true} onChange={(e) => set("ativo", e.target.checked)} />
          <div>
            <b>Publicar imediatamente</b> (aparece para os servidores da prefeitura selecionada)
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              Você pode salvar como rascunho desmarcando esta opção e ativar depois na tela de lista.
            </div>
          </div>
        </label>

        {error ? (
          <div style={{ color: "var(--danger-500)", fontSize: 13, marginTop: 12 }}>{error}</div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <Button variant="ghost" onClick={() => nav("/averbadora/beneficios")}>Cancelar</Button>
          <Button
            // Modo teste — todos os campos sao opcionais. So bloqueia enquanto
            // a mutation esta em voo pra evitar double-submit.
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Salvando..." : (initial ? "Salvar alterações" : "Criar benefício")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// UI helpers — reusaveis nesta tela
// ============================================================

function Secao({
  titulo, descricao, icone, defaultOpen, children,
}: {
  titulo: string; descricao?: string; icone?: string;
  defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <Card style={{ padding: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", padding: "16px 20px", background: "transparent", border: 0, textAlign: "left",
          display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
        }}
      >
        {icone ? <span style={{ fontSize: 20 }}>{icone}</span> : null}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{titulo}</div>
          {descricao ? <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{descricao}</div> : null}
        </div>
        <span style={{ fontSize: 18, color: "var(--text-muted)" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open ? (
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid var(--border)" }}>
          <div style={{ height: 6 }} />
          {children}
        </div>
      ) : null}
    </Card>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={fieldLabelStyle}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>
    </div>
  );
}

/** Seletor de icone: grid de emojis por categoria com abas + preview do card
 *  + input opcional pra URL de imagem/SVG customizado.
 *  - Emoji: string curta (ex.: "💊")
 *  - URL: precisa comecar com http(s):// — o card do servidor detecta e mostra img.
 */
function SeletorIcone({ valor, onChange, corDestaque }: { valor: string; onChange: (v: string) => void; corDestaque: string }) {
  const [aba, setAba] = useState<string>(EMOJIS_POR_CATEGORIA[0]!.grupo);
  const [modoUrl, setModoUrl] = useState(valor.startsWith("http"));
  const gruposComEmojis = EMOJIS_POR_CATEGORIA;

  function corBg(): string {
    return `color-mix(in srgb, ${corDestaque} 15%, transparent)`;
  }
  function isUrl(v: string): boolean {
    return v.startsWith("http://") || v.startsWith("https://");
  }

  return (
    <div>
      <div style={{ ...fieldLabelStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Ícone</span>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            type="button"
            onClick={() => setModoUrl(false)}
            style={miniTabStyle(!modoUrl)}
          >
            Emoji
          </button>
          <button
            type="button"
            onClick={() => setModoUrl(true)}
            style={miniTabStyle(modoUrl)}
          >
            Imagem (URL)
          </button>
        </div>
      </div>

      {/* Preview + entrada livre */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 12,
          background: corBg(),
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28,
          border: "1px solid var(--border-strong)",
          flexShrink: 0, overflow: "hidden",
        }}>
          {isUrl(valor)
            ? <img src={valor} alt="preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            : (valor || "🎁")}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            type="text"
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            placeholder={modoUrl ? "https://exemplo.com/icone.svg" : "Ou cole outro emoji aqui (ex.: 🎯)"}
            style={{ ...selectStyle, fontSize: modoUrl ? 13 : 20, textAlign: modoUrl ? "left" : "center" }}
          />
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
            {modoUrl
              ? "Cole a URL de um SVG ou PNG. Vira o ícone do card no app do servidor."
              : "Escolha um dos emojis abaixo ou cole/digite outro no campo."}
          </div>
        </div>
      </div>

      {/* Grid de emojis (só no modo Emoji) */}
      {!modoUrl ? (
        <div style={{
          border: "1px solid var(--border)", borderRadius: 10, padding: 8,
          background: "var(--bg-elev-2)",
        }}>
          {/* Abas por categoria */}
          <div style={{ display: "flex", gap: 4, marginBottom: 8, overflowX: "auto", paddingBottom: 4 }}>
            {gruposComEmojis.map((g) => (
              <button
                key={g.grupo}
                type="button"
                onClick={() => setAba(g.grupo)}
                style={{
                  padding: "5px 10px", borderRadius: 8, whiteSpace: "nowrap",
                  border: `1px solid ${aba === g.grupo ? "var(--emerald-500)" : "transparent"}`,
                  background: aba === g.grupo ? "color-mix(in srgb, var(--emerald-500) 12%, transparent)" : "transparent",
                  color: aba === g.grupo ? "var(--text)" : "var(--text-muted)",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                {g.grupo}
              </button>
            ))}
          </div>

          {/* Grid da aba ativa */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))",
            gap: 4,
          }}>
            {(gruposComEmojis.find((g) => g.grupo === aba)?.emojis ?? []).map((e) => {
              const on = valor === e;
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => onChange(e)}
                  style={{
                    aspectRatio: "1", borderRadius: 8,
                    border: on ? "2px solid var(--emerald-500)" : "1px solid var(--border)",
                    background: on ? "color-mix(in srgb, var(--emerald-500) 15%, transparent)" : "var(--surface)",
                    fontSize: 22, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {e}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function miniTabStyle(active: boolean): React.CSSProperties {
  return {
    padding: "4px 10px", borderRadius: 6,
    border: `1px solid ${active ? "var(--emerald-500)" : "var(--border)"}`,
    background: active ? "color-mix(in srgb, var(--emerald-500) 12%, transparent)" : "transparent",
    color: active ? "var(--text)" : "var(--text-muted)",
    fontSize: 11, fontWeight: 600, cursor: "pointer",
  };
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 12px", borderRadius: 999, border: "1px solid",
        borderColor: on ? "var(--emerald-500)" : "var(--border-strong)",
        background: on ? "var(--emerald-500)" : "transparent",
        color: on ? "var(--navy-900)" : "var(--text)",
        cursor: "pointer", fontSize: 13, fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

function OpcaoRadio({
  on, titulo, descricao, onClick,
}: {
  on: boolean; titulo: string; descricao?: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: "1 1 220px",
        minWidth: 200,
        textAlign: "left",
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid",
        borderColor: on ? "var(--emerald-500)" : "var(--border-strong)",
        background: on ? "color-mix(in srgb, var(--emerald-500) 10%, transparent)" : "transparent",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{titulo}</div>
      {descricao ? <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.4 }}>{descricao}</div> : null}
    </button>
  );
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-muted)",
  marginBottom: 6,
  fontWeight: 600,
};

const selectStyle: React.CSSProperties = {
  padding: "10px 12px", borderRadius: 10,
  border: "1px solid var(--border-strong)",
  background: "var(--bg)", color: "var(--text)",
  fontSize: 14, fontFamily: "inherit",
  boxSizing: "border-box", width: "100%", cursor: "pointer",
};

const checkboxLabel: React.CSSProperties = {
  display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--text-muted)",
  cursor: "pointer",
};
