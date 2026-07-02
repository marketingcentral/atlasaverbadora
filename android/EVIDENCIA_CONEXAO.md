# Evidência de conexão com o backend (dados reais)

O app Android fala **exclusivamente com a API REST do Atlas** (`apps/api`, Cloudflare
Worker), que lê o **PostgreSQL de produção** (`atlas_app@65.109.134.78:5434`). O app **nunca**
abre conexão direta com o Postgres — a senha do banco não existe em lugar nenhum do APK
(arquitetura correta e segura).

## 1. Endpoint embutido em cada APK (verificado no `.dex`)

| APK | `API_BASE_URL` embutido |
|-----|--------------------------|
| `atlas-servidor-release-unsigned.apk` | `https://atlas-api.perfectdesigner.workers.dev/` (produção) |
| `atlas-servidor-debug.apk` | `http://10.0.2.2:8787/` (API local via emulador) |

Confirmado com `unzip -p <apk> classes*.dex | strings | grep`.

## 2. A API de produção responde com dados reais

Chamadas reais aos mesmos endpoints que o app consome (persona servidor, CPF `00011122233`):

```
POST /v1/auth/login              -> role=servidor | user: ADRIANA MARQUES DA SILVA | JWT RS256 emitido
GET  /v1/servidores/me           -> ADRIANA MARQUES DA SILVA | mat 852029100 | ***.***.***-33
GET  /v1/servidores/me/matriculas-> 2 matrículas; margem disponível R$ 1.601,52; 1 contrato ativo
GET  /v1/servidores/me/ofertas   -> 2 ofertas: DELTA GLOBAL/CASTRO, DELTA GLOBAL/FLORIPA
```

Esses dados correspondem às 4 linhas reais da tabela `servidores` no Postgres de produção
(inspecionadas diretamente via cliente `postgres`).

## 3. Fluxo de autenticação/refresh

- `POST /v1/auth/login` → guarda `access_token` (15 min) + `refresh_token` (30 d) em
  EncryptedSharedPreferences.
- `AuthInterceptor` injeta `Authorization: Bearer <access>` em toda chamada autenticada.
- `TokenAuthenticator` detecta `401`, chama `POST /v1/auth/refresh`, rotaciona o par de
  tokens e repete a requisição original uma vez. Falha → sessão limpa → volta ao login.

## Como reproduzir localmente contra o app real

```bash
# 1. subir a API local
pnpm --filter @atlas/api dev            # http://localhost:8787

# 2. instalar o APK de debug no emulador (fala com 10.0.2.2:8787)
adb install -r android/dist/atlas-servidor-debug.apk

# 3. login com CPF 00011122233 / senha teste123
```
