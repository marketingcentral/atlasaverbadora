# ADR-0006: UX do portal banco baseado em Consignet com design Atlas

- **Status:** Aceito
- **Data:** 2026-06-22

## Contexto

A interface do banco (operador que reserva margem e gerencia contratos) precisa ser adotada rapidamente por usuarios que ja operam outros sistemas — principalmente **Consignet** (lider de mercado). Aprendizagem alta = adocao baixa. Por outro lado, queremos preservar a marca Atlas (navy/gold/emerald + Inter) em todas as interfaces para coesao de produto.

## Decisao

Adotar a **estrutura e fluxos da Consignet como baseline de UX** para o portal banco, mas com **design system Atlas** (cores, tipografia, espacamentos). Aprendemos o LAYOUT da Consignet sem copiar a paleta.

**O que herdamos da Consignet:**
- Sidebar fixa esquerda com 6 areas: Visao Geral, Cadastros, Margem/Contratacao, Gerenciador de Contratos, Relatorios, Ajuda
- Indicador de **convenio ativo** em destaque no topo da sidebar (ex: "CASTRO / DELTA GLOBAL") com switcher quando ha multiplos
- Topbar global com notificacoes + nome do usuario
- Dashboard inicial com 4 cards KPI (Carteira, Novos, Pendencias, Data de Corte) + carrossel de comunicados
- Fluxo Margem/Contratacao: busca por CPF ou Matricula -> ficha do colaborador (mascara CPF com olho de revelar) -> calculo de margem com seletor mes/ano + projecao 4 meses futuros -> grade de operacoes (Averbacao + Reserva) -> tabela de contratos do colaborador na mesma pagina
- Gerenciador com filtros checkbox (Ativos, Cancelados, Quitados, Migrados, Finalizados, Minhas Pendencias, Bloqueios) + tipo de contrato + reiniciar filtros + exportar dados
- Detalhe de contrato com 7 tabs (Contrato, Parcelas, Financiamento, Historico, ADF Vinculada, Quitacao, Complementares) + acoes Imprimir/Quitar/Suspender/Cancelar/Alongar/Alterar
- FAB bottom-right com 3 botoes: feedback, suporte, FAQ

**O que NAO copiamos:**
- Paleta verde Consignet -> usamos navy/gold/emerald Atlas
- Tipografia Roboto/Open Sans -> Inter
- Densidade tipo "1995 enterprise" -> mantemos respiracao do design Atlas
- Comportamento de submenus dropdown verde -> usamos surface blur + dark mode opcional

## Por que nao adotar paleta Consignet

1. Coesao de marca: o app servidor (mobile) e admin (averbadora) sao Atlas. Banco igualmente Atlas mantem reconhecimento.
2. O operador banco abre nosso sistema TAMBEM como cidadao consumidor da marca Atlas (LP, app, etc.) — alinhar reforca.
3. Diferenciacao: ser visualmente moderno e ponto de venda. Verde "ZetraSoft/Consignet" sinaliza legado.

## Por que copiamos a estrutura

1. Operadores ja sabem onde clicar -> tempo de adocao ~1 dia em vez de 1 semana
2. Vocabulario consistente (Margem/Contratacao, Gerenciador, ADF, Convenio Ativo) reduz friccao de treinamento
3. Reducao de risco de design: a Consignet ja validou esses fluxos com milhares de operadores

## Consequencias

- Componentes `@atlas/ui/web` ganham primitives admin: `AppShellAdmin`, `ConvenioSwitcher`, `KpiCard`, `DataCorteCard`, `ComunicadoCarrossel`, `MargemColaboradorCard`, `MargemValorCard`, `OperacoesGrid`, `ContratosTable`, `ContratoTabs`, `ContratoActions`, `FilterBar`
- Os mesmos componentes serao reusados na interface da averbadora (Fase 9) -> ROI alto
- Necessario documentar mapeamento "Consignet -> Atlas" para onboarding de operadores migrantes (FAQ)

## Quando reavaliar

- Pesquisa com operadores reais (>10) apontar pontos de friccao especificos
- Surgirem padroes melhores no mercado (ex: AI copilot que dispense menus)
- Cliente solicitar white-label visual completo (ai tokens viram parametro)
