// Lock de simulacao por matricula. Quando o usuario solicita uma simulacao,
// a margem da matricula fica travada por 48h. Em prod isso seria gerenciado
// pelo backend (DB + worker cron); no mockup, persistimos o timestamp de
// expiracao em localStorage.

const KEY = "atlas:simulationLock";
const LOCK_DURATION_MS = 48 * 60 * 60 * 1000;

interface LockMap {
  [idMatricula: string]: number; // timestamp em ms quando o lock expira
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

/** Cria/renova o lock de 48h para a matricula. */
export function setLock(idMatricula: string): number {
  const map = read();
  const expiresAt = Date.now() + LOCK_DURATION_MS;
  map[idMatricula] = expiresAt;
  write(map);
  return expiresAt;
}

/** Retorna o timestamp de expiracao se existe lock ativo, ou null. */
export function getActiveLock(idMatricula: string | null): number | null {
  if (!idMatricula) return null;
  const map = read();
  const ts = map[idMatricula];
  if (!ts) return null;
  if (ts <= Date.now()) {
    // Expirado — limpa.
    delete map[idMatricula];
    write(map);
    return null;
  }
  return ts;
}

/** Limpa o lock (para uso em logout ou caso especial). */
export function clearLock(idMatricula: string): void {
  const map = read();
  delete map[idMatricula];
  write(map);
}

/** Formata `ms` restantes em HH:MM:SS. */
export function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export const SIMULATION_LOCK_KEY = KEY;
