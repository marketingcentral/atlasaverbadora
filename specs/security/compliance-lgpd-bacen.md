# Atlas — Compliance LGPD + BACEN

## LGPD (Lei 13.709/2018)

### Bases legais aplicaveis
| Dado | Base legal | Justificativa |
|---|---|---|
| CPF, nome, matricula | Execucao de contrato | Necessario para averbacao |
| Salario, margem | Legitimo interesse | Calculo de oferta de credito solicitada pelo titular |
| Email, telefone | Consentimento | Comunicacao opcional |
| Localizacao precisa | Consentimento explicito | Recurso opcional |
| Dados biometricos | Consentimento | Login biometrico opcional, dado nunca sai do device |

### Direitos do titular (implementar endpoints)

| Direito | Endpoint | Prazo legal |
|---|---|---|
| Acesso (export dados) | `GET /v1/servidores/me/export-lgpd` | 15 dias |
| Correcao | `PATCH /v1/servidores/me` | imediato |
| Anonimizacao | `DELETE /v1/servidores/me` → marca para anonimizar | 30 dias |
| Portabilidade | `GET /v1/servidores/me/export-lgpd?formato=json` | 15 dias |
| Revogacao de consentimento | `POST /v1/servidores/me/consentimentos/{tipo}/revogar` | imediato |
| Informacao sobre compartilhamento | `GET /v1/servidores/me/compartilhamentos` | imediato |

### Tabela `consentimentos`
```
id, servidor_id, tipo, versao_texto, aceito_em, ip, user_agent, revogado_em
```
Tipos: `comunicacao_marketing`, `cookies_analytics`, `biometria`, `compartilhamento_banco_X`.

### Anonimizacao
Funcao `anonymizeServidor(id)`:
- Substitui nome, CPF, email, telefone, endereco por hash + `[ANONIMIZADO]`
- Mantem estatisticas (idade, prefeitura, situacao funcional) para BI
- Audit log preserva referencia `id` mas sem PII
- Contratos ativos: NAO permite anonimizar — apenas apos quitacao

### Retencao
| Tipo de dado | Retencao | Motivo |
|---|---|---|
| Sessao/JWT/refresh | 30 dias | Necessario operacional |
| Logs API | 30 dias quente, 12 meses frio | Diagnostico |
| PII de servidor inativo | 5 anos pos-ultima operacao | Defesa juridica |
| Audit log de proposta/contrato | 5 anos | BACEN exige |
| Cookies analytics | 12 meses | Renovacao de consent |
| Backups | 90 dias rolantes | Disaster recovery |

### DPO + canal
- Tabela `lgpd_requests` registra toda solicitacao com SLA
- Email `dpo@atlas.io` recebe avisos
- Pagina publica `/lgpd` com politica + cookies + formulario

### Incidentes
- Plano em `specs/security/incident-response.md` (TODO iteracao 8)
- Notificacao a ANPD em ate **48h** apos confirmacao de incidente grave

## BACEN

### Resolucoes aplicaveis
- **CMN 4.292/2013** — Portabilidade de credito
- **CMN 4.480/2016** — Open Banking pre-cursor
- **BCB 4.553/2017** — Cibersegurança em IFs (referencia para fornecedor)
- **CMN 5.135/2024** — Atualizacoes consignado servidor publico
- **LC 121/2024** — Limites e regras consignado servidor publico

### Obrigacoes que afetam Atlas

| Obrigacao | Implementacao |
|---|---|
| Audit log 5 anos | Tabela `proposta_eventos` append-only + backup R2 cold |
| CET sempre visivel | Schema da OpenAPI exige `cet_am`; UI nunca esconde |
| Portabilidade prazo 5 dias uteis cada lado | State machine + cron de SLA breach |
| Limite total margem 45% | Validacao no servidor de simulacao |
| Proibicao de TAC em consignado publico | Schema de produto rejeita `tac > 0` |
| Tabela TJM atualizada | Tabela `bacen_tjm` com versionamento por data efetiva |

### Compartilhamento de dados com bancos
- Servidor consente compartilhar margem + matricula com banco X ao iniciar simulacao
- Consentimento granular: revogar = remover banco X da fila de fanout
- Banco recebe APENAS dados necessarios (need-to-know) — nunca dados de outro banco

## Auditoria externa
- Pen-test anual por terceiro
- Certificacoes alvo: SOC 2 Type II (ano 1), ISO 27001 (ano 2)
- Bug bounty publico apos GA
