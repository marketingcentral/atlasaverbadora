# Atlas Servidor — App Android nativo

App nativo Android (Kotlin + Jetpack Compose) para a persona **Servidor** da plataforma
Atlas Averbadora. Consome a API REST do Atlas (`apps/api`, Cloudflare Worker), que por sua
vez lê o PostgreSQL de produção. **O app nunca fala direto com o Postgres** — todo acesso a
dados é via API REST autenticada (arquitetura correta e segura).

## Stack

- **Kotlin** + **Jetpack Compose** (Material 3), navegação com Navigation-Compose
- **MVVM** — `ViewModel` + Compose State/`LiveData` + **Coroutines**
- **Retrofit + OkHttp + Gson** para HTTP; interceptor de bearer + `Authenticator` que
  rotaciona o refresh token em 401
- **Room** para cache offline (read-through) + solicitações locais do servidor
- **EncryptedSharedPreferences** (AES256 / Android Keystore) para os tokens de sessão
- DI manual via `ServiceLocator` (sem Hilt/kapt — build de linha de comando confiável)

## Configuração de endpoint (onde o app aponta)

Definido por *build type* em [`app/build.gradle.kts`](app/build.gradle.kts) via `BuildConfig`:

| Build      | `API_BASE_URL`                                        | Uso |
|------------|-------------------------------------------------------|-----|
| **debug**  | `http://10.0.2.2:8787/`                               | API local (`pnpm --filter @atlas/api dev`), acessada do emulador |
| **release**| `https://atlas-api.perfectdesigner.workers.dev/`      | API de produção (dados reais do Postgres) |

`10.0.2.2` é o alias do `localhost` da máquina host visto de dentro do emulador Android.
Para trocar a URL, edite os `buildConfigField("String", "API_BASE_URL", ...)` — não há URL
hardcoded em nenhum outro lugar.

## Pré-requisitos

- JDK 17
- Android SDK (platform-tools, `platforms;android-34`, `build-tools;34.0.0`)
- `ANDROID_HOME` apontando para o SDK, ou um `local.properties` com `sdk.dir=...`

## Como compilar

```bash
cd android

# APK de debug (aponta pra API local em 10.0.2.2:8787)
./gradlew :app:assembleDebug
# -> app/build/outputs/apk/debug/app-debug.apk

# APK de release (aponta pra API de produção). Não assinado por padrão:
./gradlew :app:assembleRelease
# -> app/build/outputs/apk/release/app-release-unsigned.apk
```

### Instalar no dispositivo/emulador

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Rodar contra a API local (fluxo de dev)

```bash
# 1. suba a API (na raiz do monorepo)
pnpm --filter @atlas/api dev            # http://localhost:8787

# 2. rode o app debug no emulador — ele fala com 10.0.2.2:8787
```

## Credenciais de teste (servidor)

Login por **CPF**. Contas de demonstração (ver `CREDENCIAIS.md` na raiz):

| CPF           | Senha      |
|---------------|------------|
| `00011122233` | `teste123` |
| `00011122234` | `teste123` |

## Estrutura

```
app/src/main/java/io/atlas/servidor/
  core/           ServiceLocator (DI), UiState, Network (erros), AppPrefs
  data/
    remote/       ApiService, AuthApi, DTOs, AuthInterceptor, TokenAuthenticator
    local/        Room (AppDatabase, DAOs, entities), TokenStore (cripto)
    repository/   AuthRepository, ServidorRepository
  domain/         Simulation (tabela Price), Format (R$, %, CPF)
  ui/
    theme/        cores/tipografia do design system Atlas
    components/    botões, cards, chips, estados de loading/erro
    navigation/    grafo de navegação
    auth/ matricula/ shell/ inicio/ contratos/ conta/ simular/ analise/ margem/
```

## Telas implementadas

Login · Primeiro acesso · Selecionar matrícula · Início (margem + ofertas) ·
Simular empréstimo · Em análise · Contratos & Histórico · Conta · Margem consignável.

## Endpoints consumidos

- `POST /v1/auth/login`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`
- `GET /v1/servidores/me`
- `GET /v1/servidores/me/matriculas` (perfil + margem + contratos + portabilidade)
- `GET /v1/servidores/me/ofertas` (marketplace)

## Offline

`ServidorRepository` faz *network-first com fallback de cache*: sucesso grava o JSON no Room;
falha de rede devolve a última cópia salva marcada como "dados salvos". As solicitações de
proposta (simular → solicitar) são persistidas localmente no Room e aparecem em **Em análise**.
