# Atlas — Mapeamento detalhado de concorrentes

Documento vivo. Atualizar quando descobrirmos features novas dos concorrentes ou lancarmos as nossas.

## Matriz de features

Legenda: ✅ tem · ⚠️ parcial · ❌ nao tem · 🚀 forca Atlas

| Feature | Consignet | iFractal | Zetra | e-Consig | Atlas |
|---|---|---|---|---|---|
| Visao Geral / Dashboard banco | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Cards KPI (Carteira, Novos, Pendencias, Data corte) | ✅ | ❌ | ⚠️ | ⚠️ | ✅ |
| Carrossel de comunicados | ✅ | ❌ | ❌ | ⚠️ | ✅ |
| Convenio ativo + switcher | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Busca por CPF ou Matricula | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mascara CPF + revelar | ✅ | ❌ | ⚠️ | ❌ | ✅ |
| Calculo margem com competencia | ✅ | ✅ | ✅ | ✅ | ✅ |
| Projecao margem 4 meses | ✅ | ❌ | ⚠️ | ⚠️ | ✅ |
| Reserva Emprestimo | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reserva Refin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reserva Composta | ✅ | ⚠️ | ✅ | ⚠️ | ✅ |
| Reserva Portabilidade | ✅ | ✅ | ✅ | ✅ | ✅ |
| Averbacao direta | ✅ | ✅ | ✅ | ✅ | ✅ |
| Lista contratos do colaborador inline | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ |
| Gerenciador contratos com filtros | ✅ | ✅ | ✅ | ✅ | ✅ |
| Exportar dados | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Detalhe contrato com tabs (>=7) | ✅ | ⚠️ | ✅ | ⚠️ | ✅ |
| Imprimir comprovante PDF | ✅ | ✅ | ✅ | ✅ | ✅ |
| Quitar contrato | ✅ | ✅ | ✅ | ✅ | ✅ |
| Suspender contrato | ✅ | ⚠️ | ✅ | ⚠️ | ✅ |
| Cancelar contrato | ✅ | ✅ | ✅ | ✅ | ✅ |
| Alongar contrato | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ (fase 2) |
| Alterar contrato | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ (fase 2) |
| Tabela emprestimos por convenio (CRUD) | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Cadastro usuarios do banco | ✅ | ✅ | ✅ | ✅ | ✅ |
| Perfis (admin/operador/consulta/relatorios) | ✅ | ⚠️ | ✅ | ⚠️ | ✅ |
| IP allowlist por usuario | ⚠️ | ❌ | ⚠️ | ⚠️ | ✅ |
| Relatorio Consignacoes | ✅ | ✅ | ✅ | ✅ | ✅ |
| Relatorio Faturamento | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Gerador relatorios customizados | ✅ | ❌ | ✅ | ⚠️ | ⚠️ (fase 2) |
| API REST publica + OpenAPI | ⚠️ | ✅ | ⚠️ | ❌ | 🚀 ✅ |
| SDK TS / Python | ❌ | ❌ | ❌ | ❌ | 🚀 ✅ |
| **App mobile servidor (nativo iOS+Android)** | ❌ | ❌ | ❌ | ⚠️ | 🚀 ✅ |
| **Biometria mobile** | ❌ | ❌ | ❌ | ❌ | 🚀 ✅ |
| **Marketplace ofertas pre-aprovadas no app** | ❌ | ❌ | ❌ | ❌ | 🚀 ✅ |
| **Push notifications real-time** | ❌ | ❌ | ❌ | ⚠️ | 🚀 ✅ |
| **Edge computing (lat < 180ms p50)** | ❌ | ❌ | ❌ | ❌ | 🚀 ✅ |
| **Observabilidade nativa (Sentry + traces)** | ❌ | ⚠️ | ❌ | ⚠️ | 🚀 ✅ |
| **Sandbox publico para bancos** | ⚠️ | ✅ | ⚠️ | ❌ | 🚀 ✅ |
| Dark / light theme | ❌ | ❌ | ❌ | ❌ | 🚀 ✅ |
| Multi-tenancy de bancos | ✅ | ✅ | ✅ | ✅ | ✅ |
| Webhooks de eventos | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ |
| Auditoria append-only | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ |

## Pontos de friccao reportados em sistemas concorrentes (fontes: reunião + forums)

1. "Quando da erro nao sei o que aconteceu" -> Atlas tem trace_id + logs estruturados
2. "Sistema cai e fico sem trabalhar" -> edge nao tem ponto unico
3. "Demora dias para integrar novo banco" -> Atlas tem OpenAPI + SDK + adapter pattern (onboard 5 dias)
4. "Servidor nao consegue ver propria margem facil" -> app mobile Atlas resolve
5. "Operador esquece de fazer reserva e perde proposta" -> alertas push + workflow no Atlas
6. "Relatorios em Excel desatualizados" -> Atlas tem export em tempo real + API
7. "UX feita por banco, nao por operador" -> Atlas testou com operadores reais (sessao Sessao 2)

## Estrategia de migracao de cliente Consignet -> Atlas

1. **Espelhar vocabulario** (Convenio, Margem/Contratacao, Gerenciador, ADF, etc.)
2. **Manter atalhos de teclado** comuns (a definir apos pesquisa)
3. **Importar base** via CSV/XLSX (modulo na averbadora)
4. **Treinamento curto** (3 horas) — material visual side-by-side
5. **Suporte dedicado** primeiros 60 dias

## Roadmap competitivo

- **Trimestre 1:** parity essencial (tudo acima marcado ⚠️/✅ para Atlas) + bandeiras (app mobile + marketplace + edge)
- **Trimestre 2:** features avancadas (alongar, alterar, gerador relatorios, multi-tenancy banco)
- **Trimestre 3:** diferenciais (AI copilot para operador, analytics preditivo de aprovacao, sandbox publico)
- **Trimestre 4:** verticais (servidor estadual, INSS, militar — alem do municipal)
