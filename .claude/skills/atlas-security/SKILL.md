---
name: atlas-security
description: Use whenever working on authentication, authorization, personal data (PII), external integrations (banks, prefeituras), webhooks, secrets, or anything that handles servidor/banco/averbadora data — applies OWASP Top 10, LGPD, BACEN and Atlas-specific security rules.
---

# Atlas — Security

## Auth & sessions
- **JWT RS256.** Access token 15 min, refresh token 30 days (rotativo).
- Signing key in Worker Secret. Public key in KV with `kid` rotation quarterly.
- Refresh tokens stored in KV keyed by `device_id + user_id`. Revoke = delete key.
- Login attempts: **5 fails / 15 min** per identifier — then 30 min lockout. Track in KV.
- **Biometric** (mobile) gates access to the app but does NOT replace server-side auth — biometric unlocks the refresh token in SecureStore, server still validates JWT.

## Authorization (RBAC)
- 3 roles: `servidor`, `banco`, `averbadora`. Stored in JWT claim `role`.
- Middleware `requireRole('averbadora')` on every admin route.
- `servidor` can only access `/v1/servidores/me/*` — never another servidor's data.
- `banco` only sees propostas with `banco_id === jwt.banco_id`.
- Resource-level checks even after route guard — defense in depth.

## PII handling (LGPD)
- **Always mask in logs:** `cpf` → `***.***.***-88`, `email` → `j***@***.com`, full names → first name + initial.
- Use helper `maskPII(obj, ['cpf', 'email', 'nome'])` before any `logger.info(obj)`.
- Audit log records WHO accessed WHAT WHEN — append-only, never updated/deleted.
- Right to erasure: anonymization function `anonymizeServidor(id)` keeps stats but removes PII.
- Consent recorded with `consentimento_versao` + timestamp. Block API calls when consent missing.

## External integrations (bancos)
- **OAuth2 client_credentials** to obtain bank token. Cache with refresh at 80% TTL.
- **mTLS** when bank supports it — client cert in Worker Secret as PEM, bound at Cloudflare edge.
- **Idempotency-Key** header on every POST to bank. Store key in KV for 24h to dedup retries.
- **Retry**: exponential backoff (250ms, 750ms, 2.5s) — 3 attempts max — then dead-letter queue.
- **Timeout**: 1.2s per bank per call. Fan-out simulations parallel with `Promise.allSettled`.

## Webhooks (banco → Atlas)
- Verify HMAC-SHA256 signature with shared secret per banco. Reject if missing or invalid.
- Verify `X-Atlas-Event` is in allow-list. Reject unknown events with 400.
- Dedupe by `X-Atlas-Idempotency` key — store in KV 24h, reject duplicates with 200 (idempotent).
- Body size limit: 64KB. Reject larger with 413.
- Respond 200 only after persisting; if processing fails, return 5xx so bank retries.

## Secrets
- **NEVER** commit secrets. Use:
  - Workers: `.dev.vars` (gitignored) for local; `wrangler secret put` for prod.
  - Web: only `VITE_*` env vars (public). Real secrets go via API.
  - Mobile: `expo-secure-store` for tokens; never `AsyncStorage` for sensitive data.
- Add to `.gitignore` BEFORE creating any sensitive file: `.dev.vars`, `*.pem`, `*.key`, `.env*` (except `.env.example`).

## Rate limits
- **600 req/min per access token**, burst 100 in 10s. Headers `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
- Implement with KV: key `rl:<token_hash>:<minute>`, increment, TTL 60s.
- 429 response with `Retry-After` header.

## OWASP Top 10 checklist (apply per PR)
1. **Broken Access Control** — route guard + resource check
2. **Cryptographic Failures** — TLS 1.3, RS256, no MD5/SHA1 for auth
3. **Injection** — Drizzle ORM parameterized queries only; never string-build SQL
4. **Insecure Design** — threat model in `specs/security/threat-model.md`
5. **Misconfiguration** — `wrangler.toml`, CSP headers on web responses
6. **Vulnerable Components** — `pnpm audit` in CI; renovate-bot weekly
7. **Auth Failures** — see Auth section
8. **Software & Data Integrity** — verify webhook signatures
9. **Logging Failures** — JSON structured logs with `trace_id`, no PII
10. **SSRF** — never fetch user-provided URLs from server without allow-list

## Headers (web + API responses)
- `Content-Security-Policy: default-src 'self'; ...` (strict, no `unsafe-inline`)
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- CORS allow-list: only `app.atlas.io`, `admin.atlas.io`, `banco.atlas.io`

## Compliance pointers
- LGPD: see `specs/security/compliance-lgpd-bacen.md` for retention/consent matrix.
- BACEN Resolução 4.480 (consignado): respect data exchange protocols.
- Audit log retention: 5 years (BACEN).
