// Lock de simulacao por (matricula, produto). Quando o usuario solicita uma
// simulacao, a margem daquele produto especifico fica travada por 48h — os
// outros produtos (emprestimo, cartao consignado, cartao beneficio) tem
// margens independentes e nao devem se contaminar (bug relatado pelo cliente).
// Em prod isso seria gerenciado pelo backend (DB + worker cron); no mockup,
// persistimos o timestamp de expiracao em localStorage.

const KEY = "atlas:simulationLock";
const LOCK_DURATION_MS = 48 * 60 * 60 * 1000;

/** Produtos com margem independente — cada um trava sua propria margem. */
export type LockProduto = "EMPRESTIMO" | "CARTAO_CONSIGNADO" | "CARTAO_BENEFICIOS";

interface LockMap {
  // Chave = `${idMatricula}:${produto}`. Valor = timestamp em ms quando o lock expira.
  [key: string]: number;
}

/** Compoe a chave do localStorage a partir de matricula + produto. */
function lockKey(idMatricula: string, produto: LockProduto): string {
  return `${idMatricula}:${produto}`;
}

function read(): LockMap {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as LockMap;
  } catch {
    return {};
  }
}

function write(map: LockMap): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/** Cria/renova o lock de 48h para o par (matricula, produto). */
export function setLock(idMatricula: string, produto: LockProduto = "EMPRESTIMO"): number {
  const map = read();
  const expiresAt = Date.now() + LOCK_DURATION_MS;
  map[lockKey(idMatricula, produto)] = expiresAt;
  write(map);
  return expiresAt;
}

/** Retorna o timestamp de expiracao se existe lock ativo para (matricula, produto),
 *  ou null. Um lock de EMPRESTIMO NAO bloqueia CARTAO_CONSIGNADO nem vice-versa. */
export function getActiveLock(idMatricula: string | null, produto: LockProduto = "EMPRESTIMO"): number | null {
  if (!idMatricula) return null;
  const map = read();
  const k = lockKey(idMatricula, produto);
  const ts = map[k];
  if (!ts) return null;
  if (ts <= Date.now()) {
    // Expirado — limpa a entrada especifica.
    delete map[k];
    write(map);
    return null;
  }
  return ts;
}

/** Limpa o lock de (matricula, produto). Para uso em logout ou caso especial. */
export function clearLock(idMatricula: string, produto: LockProduto = "EMPRESTIMO"): void {
  const map = read();
  delete map[lockKey(idMatricula, produto)];
  write(map);
}

/** Formata `ms` restantes em HH:MM:SS. */
export function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`;
}

export const SIMULATION_LOCK_KEY = KEY;
