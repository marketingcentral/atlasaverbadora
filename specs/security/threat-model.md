# Atlas — Threat Model (STRIDE simplificado)

## Ativos protegidos
1. **PII de servidores** — CPF, nome, salario, vinculo, matricula
2. **Sessoes** — JWT e refresh tokens
3. **Segredos** — chaves JWT, secrets de bancos, credenciais Postgres
4. **Audit log** — integridade do registro de propostas/contratos
5. **Disponibilidade** — SLA 99,9% mensal

## Atores
- Servidor (legitimo)
- Banco parceiro (autenticado)
- Averbadora (admin)
- Atacante externo
- Atacante interno (banco malicioso, dev malicioso)

## STRIDE

### S — Spoofing (falsa identidade)
| Ameaca | Mitigacao |
|---|---|
| Falso servidor com CPF roubado | Senha forte + biometria opcional + 2FA futuro |
| Banco falso registrando webhook | OAuth2 client_credentials emitido manualmente + HMAC signature verificada |
| Servidor abrindo sessao em dispositivo nao registrado | Notification email/SMS no primeiro acesso de novo `device_id` |

### T — Tampering (alteracao de dados)
| Ameaca | Mitigacao |
|---|---|
| Webhook payload adulterado | HMAC-SHA256 com secret rotacionavel por banco |
| Refresh token alterado | Token assinado RS256 + nonce + revogacao por device |
| Mudanca direta no DB | Acesso DB restrito + audit log append-only + Drizzle migrations versionadas |

### R — Repudiation
| Ameaca | Mitigacao |
|---|---|
| Servidor nega ter aceito proposta | Aceite registrado com `trace_id`, IP, user-agent, timestamp |
| Banco nega callback | `proposta_eventos` registra direcao + corpo hash |
| Admin nega acao destrutiva | Toda mutacao admin gera linha em `admin_audit_log` com `actor_user_id` |

### I — Information disclosure
| Ameaca | Mitigacao |
|---|---|
| PII em logs | `maskPII()` helper obrigatorio antes de `logger.info` |
| Vazamento via mensagem de erro | Erros sanitizados; stack trace so em DEV |
| IDOR (Insecure Direct Object Reference) | RBAC + resource-level checks (`if servidor_id != jwt.sub: 403`) |
| PII em URL/query string | Sempre em body POST; URLs nunca contem CPF cru |
| Cache no edge expondo dados de outro user | Cache key inclui `user_id`; nunca cache compartilhado para dados PII |

### D — Denial of Service
| Ameaca | Mitigacao |
|---|---|
| Flood de login | Rate-limit 5 tentativas / 15min por identifier + 60 req/min IP no /auth/login |
| Flood de simulacao | 600 req/min por token; circuit breaker por banco com p99 > 2s |
| Slow loris | Cloudflare ja mitiga |
| Webhook abuse (banco renviando 1000x) | Idempotency-Key dedupe |

### E — Elevation of privilege
| Ameaca | Mitigacao |
|---|---|
| Servidor virando averbadora | RBAC; role no JWT assinado; verificacao em todo middleware |
| Banco lendo propostas de outro banco | `WHERE banco_id = jwt.banco_id` em todas queries do portal banco |
| SQL injection elevando privilegios | Drizzle parametrizado, zero string-build de SQL |
| Dev malicioso fazendo deploy | CI bloqueia main sem 2 reviews; deploy production requer `prod_deployer` role |

## Cenarios criticos a testar

1. **CPF reuso** — servidor demitido tenta logar com sessao antiga → refresh deve falhar
2. **Banco comprometido** — secret HMAC vazada → tem rotacao mensal + revocar manualmente em painel
3. **Replay de webhook antigo** — Idempotency-Key + janela de 24h
4. **Escalada via JWT forjado** — RS256 com chave em Worker Secret, public key servida em `/.well-known/jwks.json`
5. **Dump do KV** — KV nao contem PII bruta, apenas hashes/refresh tokens (que sao trocados a cada uso)
