# ADR-0007: Concorrentes e posicionamento Atlas

- **Status:** Aceito
- **Data:** 2026-06-22

## Contexto

Antes de definir features, precisamos entender quem ja opera no mesmo segmento (averbadoras digitais e plataformas de credito consignado publico no Brasil), o que eles fazem bem e onde ha espaco para diferenciar.

## Players principais

| Player | Foco | Pontos fortes | Limitacoes / oportunidade Atlas |
|---|---|---|---|
| **Consignet** | Averbadora multi-prefeitura | UX consolidada, multi-convenio, relatorios extensos, base massiva | App mobile servidor fraco/inexistente, UX legada visual, sem marketplace |
| **iFractal / IF** | Plataforma para bancos/correspondentes | API REST madura (vide `integracao_exemplo/`), fluxos averbacao maduros | Front antigo, sem mobile, sem edge |
| **Zetra (ZetraSoft)** | Folha + consignado para estados/municipios | Portabilidade robusta, base em estados | UX form-heavy, sem mobile, processos lentos |
| **e-Consig / paySmart** | Backoffice INSS + estadual | Estabelecida em folha INSS, bom relacionamento com bancos | Pouco municipal, sem marketplace ao servidor |
| **Sinqia** | Plataforma bancaria completa | Modulo consignado integrado a core bancario | Generalista — Atlas vence em foco e velocidade |
| **Facta / BMG Consig** | Plataformas proprias dos bancos | Operacao integrada ao back-office do banco | Amarram correspondente a um banco — Atlas e neutro |
| **Conlight / SerCons** | Averbadoras regionais menores | Atendimento proximo | Tecnologia limitada, escalabilidade baixa |

## Features esperadas pelo mercado (baseline)

Toda averbadora seria precisa entregar:

1. **Multi-convenio** com switcher
2. **Busca por CPF ou matricula** (banco) — campos paralelos
3. **Calculo de margem** com competencia (mes/ano) + projecao futura
4. **Reserva de margem** (lock pre-contrato)
5. **Averbacao** direta (Emprestimo + Refin)
6. **Reservas especiais:** Refin, Composta, Portabilidade
7. **Gerenciador de contratos** com filtros multiplos e exportacao
8. **Detalhe de contrato** com tabs (Contrato, Parcelas, Financiamento, Historico)
9. **Acoes em contratos:** Imprimir comprovante, Quitar, Suspender, Cancelar, Alongar, Alterar
10. **Tabelas de emprestimo** por convenio (taxas + prazos)
11. **Cadastro de usuarios do banco** (perfis: admin, operador, consulta, relatorios)
12. **Relatorios:** Consignacoes, Faturamento, Gerador customizado
13. **Comunicados** entre averbadora e bancos
14. **API publica** para integracao com sistemas do banco

## Onde Atlas diferencia

1. **App mobile nativo (iOS + Android) para o servidor** — concorrentes tem web responsivo ou nada. Atlas tem RN + Expo + biometria nativa + push real-time.
2. **Edge computing global (Cloudflare Workers)** — latencia tipica < 180ms p50 mesmo no interior. Concorrentes em data center unico tem 400-800ms.
3. **Marketplace de ofertas pre-aprovadas no app do servidor** — banco oferece, servidor aceita em 3 cliques (auto-averbacao). Nao existe no mercado de averbadora.
4. **Design system moderno** — UX 2026 com dark/light, microinteracoes, acessibilidade. Concorrentes parecem 2010.
5. **Observabilidade nativa** — Sentry + logs estruturados + trace_id ponta-a-ponta. Operadores reclamam que nos concorrentes "nao sabem o que aconteceu".
6. **OpenAPI publico + SDK TS/Python** — concorrentes tem PDFs com curl. Onboarding de banco em 5 dias.
7. **Custos transparentes** — modelo SaaS por consumo, sem caixas pretas.

## O que NAO somos (decidido conscientemente)

- **Nao somos plataforma bancaria** (vs Sinqia). Foco em averbacao.
- **Nao somos correspondente exclusivo** (vs Facta/BMG). Atlas e neutro.
- **Nao somos consultoria** (vs alguns concorrentes regionais). Vendemos software + SLA.

## Implicacoes praticas

1. Toda feature do banco que existe na Consignet, **precisamos ter pelo menos um equivalente funcional**, mesmo que enxuto, antes do GA.
2. Marketplace + app mobile sao bandeiras de venda — implementar com qualidade premium.
3. Relatorios sao parity-feature; podemos ser bons sem ser revolucionarios.
4. Vale investir em assistente AI no admin (futuro) para apontar quitacoes recomendadas, propostas com alta probabilidade de aceite, etc.

## Material de referencia neste repo

- `breafing_base_concorrentes/prints/banco/consignet_*.jpg` — 21 prints da Consignet
- `breafing_base_concorrentes/resumo-da-reuniao.txt` — requisitos detalhados do cliente
- `integracao_exemplo/Rotas Banco 1/` — fluxos BPMN da iFractal
- `specs/concorrentes.md` — versao detalhada deste mapeamento por feature
