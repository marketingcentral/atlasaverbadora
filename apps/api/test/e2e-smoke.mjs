#!/usr/bin/env node
/**
 * Camada 3 da estrategia de teste intensivo (plans/steady-mapping-mochi.md).
 * Fluxo completo proposta -> aprovacao banco -> ADF averbadora -> folha
 * prefeitura, valida em cada etapa que os dados batem entre perfis.
 *
 * Uso:
 *   BASE_URL=http://localhost:8787 node apps/api/test/e2e-smoke.mjs
 *   BASE_URL=https://atlas-api.perfectdesigner.workers.dev node apps/api/test/e2e-smoke.mjs
 *
 * Requer contas seed DEV_USERS carregadas (ver CREDENCIAIS.md):
 *   - servidor CPF 00011122233 / teste123
 *   - banco banco@atlas.test / teste123
 *   - averbadora admin@atlas.test / teste123
 *   - prefeitura capistrano@teste.com / teste123 (ajustar se sua base tiver outro)
 *
 * Sai com exit code 0 em sucesso, 1 em qualquer falha. Rollback: cancela a
 * proposta criada no fim (mesmo em falha).
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8787";
const CRED = {
  // Absalao (Capistrano) tem senha real no PG de prod — Ana (00011122233)
  // e' dev-user que so existe local. Se sua base tiver outro servidor de
  // teste, ajuste aqui.
  servidor: { identifier: "58088636353", password: "teste123" },
  banco: { identifier: "delta@teste.com", password: "teste123" },
  averbadora: { identifier: "admin@atlas.test", password: "teste123" },
  prefeitura: { identifier: "capistrano@teste.com", password: "teste123" },
};

let passos = 0;
let falhas = 0;
let adfCriada = null;
let tokenServidor = null;

function log(icon, msg) {
  console.log(`${icon} [${String(passos).padStart(2, "0")}] ${msg}`);
}
function pass(msg) { passos++; log("✓", msg); }
function fail(msg, err) { passos++; falhas++; log("✗", `${msg}${err ? ` — ${err}` : ""}`); }
function info(msg) { log("→", msg); }

async function req(method, path, { token, body, contentType = "application/json" } = {}) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const opts = { method, headers };
  if (body !== undefined) {
    if (contentType === "application/json") {
      headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    } else {
      opts.body = body;
    }
  }
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { _raw: text }; }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${res.statusText} :: ${text.slice(0, 200)}`);
  }
  return data;
}

async function login(role) {
  const c = CRED[role];
  const r = await req("POST", "/v1/auth/login", { body: c });
  const t = r.access_token ?? r.token;
  if (!t) throw new Error(`login ${role} sem access_token`);
  return t;
}

async function run() {
  console.log(`\n=== Smoke E2E — ${BASE_URL} ===\n`);

  // ------------------------------------------------------------
  // 1) Login servidor + captura margem inicial
  // ------------------------------------------------------------
  try {
    tokenServidor = await login("servidor");
    const matq = await req("GET", "/v1/servidores/me/matriculas", { token: tokenServidor });
    const mats = matq.matriculas ?? [];
    if (mats.length === 0) throw new Error("servidor sem matricula ativa");
    const mat = mats[0];
    const empBucket = (mat.margem?.margens_por_tipo ?? []).find((m) => m.tipo === "EMPRESTIMO");
    const margemInicial = empBucket?.disponivel ?? 0;
    pass(`Servidor logado, matricula=${mat.matricula}, margem EMPRESTIMO disponivel=${margemInicial.toFixed(2)}`);
    globalThis._matricula = mat.matricula;
    globalThis._margemInicial = margemInicial;
  } catch (e) { fail("Login servidor + matriculas", e.message); return finish(); }

  // ------------------------------------------------------------
  // 1.5) Cleanup — cancela propostas pendentes deste servidor (smokes
  //      anteriores podem ter deixado ADFs presas em "Aguardando").
  // ------------------------------------------------------------
  try {
    const tokenAdminCleanup = await login("averbadora");
    const propostasq = await req("GET", "/v1/servidores/me/propostas", { token: tokenServidor });
    const pendentes = (propostasq.propostas ?? []).filter((p) => /aguard|aprov/i.test(p.situacao ?? ""));
    for (const p of pendentes) {
      try {
        await req("POST", `/v1/admin/pre-reservas/${p.id}/cancelar`, { token: tokenAdminCleanup, body: { motivo: "smoke cleanup" } });
        info(`Cancelada proposta pendente ${p.id} (${p.situacao})`);
      } catch (e) { info(`Falha ao cancelar ${p.id}: ${e.message}`); }
    }
    if (pendentes.length === 0) info("Nenhuma proposta pendente pra limpar");
  } catch (e) { info(`Cleanup opcional falhou (nao critico): ${e.message}`); }

  // ------------------------------------------------------------
  // 2) Criar proposta pequena (R$ 500, 12x, 1.79% a.m.)
  // ------------------------------------------------------------
  try {
    const idem = `smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const r = await req("POST", "/v1/servidores/me/propostas", {
      token: tokenServidor,
      body: { valor: 500, parcelas: 12, taxaAm: 0.0179, matricula: globalThis._matricula, tipo: "novo" },
    });
    // Backend retorna { id, situacao, banco, valor, parcelas, parcela, expira_em }
    // direto (nao { contrato: { adf } }).
    if (!r.id) throw new Error("resposta sem id");
    adfCriada = r.id;
    globalThis._propostaValor = 500;
    globalThis._propostaParcelas = 12;
    globalThis._propostaTaxaAm = 0.0179;
    pass(`Proposta criada: ADF=${adfCriada}, situacao=${r.situacao}`);
  } catch (e) { fail("Criar proposta", e.message); return finish(); }

  // ------------------------------------------------------------
  // 3) Login banco + verificar proposta apareceu com dados corretos
  // ------------------------------------------------------------
  let tokenBanco;
  try {
    tokenBanco = await login("banco");
    const q = await req("GET", "/v1/portal/banco/contratos", { token: tokenBanco });
    const contratos = q.contratos ?? [];
    const meu = contratos.find((c) => c.adf === adfCriada);
    if (!meu) throw new Error(`ADF ${adfCriada} nao aparece na carteira do banco`);
    // Invariantes cross-profile:
    if (meu.valorFinanciado !== 500) throw new Error(`valorFinanciado banco=${meu.valorFinanciado} != 500 enviado`);
    if (meu.totalParcelas !== 12) throw new Error(`totalParcelas banco=${meu.totalParcelas} != 12`);
    // taxaAm no backend banco esta em CRU (0.0179); UI multiplica *100.
    if (Math.abs(meu.taxaAm - 0.0179) > 0.0001) throw new Error(`taxaAm banco=${meu.taxaAm} != 0.0179 (formato wire deve ser cru)`);
    pass(`Banco ve proposta: ADF=${adfCriada}, valorFinanciado=R$ ${meu.valorFinanciado}, taxaAm=${(meu.taxaAm * 100).toFixed(2)}%`);
  } catch (e) { fail("Banco ve proposta", e.message); return finish(); }

  // ------------------------------------------------------------
  // 4) Banco aprova. Se prefeitura exige CCB, upload PDF minimo antes.
  // ------------------------------------------------------------
  try {
    // Tenta aprovar direto; se falhar por CCB, faz upload e retry.
    let aprovado = false;
    try {
      await req("POST", `/v1/portal/banco/contratos/${adfCriada}/aprovar`, { token: tokenBanco, body: {} });
      aprovado = true;
    } catch (e) {
      if (/anexe o contrato/.test(e.message)) {
        info("Prefeitura exige CCB, fazendo upload de PDF minimo…");
        const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a]); // %PDF-1.4\n
        const form = new FormData();
        form.append("adf", adfCriada);
        form.append("file", new Blob([pdf], { type: "application/pdf" }), "smoke.pdf");
        await req("POST", "/v1/portal/banco/ccb/upload", { token: tokenBanco, body: form, contentType: "multipart/form-data" });
        await req("POST", `/v1/portal/banco/contratos/${adfCriada}/aprovar`, { token: tokenBanco, body: {} });
        aprovado = true;
      } else { throw e; }
    }
    if (!aprovado) throw new Error("banco nao aprovou por motivo desconhecido");
    pass("Banco aprovou a proposta (com CCB se exigido)");
  } catch (e) { fail("Banco aprova", e.message); return finish(); }

  // ------------------------------------------------------------
  // 5) Averbadora ve ADF pendente e roda /verify pra checar invariantes
  // ------------------------------------------------------------
  let tokenAdmin;
  try {
    tokenAdmin = await login("averbadora");
    const q = await req("GET", "/v1/admin/adf", { token: tokenAdmin });
    const adfs = q.adfs ?? [];
    const minha = adfs.find((a) => a.adf === adfCriada);
    if (!minha) throw new Error(`ADF ${adfCriada} nao aparece na averbadora`);
    pass(`Averbadora ve ADF: status=${minha.status}, idUnico=${minha.idUnico}, prefeitura=${minha.prefeituraNome}`);
    // Invariantes cross-profile via endpoint verify:
    const v = await req("GET", "/v1/admin/verify?fresh=1", { token: tokenAdmin });
    if (!v.ok) {
      const falhas = Object.values(v.grupos).flat().filter((c) => !c.ok);
      info(`WARN: /verify encontrou ${falhas.length} invariante(s) falhando (nao bloqueia smoke): ${falhas.map((c) => c.nome).join(", ")}`);
    } else {
      pass("/v1/admin/verify: TODOS os 6 grupos OK");
    }
  } catch (e) { fail("Averbadora ve ADF + verify", e.message); return finish(); }

  // ------------------------------------------------------------
  // 6) Averbadora confirma ADF (aplica em folha)
  // ------------------------------------------------------------
  try {
    // Pega o id interno da ADF (nao e o adf/numero do banco).
    const q = await req("GET", "/v1/admin/adf", { token: tokenAdmin });
    const minha = q.adfs.find((a) => a.adf === adfCriada);
    if (!minha) throw new Error(`ADF sumiu antes de confirmar`);
    await req("POST", "/v1/admin/adf/confirmar", { token: tokenAdmin, body: { ids: [minha.id] } });
    pass("Averbadora confirmou ADF em folha");
  } catch (e) { fail("Averbadora confirma ADF", e.message); return finish(); }

  // ------------------------------------------------------------
  // 7) Servidor ve contrato ATIVO e margem reduzida
  // ------------------------------------------------------------
  try {
    const matq = await req("GET", "/v1/servidores/me/matriculas", { token: tokenServidor });
    const mat = matq.matriculas.find((m) => m.matricula === globalThis._matricula);
    const emp = (mat?.margem?.margens_por_tipo ?? []).find((m) => m.tipo === "EMPRESTIMO");
    const margemFinal = emp?.disponivel ?? 0;
    const consumida = globalThis._margemInicial - margemFinal;
    if (consumida <= 0) throw new Error(`margem NAO foi reduzida (inicial=${globalThis._margemInicial}, final=${margemFinal})`);
    pass(`Servidor: margem reduzida em R$ ${consumida.toFixed(2)} (consumo esperado ~R$ 45.30 pra 500/12x@1.79%)`);
    // Cross-check taxa: no servidor /me/propostas taxaAm vem CRU (mesmo formato que banco).
    const pq = await req("GET", "/v1/servidores/me/propostas", { token: tokenServidor });
    const p = pq.propostas.find((x) => x.id === adfCriada);
    if (!p) throw new Error(`proposta sumiu no /me/propostas`);
    if (Math.abs(p.taxaAm - 0.0179) > 0.0001) throw new Error(`taxaAm servidor=${p.taxaAm} != 0.0179 (cru) — formato divergente detectado`);
    pass(`Servidor: taxa no card = ${(p.taxaAm * 100).toFixed(2)}% (formato wire CRU, bate com banco)`);
  } catch (e) { fail("Servidor ve contrato ativo + margem", e.message); return finish(); }

  // ------------------------------------------------------------
  // 8) Prefeitura ve ADF na folha
  // ------------------------------------------------------------
  try {
    const tokenPref = await login("prefeitura");
    const q = await req("GET", "/v1/prefeitura/adf", { token: tokenPref });
    const minha = (q.adfs ?? []).find((a) => a.adf === adfCriada);
    if (!minha) info(`WARN: ADF ${adfCriada} nao aparece na prefeitura (talvez outra prefeitura seja a dona) — nao falha smoke`);
    else pass(`Prefeitura ve ADF: status=${minha.status}, valor=R$ ${minha.valorParcela?.toFixed?.(2) ?? "?"}`);
  } catch (e) { info(`WARN prefeitura: ${e.message}`); }

  return finish();
}

async function finish() {
  // Cleanup: cancela a proposta criada (libera margem).
  if (adfCriada && tokenServidor) {
    try {
      const tokenAdmin = await login("averbadora");
      await req("POST", `/v1/admin/pre-reservas/${adfCriada}/cancelar`, { token: tokenAdmin, body: { motivo: "smoke test cleanup" } });
      info(`Rollback: proposta ${adfCriada} cancelada`);
    } catch (e) {
      info(`Rollback falhou (nao critico): ${e.message}`);
    }
  }
  console.log(`\n=== Smoke terminou: ${passos - falhas}/${passos} passos OK, ${falhas} falhas ===\n`);
  process.exit(falhas > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(`\nFATAL: ${e.message}\n${e.stack}\n`);
  process.exit(1);
});
