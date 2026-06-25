# -*- coding: utf-8 -*-
"""Gerador do Contrato de Prestação de Serviços — Atlas x Marketing Central."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether,
    Table, TableStyle, HRFlowable
)
from reportlab.pdfgen import canvas

OUTPUT = r"C:\Users\User\Downloads\proposta_bank\Contrato_Atlas_MarketingCentral.pdf"

NAVY = colors.HexColor("#0A1628")
NAVY_2 = colors.HexColor("#1A2942")
GOLD = colors.HexColor("#C9A961")
EMERALD = colors.HexColor("#10B981")
SLATE = colors.HexColor("#334155")
MUTED = colors.HexColor("#64748B")
BORDER = colors.HexColor("#CBD5E1")
LIGHT_BG = colors.HexColor("#F8FAFC")


def make_styles():
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "title", parent=base["Title"], fontName="Helvetica-Bold",
            fontSize=18, leading=22, textColor=NAVY, alignment=TA_CENTER,
            spaceAfter=4
        ),
        "subtitle": ParagraphStyle(
            "subtitle", parent=base["Normal"], fontName="Helvetica",
            fontSize=10, leading=13, textColor=MUTED, alignment=TA_CENTER,
            spaceAfter=10
        ),
        "h2": ParagraphStyle(
            "h2", parent=base["Heading2"], fontName="Helvetica-Bold",
            fontSize=11, leading=14, textColor=NAVY, alignment=TA_LEFT,
            spaceBefore=12, spaceAfter=6
        ),
        "clause": ParagraphStyle(
            "clause", parent=base["Heading3"], fontName="Helvetica-Bold",
            fontSize=10.5, leading=13, textColor=NAVY, alignment=TA_LEFT,
            spaceBefore=14, spaceAfter=4
        ),
        "body": ParagraphStyle(
            "body", parent=base["Normal"], fontName="Helvetica",
            fontSize=9.8, leading=14, textColor=SLATE, alignment=TA_JUSTIFY,
            spaceAfter=6
        ),
        "body_left": ParagraphStyle(
            "body_left", parent=base["Normal"], fontName="Helvetica",
            fontSize=9.8, leading=14, textColor=SLATE, alignment=TA_LEFT,
            spaceAfter=6
        ),
        "bullet": ParagraphStyle(
            "bullet", parent=base["Normal"], fontName="Helvetica",
            fontSize=9.5, leading=13.5, textColor=SLATE, alignment=TA_LEFT,
            leftIndent=18, bulletIndent=6, spaceAfter=3
        ),
        "tag": ParagraphStyle(
            "tag", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=8, leading=10, textColor=GOLD, alignment=TA_CENTER,
            spaceAfter=4
        ),
        "small": ParagraphStyle(
            "small", parent=base["Normal"], fontName="Helvetica",
            fontSize=8.5, leading=11, textColor=MUTED, alignment=TA_LEFT,
            spaceAfter=4
        ),
        "sign_name": ParagraphStyle(
            "sign_name", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=10, leading=12, textColor=NAVY, alignment=TA_CENTER,
            spaceAfter=2
        ),
        "sign_meta": ParagraphStyle(
            "sign_meta", parent=base["Normal"], fontName="Helvetica",
            fontSize=8.5, leading=11, textColor=MUTED, alignment=TA_CENTER,
            spaceAfter=2
        ),
        "footer_obs": ParagraphStyle(
            "footer_obs", parent=base["Normal"], fontName="Helvetica-Oblique",
            fontSize=8, leading=10.5, textColor=MUTED, alignment=TA_LEFT,
            spaceAfter=4
        ),
    }
    return styles


def header_block(styles):
    flow = []
    flow.append(Paragraph("CONTRATO DE PRESTAÇÃO DE SERVIÇOS", styles["tag"]))
    flow.append(Paragraph(
        "Desenvolvimento de Aplicativo Mobile (iOS &amp; Android) e Plataforma Web",
        styles["title"]
    ))
    flow.append(Paragraph(
        "Projeto Averba — App de Averbação Digital de Consignados",
        styles["subtitle"]
    ))
    flow.append(HRFlowable(width="100%", thickness=0.7, color=BORDER, spaceBefore=4, spaceAfter=12))
    return flow


def parties_block(styles):
    contratante_text = (
        "<b>ATLAS TECNOLOGIA E SOLUÇÕES FINANCEIRAS LTDA</b>, "
        "pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o nº "
        "<b>45.404.110/0001-57</b>, com sede na R. Doutor José Lourenço, nº 2185, "
        "Loja 08, bairro Joaquim Távora, Fortaleza/CE, CEP 60.115-282, "
        "neste ato representada na forma de seus atos constitutivos, doravante "
        "denominada simplesmente <b>CONTRATANTE</b>;"
    )
    contratada_text = (
        "<b>MARKETING CENTRAL LTDA</b>, pessoa jurídica de direito privado, "
        "inscrita no CNPJ/MF sob o nº <b>50.382.697/0001-80</b>, com sede na "
        "Av. Salgado Filho, nº 342, bairro Centro, Guarulhos/SP, CEP 07.115-000, "
        "neste ato representada na forma de seus atos constitutivos, doravante "
        "denominada simplesmente <b>CONTRATADA</b>;"
    )

    flow = []
    flow.append(Paragraph("PARTES CONTRATANTES", styles["h2"]))
    flow.append(Paragraph(contratante_text, styles["body"]))
    flow.append(Paragraph(contratada_text, styles["body"]))
    flow.append(Paragraph(
        "<b>CONTRATANTE</b> e <b>CONTRATADA</b>, quando referidas em conjunto, "
        "serão denominadas simplesmente <b>PARTES</b>, e têm entre si justo e "
        "contratado o presente <b>CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE "
        "DESENVOLVIMENTO DE SOFTWARE</b>, que se regerá pelas cláusulas e "
        "condições a seguir estabelecidas:",
        styles["body"]
    ))
    flow.append(Spacer(1, 8))
    return flow


def clause(num_roman, title, body_paragraphs, styles, keep=False):
    flow = [Paragraph(f"<b>CLÁUSULA {num_roman} — {title.upper()}</b>", styles["clause"])]
    for p in body_paragraphs:
        if isinstance(p, str):
            flow.append(Paragraph(p, styles["body"]))
        else:
            flow.append(p)
    if keep:
        return [KeepTogether(flow)]
    return flow


def bullets(items, styles, key="body"):
    flow = []
    for it in items:
        flow.append(Paragraph(f"• {it}", styles["bullet"]))
    return flow


def bank_box(styles):
    label_style = ParagraphStyle(
        "bank_lbl", fontName="Helvetica-Bold", fontSize=9, leading=11,
        textColor=NAVY, alignment=TA_LEFT,
    )
    val_style = ParagraphStyle(
        "bank_val", fontName="Helvetica", fontSize=9, leading=11,
        textColor=SLATE, alignment=TA_LEFT,
    )
    rows = [
        ["Banco",          "461 — Asaas I.P. S.A."],
        ["Agência",        "0001"],
        ["Conta",          "2050548-3"],
        ["Tipo de conta",  "Conta de Pagamento"],
        ["Titular",        "MARKETING CENTRAL LTDA"],
        ["CNPJ",           "50.382.697/0001-80"],
        ["PIX",            "50.382.697/0001-80 (chave CNPJ)"],
    ]
    data = [[Paragraph(k, label_style), Paragraph(v, val_style)] for k, v in rows]
    t = Table(data, colWidths=[3.6*cm, 11.8*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, BORDER),
        ("BOX", (0, 0), (-1, -1), 0.7, GOLD),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


def build_clauses(styles):
    flow = []

    # CLÁUSULA PRIMEIRA — DO OBJETO
    flow += clause(
        "PRIMEIRA", "Do Objeto",
        [
            "1.1. O presente contrato tem por objeto a prestação, pela CONTRATADA à "
            "CONTRATANTE, de serviços técnicos especializados para o "
            "<b>desenvolvimento completo do Projeto Averba</b>, plataforma digital de "
            "averbação de crédito consignado que conecta <b>servidores municipais, "
            "prefeituras e bancos parceiros</b>, compreendendo:",
            Paragraph("a) Aplicativo Mobile nativo para <b>iOS e Android</b>, distribuído via App Store (Apple) e Google Play (Android);", styles["bullet"]),
            Paragraph("b) Painel Administrativo Web destinado à CONTRATANTE e ao gerenciamento de bancos, prefeituras, servidores, transações e operações em tempo real;", styles["bullet"]),
            Paragraph("c) Backend (servidores e APIs) hospedado em arquitetura <b>edge-native</b>, com integração a bancos parceiros e prefeituras afiliadas;", styles["bullet"]),
            Paragraph("d) Documentação técnica, de integração e operacional do sistema entregue.", styles["bullet"]),
            "1.2. O escopo técnico detalhado encontra-se descrito na Cláusula Segunda e "
            "no <b>Anexo I — Especificação Técnica</b>, que integra o presente instrumento "
            "para todos os fins de direito.",
        ],
        styles
    )

    # CLÁUSULA SEGUNDA — DO ESCOPO TÉCNICO
    flow += clause(
        "SEGUNDA", "Do Escopo Técnico e da Arquitetura",
        [
            "2.1. O sistema será desenvolvido com a seguinte stack tecnológica:",
            Paragraph("<b>Aplicativo Mobile (Servidor):</b> React Native + Expo + TypeScript, com login biométrico (Face ID / Touch ID), push notifications (Firebase Cloud Messaging via Expo) e suporte a Android 8+ e iOS 14+;", styles["bullet"]),
            Paragraph("<b>Painel Administrativo Web (Averbadora):</b> React + Vite, distribuído via Cloudflare Pages, com módulos de Dashboard, Bancos, Prefeituras, Servidores, Monitoramento (Servers/Health), Logs em tempo real e Vitrine de banners;", styles["bullet"]),
            Paragraph("<b>Backend Edge:</b> Cloudflare Workers com framework Hono, API REST versionada (/v1), autenticação <b>JWT (RS256) + Refresh Token rotativo</b>, rate-limiting, load balancing geográfico e suporte a mTLS para integrações sensíveis;", styles["bullet"]),
            Paragraph("<b>Banco de Dados:</b> PostgreSQL serverless via Neon, com ORM Drizzle e branching de schemas para ambientes de desenvolvimento, homologação e produção;", styles["bullet"]),
            Paragraph("<b>Cache:</b> Cloudflare KV distribuído em borda, com estratégias de TTL e stale-while-revalidate;", styles["bullet"]),
            Paragraph("<b>Storage:</b> Cloudflare R2 para arquivos (contratos PDF, comprovantes, banners da Vitrine), com URLs pré-assinadas;", styles["bullet"]),
            Paragraph("<b>Webhooks &amp; Crons:</b> recebimento de callbacks dos bancos com HMAC e idempotência; automações programáticas via Workers Triggers (reconciliação de folhas, expiração de propostas, dicas financeiras);", styles["bullet"]),
            Paragraph("<b>Observabilidade:</b> Sentry para erros e tracing, Cloudflare Analytics para métricas agregadas, logs estruturados (JSON) com <i>trace_id</i> ponta-a-ponta.", styles["bullet"]),
            "2.2. <b>Funcionalidades do Aplicativo do Servidor:</b> simulação de crédito "
            "consignado, consulta de margem consignável, gestão de propostas, "
            "acompanhamento de contratos e parcelas, portabilidade de contratos, "
            "comparador de bancos, ofertas patrocinadas, dicas financeiras e "
            "configurações de conta.",
            "2.3. <b>Funcionalidades do Painel Averbadora:</b> Dashboard com indicadores "
            "operacionais e financeiros; CRUD completo de Bancos parceiros, Prefeituras "
            "afiliadas e Servidores cadastrados (com importação em massa); módulo "
            "Servers/Health para monitorar Web Services dos bancos e prefeituras "
            "(uptime, latência p50/p95/p99); console de Logs com depuração em "
            "tempo real e filtros inteligentes; gestão da Vitrine de banners "
            "patrocinados com faturamento mensal.",
            "2.4. <b>Integrações:</b> Web Services REST dos bancos parceiros para "
            "simulação, criação de propostas, callbacks de assinatura e portabilidade; "
            "sistemas das prefeituras para validação de matrícula, base de salário e "
            "margem consignável disponível.",
            "2.5. <b>Entregáveis Documentais:</b> documentação OpenAPI 3.1 da API "
            "pública, guia de integração para bancos parceiros, manual técnico de "
            "arquitetura, manual operacional do Painel Averbadora.",
        ],
        styles
    )

    # CLÁUSULA TERCEIRA — DO PRAZO
    flow += clause(
        "TERCEIRA", "Do Prazo de Execução",
        [
            "3.1. O prazo total de execução dos serviços será de <b>30 (trinta) dias "
            "corridos</b>, contados a partir da assinatura deste instrumento e da "
            "confirmação do pagamento da entrada prevista na Cláusula Quinta, "
            "distribuídos da seguinte forma:",
            Paragraph("<b>a)</b> <b>20 (vinte) dias corridos</b> para desenvolvimento, integrações e entrega da versão candidata à homologação;", styles["bullet"]),
            Paragraph("<b>b)</b> <b>10 (dez) dias corridos</b> para período de testes, homologação e ajustes finais, contados a partir do término do prazo da alínea (a).", styles["bullet"]),
            "3.2. <b>Suspensão e Prorrogação do Prazo.</b> Os prazos previstos no item 3.1 "
            "ficarão automaticamente <b>suspensos</b> em caso de atraso, omissão ou "
            "insuficiência por parte da CONTRATANTE no fornecimento dos materiais, "
            "documentações, credenciais e aprovações listados na Cláusula Quarta, "
            "sendo o prazo prorrogado por período equivalente ao da interrupção, sem "
            "qualquer ônus adicional à CONTRATADA.",
            "3.3. <b>Materiais críticos cuja ausência ou atraso enseja suspensão do prazo:</b>",
            Paragraph("(i) Briefing completo e definitivo do projeto;", styles["bullet"]),
            Paragraph("(ii) Documentação técnica das APIs dos bancos parceiros (endpoints, autenticação, payloads, ambiente de sandbox);", styles["bullet"]),
            Paragraph("(iii) Documentação técnica e/ou acesso aos sistemas das prefeituras afiliadas (validação de matrícula, folha de pagamento, margem);", styles["bullet"]),
            Paragraph("(iv) Credenciais de sandbox e de produção para bancos, prefeituras e demais serviços externos;", styles["bullet"]),
            Paragraph("(v) Identidade visual final (logo, paleta, tipografia, design tokens) e materiais gráficos (ícones, ilustrações);", styles["bullet"]),
            Paragraph("(vi) Conteúdo textual e legal (Termos de Uso, Política de Privacidade, textos de onboarding) sob responsabilidade da CONTRATANTE;", styles["bullet"]),
            Paragraph("(vii) Aprovações intermediárias da CONTRATANTE em prazo máximo de 5 (cinco) dias úteis a partir da solicitação formal;", styles["bullet"]),
            Paragraph("(viii) Contas de desenvolvedor Apple Developer Program e Google Play Console, devidamente ativas e custeadas pela CONTRATANTE.", styles["bullet"]),
            "3.4. <b>Exclusão dos Prazos de Lojas de Aplicativo.</b> O prazo de entrega "
            "previsto neste contrato <b>NÃO inclui</b> o período de análise e aprovação "
            "junto à <b>App Store (Apple)</b> e <b>Google Play Store</b>, os quais "
            "obedecem a critérios próprios e burocráticos das respectivas plataformas, "
            "fora do controle da CONTRATADA. A CONTRATADA prestará suporte no processo "
            "de submissão, mas não se responsabiliza por reprovações, exigências "
            "adicionais ou prazos das lojas.",
            "3.5. As entregas serão realizadas em ambiente de homologação e, mediante "
            "aprovação formal da CONTRATANTE, promovidas para ambiente de produção.",
        ],
        styles
    )

    # CLÁUSULA QUARTA — MATERIAIS
    flow += clause(
        "QUARTA", "Das Obrigações da Contratante quanto ao Fornecimento de Materiais",
        [
            "4.1. Sem prejuízo das demais obrigações deste contrato, a CONTRATANTE "
            "compromete-se a fornecer à CONTRATADA, no prazo máximo de "
            "<b>5 (cinco) dias úteis</b> contados da assinatura, todos os materiais "
            "elencados no item 3.3 desta avença.",
            "4.2. A CONTRATANTE indicará interlocutor único, com poderes de decisão, "
            "para aprovações, esclarecimentos técnicos e validação de entregas.",
            "4.3. O eventual descumprimento das obrigações desta cláusula, além de "
            "ensejar a suspensão do prazo de execução (item 3.2), poderá, a critério da "
            "CONTRATADA, configurar inadimplemento contratual após "
            "<b>15 (quinze) dias corridos</b> de inércia da CONTRATANTE, contados de "
            "notificação formal.",
        ],
        styles
    )

    # CLÁUSULA QUINTA — VALOR E PAGAMENTO
    desc_style = ParagraphStyle(
        "desc_cell", fontName="Helvetica", fontSize=9, leading=11.5,
        textColor=SLATE, alignment=TA_LEFT,
    )
    val_table = Table(
        [
            ["Item", "Descrição", "Valor"],
            ["1", Paragraph("Desenvolvimento completo do Projeto Averba (app + painel + backend + integrações + documentação)", desc_style), "R$ 60.000,00"],
            ["",  Paragraph("Entrada (50%) — devida na assinatura", desc_style), "R$ 30.000,00"],
            ["",  Paragraph("Saldo (50%) — devido na entrega final e aprovação", desc_style), "R$ 30.000,00"],
        ],
        colWidths=[1.1*cm, 10.6*cm, 3.7*cm]
    )
    val_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ALIGN", (2, 0), (2, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
        ("BACKGROUND", (0, 1), (-1, 1), LIGHT_BG),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))

    flow += clause(
        "QUINTA", "Do Valor, Forma de Pagamento e Reajuste",
        [
            "5.1. O valor total do desenvolvimento descrito nas Cláusulas Primeira e "
            "Segunda é de <b>R$ 60.000,00 (sessenta mil reais)</b>, pago em duas parcelas:",
            val_table,
            Spacer(1, 6),
            "5.2. <b>Forma de pagamento:</b> transferência bancária (TED/PIX) para conta "
            "indicada pela CONTRATADA, mediante emissão de Nota Fiscal de Serviço.",
            "5.3. A entrada (parcela 1) deverá ser quitada em até <b>3 (três) dias úteis</b> "
            "da assinatura deste contrato; o saldo (parcela 2), em até "
            "<b>5 (cinco) dias úteis</b> após a aprovação formal da entrega final pela "
            "CONTRATANTE.",
            "5.4. Os pagamentos da manutenção mensal contratada (Cláusula Sexta) serão "
            "feitos mediante boleto bancário ou PIX, com vencimento no dia "
            "<b>10 (dez)</b> de cada mês.",
            "5.5. <b>Dados Bancários da CONTRATADA</b> para depósito, transferência (TED) ou PIX:",
            bank_box(styles),
            "5.6. A chave PIX preferencial é o <b>CNPJ 50.382.697/0001-80</b>. O "
            "comprovante de pagamento deverá ser enviado por e-mail ao interlocutor "
            "indicado pela CONTRATADA, em até 1 (um) dia útil da operação.",
        ],
        styles
    )

    # CLÁUSULA SEXTA — MANUTENÇÃO 24 MESES
    flow += clause(
        "SEXTA", "Da Manutenção, Suporte e Permanência Contratual",
        [
            "6.1. Como condição essencial para a viabilidade comercial do investimento "
            "em desenvolvimento previsto na Cláusula Quinta, fica estabelecida "
            "<b>permanência contratual obrigatória de 24 (vinte e quatro) meses</b> de "
            "manutenção e suporte, no valor mensal de "
            "<b>R$ 1.500,00 (mil e quinhentos reais)</b>, totalizando "
            "<b>R$ 36.000,00 (trinta e seis mil reais)</b> ao longo do período.",
            "6.2. <b>Início:</b> a vigência da manutenção tem início na data da entrega "
            "final do projeto, com primeira mensalidade vencendo 30 (trinta) dias após "
            "tal entrega.",
            "6.3. <b>Serviços incluídos na mensalidade de manutenção</b> (sem englobar "
            "os custos de infraestrutura previstos no item 6.6):",
            Paragraph("(i) Gestão e monitoramento da infraestrutura Cloudflare (Workers, Pages, KV, R2) e gerenciamento de DNS/domínio;", styles["bullet"]),
            Paragraph("(ii) Administração do banco de dados PostgreSQL (Neon) — backups, migrations, índices e otimizações de performance;", styles["bullet"]),
            Paragraph("(iii) Monitoramento contínuo (Sentry, Analytics) e atendimento a incidentes;", styles["bullet"]),
            Paragraph("(iv) Correções de defeitos de funcionamento (bugs) sem custo adicional;", styles["bullet"]),
            Paragraph("(v) Atualizações de segurança, dependências e bibliotecas;", styles["bullet"]),
            Paragraph("(vi) Pequenas evoluções e ajustes (até 8 horas técnicas/mês cumulativas em até 3 meses);", styles["bullet"]),
            Paragraph("(vii) Suporte técnico em horário comercial (segunda a sexta, 9h–18h), com SLA de resposta em até 8 horas úteis;", styles["bullet"]),
            Paragraph("(viii) Auxílio na atualização do app nas lojas em caso de novas versões de iOS/Android.", styles["bullet"]),
            "6.4. <b>Serviços NÃO inclusos</b> (orçamento à parte): novas features de "
            "negócio, redesigns completos de tela, integrações com bancos/prefeituras "
            "não previstas no escopo original e migrações de infraestrutura.",
            "6.5. <b>Reajuste anual</b> do valor mensal pela variação acumulada do "
            "<b>IPCA</b> dos 12 meses anteriores ao reajuste, ou do <b>IGP-M</b> caso "
            "este se mostre menor, aplicado a cada 12 (doze) meses de vigência.",
            "6.6. <b>Custos de Infraestrutura e Serviços de Terceiros — por conta da "
            "CONTRATANTE.</b> Os valores de assinatura, licenciamento, consumo e "
            "quaisquer cobranças correlatas dos serviços de infraestrutura e "
            "ferramentas externas utilizados na operação do sistema são de "
            "<b>responsabilidade exclusiva da CONTRATANTE</b> e <b>não estão</b> "
            "compreendidos na mensalidade prevista no item 6.1, incluindo, sem "
            "exaustividade:",
            Paragraph("(a) <b>Cloudflare</b> — Workers Paid, Pages, R2 (storage e egress), KV, Durable Objects, Images, Stream e demais módulos pagos;", styles["bullet"]),
            Paragraph("(b) <b>Neon</b> (PostgreSQL serverless) — plano contratado, computação, storage e branches;", styles["bullet"]),
            Paragraph("(c) <b>Firebase / Google Cloud</b> — Cloud Messaging (FCM), Authentication, demais serviços eventualmente utilizados;", styles["bullet"]),
            Paragraph("(d) <b>Sentry</b> — plano de monitoramento, retenção de eventos e seats de usuário;", styles["bullet"]),
            Paragraph("(e) <b>Apple Developer Program</b> e <b>Google Play Console</b> — anuidades, taxas e custos de submissão;", styles["bullet"]),
            Paragraph("(f) <b>Domínios, certificados SSL pagos, e-mail transacional</b> (ex.: Resend, SendGrid, Postmark), SMS, gateways de pagamento e qualquer outro serviço de terceiros necessário à operação;", styles["bullet"]),
            Paragraph("(g) Servidores adicionais, máquinas virtuais ou ambientes especiais que venham a ser necessários para integrações específicas com bancos ou prefeituras.", styles["bullet"]),
            "6.7. Tais serviços deverão ser contratados <b>diretamente em nome da "
            "CONTRATANTE</b>, que fornecerá à CONTRATADA os acessos necessários para "
            "operação. Caso, por conveniência operacional, a CONTRATADA os contrate em "
            "nome próprio mediante autorização prévia, os valores serão <b>integralmente "
            "reembolsados</b> pela CONTRATANTE em até 10 (dez) dias corridos da "
            "apresentação dos comprovantes, acrescidos de eventual taxa administrativa "
            "previamente acordada.",
            "6.8. Eventuais aumentos de plano, consumo ou tributação aplicados pelos "
            "provedores externos serão repassados integralmente à CONTRATANTE.",
        ],
        styles
    )

    # CLÁUSULA SÉTIMA — MULTAS
    flow += clause(
        "SÉTIMA", "Das Multas e Penalidades",
        [
            "7.1. <b>Multa por atraso no pagamento mensal de manutenção (Cláusula Sexta):</b> "
            "o atraso superior a 1 (um) dia útil da data de vencimento implicará, "
            "automaticamente:",
            Paragraph("(a) <b>Multa moratória de 2% (dois por cento)</b> sobre o valor em atraso;", styles["bullet"]),
            Paragraph("(b) <b>Juros de mora de 1% (um por cento) ao mês</b>, calculados <i>pro rata die</i>;", styles["bullet"]),
            Paragraph("(c) <b>Correção monetária</b> pelo IGP-M ou índice oficial sucessor;", styles["bullet"]),
            Paragraph("(d) Após <b>10 (dez) dias corridos</b> de inadimplência, a CONTRATADA poderá suspender o acesso à infraestrutura, painéis e APIs até a regularização integral, sem prejuízo da cobrança da dívida;", styles["bullet"]),
            Paragraph("(e) Após <b>30 (trinta) dias corridos</b> de inadimplência, a CONTRATADA poderá considerar caracterizado o inadimplemento substancial, com aplicação da multa rescisória do item 7.2.", styles["bullet"]),
            "7.2. <b>Multa por rescisão antecipada da manutenção (não cumprimento dos "
            "24 meses):</b> a rescisão da Cláusula Sexta antes do término da permanência, "
            "por iniciativa da CONTRATANTE ou por inadimplência reiterada, sujeitará a "
            "parte que der causa ao pagamento de <b>multa compensatória equivalente a "
            "50% (cinquenta por cento) das mensalidades vincendas</b> até o término do "
            "período de 24 meses, respeitado o piso mínimo equivalente a "
            "<b>3 (três) mensalidades</b>, valor este consonante com o padrão de mercado "
            "para contratos de licenciamento e manutenção de software.",
            "7.3. <b>Multa rescisória geral.</b> A rescisão imotivada do presente contrato "
            "por qualquer das PARTES, antes da entrega final, sujeitará a parte "
            "denunciante ao pagamento de multa correspondente a <b>20% (vinte por "
            "cento)</b> sobre o valor remanescente do desenvolvimento (Cláusula Quinta), "
            "sem prejuízo do pagamento dos serviços já executados e materiais já "
            "produzidos.",
            "7.4. <b>Multa por atraso na entrega do desenvolvimento</b> imputável "
            "exclusivamente à CONTRATADA (excluídas as hipóteses dos itens 3.2, 3.4, "
            "Cláusula Quarta e força maior): <b>0,5% (meio por cento)</b> do valor total "
            "do desenvolvimento por dia útil de atraso, limitada a 10% (dez por cento) "
            "do valor total.",
            "7.5. As multas previstas nesta cláusula são <b>cumulativas</b> com as perdas "
            "e danos eventualmente apurados, exigíveis independentemente de notificação "
            "judicial ou extrajudicial.",
        ],
        styles
    )

    # CLÁUSULA OITAVA — OBRIGAÇÕES DA CONTRATADA
    flow += clause(
        "OITAVA", "Das Obrigações da Contratada",
        [
            "8.1. Constituem obrigações da CONTRATADA, além das demais previstas neste "
            "contrato:",
            Paragraph("(i) Executar os serviços com qualidade técnica, observando boas práticas de engenharia de software, OWASP Top 10 e LGPD;", styles["bullet"]),
            Paragraph("(ii) Manter equipe qualificada e dedicar recursos humanos suficientes para cumprimento dos prazos;", styles["bullet"]),
            Paragraph("(iii) Realizar testes funcionais, de carga e de segurança antes de cada entrega;", styles["bullet"]),
            Paragraph("(iv) Entregar a documentação técnica e operacional prevista na Cláusula Segunda;", styles["bullet"]),
            Paragraph("(v) Guardar absoluto sigilo sobre dados, informações e know-how da CONTRATANTE (Cláusula Décima Primeira);", styles["bullet"]),
            Paragraph("(vi) Emitir Nota Fiscal de Serviço relativa a cada pagamento recebido;", styles["bullet"]),
            Paragraph("(vii) Responder por defeitos ocultos no software entregue durante o período de manutenção (Cláusula Sexta).", styles["bullet"]),
        ],
        styles
    )

    # CLÁUSULA NONA — OBRIGAÇÕES DA CONTRATANTE
    flow += clause(
        "NONA", "Das Obrigações da Contratante",
        [
            "9.1. Constituem obrigações da CONTRATANTE, além das demais previstas:",
            Paragraph("(i) Fornecer tempestivamente todos os materiais e acessos da Cláusula Quarta;", styles["bullet"]),
            Paragraph("(ii) Aprovar ou apontar correções nas entregas em até <b>5 (cinco) dias úteis</b>; o silêncio neste prazo implicará aprovação tácita;", styles["bullet"]),
            Paragraph("(iii) Efetuar os pagamentos nas datas e formas pactuadas;", styles["bullet"]),
            Paragraph("(iv) Manter ativas e custeadas as contas de desenvolvedor (Apple e Google) e eventuais serviços de terceiros que demandem assinatura própria;", styles["bullet"]),
            Paragraph("(v) Indicar interlocutor único e responder a solicitações da CONTRATADA;", styles["bullet"]),
            Paragraph("(vi) Não realizar alterações diretas no código-fonte ou na infraestrutura entregues durante a vigência da manutenção, sem prévio aviso e consentimento da CONTRATADA.", styles["bullet"]),
        ],
        styles
    )

    # CLÁUSULA DÉCIMA — PROPRIEDADE INTELECTUAL
    flow += clause(
        "DÉCIMA", "Da Propriedade Intelectual",
        [
            "10.1. Mediante a quitação integral do valor da Cláusula Quinta e o "
            "adimplemento da CONTRATANTE quanto às obrigações da Cláusula Sexta, "
            "ficam cedidos à CONTRATANTE os direitos patrimoniais sobre o "
            "<b>código-fonte específico, arte original e documentação</b> "
            "desenvolvidos exclusivamente para este projeto.",
            "10.2. Permanecem de titularidade da CONTRATADA, ou de terceiros licenciantes, "
            "os componentes <b>open-source, bibliotecas, frameworks, ferramentas internas "
            "e know-how</b> empregados na execução, os quais a CONTRATANTE poderá "
            "utilizar nos limites das respectivas licenças.",
            "10.3. A CONTRATADA poderá, observado o dever de sigilo, mencionar o projeto "
            "em seu portfólio comercial, sem revelar informações confidenciais.",
        ],
        styles
    )

    # CLÁUSULA DÉCIMA PRIMEIRA — CONFIDENCIALIDADE
    flow += clause(
        "DÉCIMA PRIMEIRA", "Da Confidencialidade e Proteção de Dados",
        [
            "11.1. As PARTES obrigam-se a manter sob absoluto sigilo todas as informações "
            "técnicas, comerciais, operacionais e estratégicas a que tiverem acesso em "
            "razão do presente contrato, sob pena de responder pelas perdas e danos "
            "decorrentes da violação.",
            "11.2. O dever de sigilo permanecerá em vigor durante toda a vigência do "
            "contrato e pelo prazo de <b>5 (cinco) anos</b> após o seu término, por "
            "qualquer motivo.",
            "11.3. As PARTES observarão integralmente a <b>Lei nº 13.709/2018 (LGPD)</b>, "
            "atuando como controlador (CONTRATANTE) e operador (CONTRATADA) na forma "
            "do art. 5º, VI e VII da referida lei, no que couber.",
        ],
        styles
    )

    # CLÁUSULA DÉCIMA SEGUNDA — FORÇA MAIOR
    flow += clause(
        "DÉCIMA SEGUNDA", "Do Caso Fortuito e da Força Maior",
        [
            "12.1. Nenhuma das PARTES será responsabilizada por descumprimentos "
            "decorrentes de caso fortuito ou força maior, nos termos do art. 393 do "
            "Código Civil.",
            "12.2. Equiparam-se à força maior, para os fins deste contrato, sem prejuízo "
            "de outras hipóteses legalmente admitidas: indisponibilidades prolongadas de "
            "<b>Cloudflare, Neon, Firebase, App Store, Google Play</b> ou quaisquer "
            "outros prestadores de serviços de terceiros utilizados na arquitetura; "
            "alterações regulatórias supervenientes que tornem inviável o objeto; "
            "interrupção generalizada das comunicações; e atos imprevistos de "
            "autoridades.",
        ],
        styles
    )

    # CLÁUSULA DÉCIMA TERCEIRA — GARANTIA
    flow += clause(
        "DÉCIMA TERCEIRA", "Da Garantia Técnica",
        [
            "13.1. A CONTRATADA garante o pleno funcionamento do sistema conforme as "
            "especificações, pelo período da Cláusula Sexta (manutenção), durante o qual "
            "responderá, sem custo adicional, por defeitos de programação devidamente "
            "comprovados.",
            "13.2. Excluem-se da garantia: uso indevido, alterações realizadas por "
            "terceiros sem aprovação da CONTRATADA, falhas em integrações externas "
            "(bancos, prefeituras) decorrentes de mudanças por iniciativa de tais "
            "terceiros, e quaisquer fatos enquadráveis na Cláusula Décima Segunda.",
        ],
        styles
    )

    # CLÁUSULA DÉCIMA QUARTA — RESCISÃO
    flow += clause(
        "DÉCIMA QUARTA", "Da Rescisão",
        [
            "14.1. O presente contrato poderá ser rescindido:",
            Paragraph("(a) Por mútuo acordo entre as PARTES, mediante termo escrito;", styles["bullet"]),
            Paragraph("(b) Por descumprimento contratual não sanado em até <b>30 (trinta) dias corridos</b> contados de notificação formal da parte prejudicada;", styles["bullet"]),
            Paragraph("(c) Em decorrência de inadimplência financeira reiterada (item 7.1, alínea e);", styles["bullet"]),
            Paragraph("(d) Por falência, recuperação judicial ou dissolução de qualquer das PARTES.", styles["bullet"]),
            "14.2. Em qualquer hipótese de rescisão, aplicam-se as multas e penalidades "
            "previstas na Cláusula Sétima.",
        ],
        styles
    )

    # CLÁUSULA DÉCIMA QUINTA — VÍNCULO E NATUREZA
    flow += clause(
        "DÉCIMA QUINTA", "Da Natureza Jurídica e da Inexistência de Vínculo",
        [
            "15.1. O presente instrumento tem natureza eminentemente civil e comercial, "
            "regendo-se pelo Código Civil Brasileiro, não gerando, sob qualquer hipótese, "
            "vínculo empregatício, sindical ou societário entre as PARTES ou entre seus "
            "respectivos colaboradores.",
            "15.2. Cada parte responde, isolada e exclusivamente, pelos encargos "
            "trabalhistas, previdenciários, fiscais e civis relativos aos seus prepostos.",
        ],
        styles
    )

    # CLÁUSULA DÉCIMA SEXTA — DISPOSIÇÕES FINAIS
    flow += clause(
        "DÉCIMA SEXTA", "Das Disposições Finais",
        [
            "16.1. A tolerância de qualquer das PARTES quanto a eventual descumprimento "
            "não importará em novação, renúncia ou alteração do contrato.",
            "16.2. Eventuais alterações somente serão válidas mediante termo aditivo "
            "escrito e assinado pelas PARTES.",
            "16.3. Comunicações formais entre as PARTES serão feitas por e-mail "
            "registrado nos cadastros de cada uma ou por meio físico no endereço da sede.",
            "16.4. Este contrato substitui qualquer entendimento, acordo ou proposta "
            "anterior referente ao mesmo objeto.",
        ],
        styles
    )

    # CLÁUSULA DÉCIMA SÉTIMA — FORO
    flow += clause(
        "DÉCIMA SÉTIMA", "Do Foro",
        [
            "17.1. Fica eleito o foro da Comarca de <b>São Paulo/SP</b>, com renúncia "
            "expressa a qualquer outro, ainda que mais privilegiado, para dirimir "
            "quaisquer questões oriundas deste contrato.",
        ],
        styles
    )

    return flow


def signatures_block(styles):
    flow = []
    flow.append(Spacer(1, 12))
    flow.append(Paragraph(
        "E por estarem assim justas e contratadas, as PARTES firmam o presente "
        "instrumento em 02 (duas) vias de igual teor e forma, na presença das "
        "testemunhas abaixo identificadas, para que produza todos os seus efeitos "
        "jurídicos.",
        styles["body"]
    ))
    flow.append(Spacer(1, 10))
    flow.append(Paragraph("São Paulo/SP, ______ de _________________ de 20____.", styles["body"]))
    flow.append(Spacer(1, 28))

    sig_table = Table(
        [
            [
                Paragraph("____________________________________", styles["sign_meta"]),
                Paragraph("____________________________________", styles["sign_meta"]),
            ],
            [
                Paragraph("<b>CONTRATANTE</b>", styles["sign_name"]),
                Paragraph("<b>CONTRATADA</b>", styles["sign_name"]),
            ],
            [
                Paragraph("Atlas Tecnologia e Soluções Financeiras Ltda<br/>CNPJ 45.404.110/0001-57", styles["sign_meta"]),
                Paragraph("Marketing Central Ltda<br/>CNPJ 50.382.697/0001-80", styles["sign_meta"]),
            ],
        ],
        colWidths=[8.2*cm, 8.2*cm]
    )
    sig_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
    ]))
    flow.append(sig_table)

    flow.append(Spacer(1, 28))
    flow.append(Paragraph("<b>TESTEMUNHAS:</b>", styles["body_left"]))
    flow.append(Spacer(1, 18))

    test_table = Table(
        [
            [
                Paragraph("1. ____________________________________<br/>Nome:<br/>CPF:", styles["sign_meta"]),
                Paragraph("2. ____________________________________<br/>Nome:<br/>CPF:", styles["sign_meta"]),
            ]
        ],
        colWidths=[8.2*cm, 8.2*cm]
    )
    test_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
    ]))
    flow.append(test_table)

    return flow


def annex_block(styles):
    flow = [PageBreak()]
    flow.append(Paragraph("ANEXO I — ESPECIFICAÇÃO TÉCNICA RESUMIDA", styles["title"]))
    flow.append(Paragraph(
        "Resumo da arquitetura e dos entregáveis acordados — parte integrante do contrato.",
        styles["subtitle"]
    ))
    flow.append(HRFlowable(width="100%", thickness=0.7, color=BORDER, spaceBefore=2, spaceAfter=10))

    flow.append(Paragraph("1. Camada Cliente (Clientes Finais)", styles["h2"]))
    items = [
        "<b>App Mobile do Servidor</b> — React Native + Expo + TypeScript (iOS 14+, Android 8+);",
        "<b>Painel Web da Averbadora</b> — React + Vite distribuído via Cloudflare Pages;",
        "Login biométrico (Face ID / Touch ID) e armazenamento seguro de credenciais (SecureStore / Keychain / Keystore).",
    ]
    for it in items:
        flow.append(Paragraph(f"• {it}", styles["bullet"]))

    flow.append(Paragraph("2. Camada Edge (Orquestrador)", styles["h2"]))
    items = [
        "<b>Cloudflare Workers</b> — API REST versionada (v1), framework Hono, auth gateway, rate-limit, load balancing geográfico;",
        "<b>Cloudflare Pages</b> — hospedagem do painel admin e da landing institucional;",
        "<b>Cloudflare KV</b> — cache distribuído com TTL e stale-while-revalidate;",
        "<b>Cloudflare R2</b> — armazenamento de arquivos (contratos PDF, comprovantes, banners) com URLs pré-assinadas;",
    ]
    for it in items:
        flow.append(Paragraph(f"• {it}", styles["bullet"]))

    flow.append(Paragraph("3. Camada de Dados", styles["h2"]))
    items = [
        "<b>PostgreSQL (Neon)</b> — banco principal serverless com branching e read replicas;",
        "<b>Drizzle ORM</b> e sistema de migrations versionado;",
        "Modelagem com schemas separados por domínio: identidade, propostas, contratos, auditoria.",
    ]
    for it in items:
        flow.append(Paragraph(f"• {it}", styles["bullet"]))

    flow.append(Paragraph("4. Integrações e Automações", styles["h2"]))
    items = [
        "<b>Web Services dos bancos parceiros</b> — REST, OAuth2 client credentials, mTLS opcional, retry com backoff e circuit breaker;",
        "<b>Sistemas das prefeituras</b> — REST/SOAP, VPN dedicada ou ETL noturno;",
        "<b>Webhooks bidirecionais</b> — HMAC-SHA256, idempotency keys, deduplicação 24h;",
        "<b>Crons (Workers Triggers)</b> — reconciliação de folhas, expiração de propostas, recálculo de margens, dicas financeiras.",
    ]
    for it in items:
        flow.append(Paragraph(f"• {it}", styles["bullet"]))

    flow.append(Paragraph("5. Notificações &amp; Observabilidade", styles["h2"]))
    items = [
        "<b>Firebase FCM</b> (Android) + <b>APNs via Expo</b> (iOS) para push notifications;",
        "<b>Sentry</b> — erros, performance, tracing distribuído com trace_id ponta-a-ponta;",
        "<b>Cloudflare Analytics</b> — métricas agregadas (latência, requests, status codes);",
        "Logs estruturados (JSON) com retenção de 30 dias quente + R2 para arquivamento frio.",
    ]
    for it in items:
        flow.append(Paragraph(f"• {it}", styles["bullet"]))

    flow.append(Paragraph("6. Segurança e Compliance", styles["h2"]))
    items = [
        "<b>JWT (RS256)</b> com <i>kid</i> rotativo trimestral; <b>Refresh Token</b> rotativo com revogação por dispositivo;",
        "<b>OWASP Top 10</b> mitigado nas camadas de aplicação e edge;",
        "<b>LGPD</b> — controle de consentimento, direitos do titular e logs de acesso a dados pessoais;",
        "Criptografia em trânsito (TLS 1.3) e em repouso (R2, Neon).",
    ]
    for it in items:
        flow.append(Paragraph(f"• {it}", styles["bullet"]))

    flow.append(Paragraph("7. Funcionalidades do App do Servidor", styles["h2"]))
    items = [
        "Início (Home) — saudação, margem disponível, atalhos, próxima parcela;",
        "Margem detalhada — consignável, cartão consignado, cartão benefícios;",
        "Simulação de crédito com slider e comparativo entre bancos;",
        "Propostas — listagem, detalhes, aceite e portabilidade;",
        "Contratos — listagem, detalhes financeiros e histórico de parcelas;",
        "Ofertas — banners patrocinados segmentados por perfil;",
        "Conta — dados, aparência (claro/escuro/sistema), segurança (biometria).",
    ]
    for it in items:
        flow.append(Paragraph(f"• {it}", styles["bullet"]))

    flow.append(Paragraph("8. Funcionalidades do Painel Averbadora", styles["h2"]))
    items = [
        "Dashboard — KPIs, gráficos e drill-down operacional;",
        "Bancos — CRUD, credenciais, catálogo de produtos e endpoints;",
        "Prefeituras — CRUD, modo de integração e agendamento de sincronização;",
        "Servidores — CRUD individual + importação em massa (CSV/XLSX);",
        "Servers/Health — monitor de Web Services (uptime, latência p50/p95/p99);",
        "Logs — console em tempo real com filtros inteligentes e trace_id;",
        "Vitrine — gestão de banners patrocinados e faturamento mensal.",
    ]
    for it in items:
        flow.append(Paragraph(f"• {it}", styles["bullet"]))

    flow.append(Paragraph("9. Entregáveis Documentais", styles["h2"]))
    items = [
        "Especificação OpenAPI 3.1 da API pública;",
        "Guia de integração para bancos parceiros;",
        "Manual técnico de arquitetura e operação;",
        "Manual operacional do Painel Averbadora;",
        "Vídeo-tutoriais (Loom/Drive) para handover da equipe da CONTRATANTE.",
    ]
    for it in items:
        flow.append(Paragraph(f"• {it}", styles["bullet"]))

    flow.append(Spacer(1, 10))
    flow.append(Paragraph(
        "<i>Observação: especificações detalhadas, mockups e fluxos de tela "
        "encontram-se no site de apresentação do projeto e nos materiais "
        "complementares fornecidos pela CONTRATADA durante a fase de levantamento.</i>",
        styles["footer_obs"]
    ))

    return flow


def on_page(canvas_obj, doc):
    canvas_obj.saveState()
    # Top brand strip
    canvas_obj.setFillColor(NAVY)
    canvas_obj.rect(0, A4[1] - 0.4*cm, A4[0], 0.4*cm, stroke=0, fill=1)
    canvas_obj.setFillColor(GOLD)
    canvas_obj.rect(0, A4[1] - 0.5*cm, A4[0], 0.1*cm, stroke=0, fill=1)
    # Page number footer
    canvas_obj.setFont("Helvetica", 7.5)
    canvas_obj.setFillColor(MUTED)
    canvas_obj.drawRightString(
        A4[0] - 2*cm, 1.2*cm,
        f"Página {doc.page} — Contrato Atlas x Marketing Central — Projeto Averba"
    )
    canvas_obj.drawString(2*cm, 1.2*cm, "Confidencial")
    canvas_obj.restoreState()


def main():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=1.6*cm, bottomMargin=1.8*cm,
        title="Contrato de Prestação de Serviços — Atlas x Marketing Central",
        author="Marketing Central Ltda",
        subject="Desenvolvimento Projeto Averba",
    )
    styles = make_styles()
    story = []
    story += header_block(styles)
    story += parties_block(styles)
    story += build_clauses(styles)
    story += signatures_block(styles)
    story += annex_block(styles)

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    print(f"PDF gerado em: {OUTPUT}")


if __name__ == "__main__":
    main()
