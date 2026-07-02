import { Card, Pill } from "@atlas/ui/web";
import { BackLink, PageHeader } from "./_ui";
import { buildSimplePdf, downloadPdf } from "../../lib/pdf";

interface Material {
  id: string;
  titulo: string;
  descricao: string;
  categoria: "cartilha" | "banner" | "email" | "checklist";
  arquivo: () => Uint8Array;
  filename: string;
}

const CATEGORIA_LABEL: Record<Material["categoria"], string> = {
  cartilha: "Cartilha",
  banner: "Banner",
  email: "E-mail modelo",
  checklist: "Checklist",
};

const MATERIAIS: Material[] = [
  {
    id: "MAT-1",
    titulo: "Cartilha do servidor — App Atlas",
    descricao: "Explicacao passo-a-passo pro servidor: como se cadastrar, consultar margem, simular e aceitar ofertas pre-aprovadas.",
    categoria: "cartilha",
    filename: "cartilha-servidor-atlas.pdf",
    arquivo: () =>
      buildSimplePdf("CARTILHA DO SERVIDOR — APP ATLAS", [
        { text: "Como comecar", bold: true },
        "1. Baixe o app Atlas na Play Store ou App Store.",
        "2. Cadastre-se com seu CPF, matricula e um e-mail valido.",
        "3. Confirme o codigo enviado por e-mail (2FA).",
        "",
        { text: "O que o app entrega", bold: true },
        "- Consulta em tempo real da sua margem consignavel.",
        "- Ofertas pre-aprovadas dos bancos parceiros.",
        "- Simulacao de emprestimo, portabilidade e refin.",
        "- Assinatura eletronica do contrato (CCB) no proprio app.",
        "- Historico de propostas, contratos ativos e ADFs.",
        "",
        { text: "Duvidas comuns", bold: true },
        "- Trabalho em duas prefeituras: sim, o app suporta duas matriculas.",
        "- Perdi a senha: use 'Esqueci minha senha' na tela de login.",
        "- O banco recusou: veja o motivo em Minhas Propostas.",
        "",
        "Contato: suporte@atlas.io",
      ]),
  },
  {
    id: "MAT-2",
    titulo: "Banner para mural do RH",
    descricao: "Cartaz A4 pronto pra imprimir e afixar no mural fisico do RH.",
    categoria: "banner",
    filename: "banner-mural-rh-a4.pdf",
    arquivo: () =>
      buildSimplePdf("APP ATLAS — SEU CREDITO CONSIGNADO DIRETO NO CELULAR", [
        "",
        { text: "3 vantagens", bold: true },
        "1. Ofertas pre-aprovadas dos bancos parceiros da prefeitura.",
        "2. Auto-averbacao em 3 cliques, sem ir a agencia.",
        "3. Assinatura eletronica com validade juridica (ICP-Brasil).",
        "",
        { text: "Como usar", bold: true },
        "- Baixe o app Atlas na sua loja.",
        "- Login com CPF e senha.",
        "- Escolha a oferta em 'Marketplace'.",
        "",
        "Duvidas: rh@prefeitura.gov.br",
      ]),
  },
  {
    id: "MAT-3",
    titulo: "Modelo de e-mail — Divulgação em massa",
    descricao: "Texto pronto pra enviar em campanha de comunicacao interna.",
    categoria: "email",
    filename: "email-modelo-divulgacao.pdf",
    arquivo: () =>
      buildSimplePdf("MODELO DE E-MAIL DE DIVULGACAO", [
        "Assunto: Novo canal digital de credito consignado",
        "",
        "Prezado(a) servidor(a),",
        "",
        "A Prefeitura firmou parceria com a Atlas Averbadora para oferecer",
        "acesso digital as suas margens de credito consignado.",
        "",
        "Com o app Atlas voce pode:",
        "- Consultar sua margem em tempo real",
        "- Ver ofertas pre-aprovadas dos bancos conveniados",
        "- Contratar 100% pelo celular, com assinatura eletronica",
        "",
        "Para comecar, baixe o app 'Atlas' na sua loja e cadastre-se com",
        "seu CPF e matricula. Duvidas: rh@prefeitura.gov.br",
        "",
        "Atenciosamente,",
        "RH — Prefeitura Municipal",
      ]),
  },
  {
    id: "MAT-4",
    titulo: "Checklist de conformidade LGPD",
    descricao: "Passo-a-passo para o RH auditar o tratamento de dados dos servidores.",
    categoria: "checklist",
    filename: "checklist-lgpd-rh.pdf",
    arquivo: () =>
      buildSimplePdf("CHECKLIST LGPD — TRATAMENTO DE DADOS DA FOLHA", [
        { text: "1. Anuencia formal (opt-in)", bold: true },
        "[ ] Termo de anuencia assinado pelo gestor?",
        "[ ] Historico auditavel disponivel?",
        "",
        { text: "2. Base de servidores", bold: true },
        "[ ] Campos criticos (cargo, endereco) so a prefeitura edita?",
        "[ ] Movimentacoes de pessoal registradas por competencia?",
        "",
        { text: "3. Compartilhamento com bancos", bold: true },
        "[ ] Convenios ativos listados em /prefeitura/convenios?",
        "[ ] Escopo restrito a nome, CPF, matricula, salario, margem?",
        "",
        { text: "4. Direitos do titular", bold: true },
        "[ ] Servidor pode consultar/exportar/apagar dados pelo app?",
        "[ ] Canal DPO@prefeitura.gov.br publicado?",
      ]),
  },
];

export function PrefeituraMateriais() {
  const baixar = (m: Material) => {
    const bytes = m.arquivo();
    downloadPdf(m.filename, bytes);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BackLink fallback="/prefeitura/comunicados" />
      <PageHeader
        title="Materiais de divulgação"
        subtitle="Kit pronto para divulgar o app Atlas entre os servidores municipais. Baixe, imprima ou envie por e-mail."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        {MATERIAIS.map((m) => (
          <Card key={m.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{m.titulo}</h3>
              <Pill variant="aceita">{CATEGORIA_LABEL[m.categoria]}</Pill>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.5, margin: "8px 0 12px" }}>{m.descricao}</p>
            <button
              type="button"
              onClick={() => baixar(m)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: "var(--gold-500)",
                color: "var(--navy-900)",
                border: "none",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              ↓ Baixar PDF
            </button>
          </Card>
        ))}
      </div>

      <Card>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase" }}>
          Dica
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "6px 0 0" }}>
          Precisando de material personalizado com o brasão do município? Fale com{" "}
          <a href="mailto:marketing@atlas.io" style={{ color: "var(--accent)", fontWeight: 600 }}>marketing@atlas.io</a>.
        </p>
      </Card>
    </div>
  );
}
