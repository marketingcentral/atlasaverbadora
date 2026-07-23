// Usuarios da averbadora — todos têm role="averbadora" no JWT.
// Autorizacao granular por RECURSO via campo `permissoes: string[]`.
// Presets (Supervisor/Operador/Comercial/Financeiro/Auditoria) sao apenas
// atalhos de preenchimento — a fonte da verdade e sempre `permissoes`.
// Campo `perfil` fica como label opcional (qual preset foi escolhido).

import { sha256Hex } from "./api-tokens.js";

/** Rotulos de preset — apenas label de UI. Nunca decide autorizacao. */
export type AverbadoraPerfil = "operador" | "supervisor" | "comercial" | "financeiro" | "auditoria" | "personalizado";

/** Presets: mapa preset -> lista de resource keys que ele pre-preenche.
 *  Supervisor = "*" (wildcard: acesso total). Os demais foram derivados da
 *  antiga MATRIX de averbadora-perms.ts (regra de acesso pre-refatoracao).
 *  Cliente PODE marcar/desmarcar caixas a partir do preset — vira personalizado. */
export const PRESETS: Record<AverbadoraPerfil, string[]> = {
  supervisor: ["*"],
  operador: [
    "dashboard", "health", "conta",
    "prefeituras", "convenios", "servidores", "pre-reservas",
    "tombamento", "adf", "beneficios", "telemedicina", "interessados",
  ],
  comercial: [
    "dashboard", "health", "conta",
    "vitrine", "comunicados", "comunicados-banco", "comunicados-servidor",
    "interessados",
  ],
  financeiro: [
    "dashboard", "health", "conta",
    "folhas", "bate-carteira", "adf",
  ],
  auditoria: [
    "dashboard", "health", "conta",
    "auditoria", "logs",
  ],
  personalizado: [],
};

/** True se as permissoes casam exatamente com um preset (mesmo conjunto de keys). */
export function detectarPreset(permissoes: string[]): AverbadoraPerfil {
  const set = new Set(permissoes);
  for (const [nome, keys] of Object.entries(PRESETS) as [AverbadoraPerfil, string[]][]) {
    if (nome === "personalizado") continue;
    if (keys.length !== set.size) continue;
    if (keys.every((k) => set.has(k))) return nome;
  }
  return "personalizado";
}

export interface AverbadoraUser {
  id: number;
  nome: string;
  email: string;
  /** Label de UI — qual preset o admin escolheu (ou "personalizado" se editou). */
  perfil: AverbadoraPerfil;
  /** Fonte de verdade da autorizacao. Cada string e uma resource key
   *  (ex.: "bancos", "prefeituras", "adf"). "*" = wildcard (acesso total). */
  permissoes: string[];
  ativo: boolean;
  passwordHash?: string;
  twoFactorEnabled: boolean;
  /** RFC 6238 TOTP secret (base32). Stored as plaintext here for the in-memory mock;
   *  in production this would live encrypted server-side. */
  twoFactorSecret?: string;
  criadoEm: string;
  ultimoLogin?: string;
}

// SHA-256 de "teste123" — mesma senha demo dos outros perfis (banco, prefeitura).
// Assim admin pode logar como Carla/Rafael/Sandra/Auditor no ambiente sandbox
// sem passar por reset. Pra prod: cada usuario definiria a propria via "primeiro
// acesso" ou o supervisor cadastra com senha inicial. Nao registre isso como
// segredo — e literalmente o placeholder publico.
const SEED_PASSWORD_HASH = "289160db0d9f39f9ae1754c4ec9c16f90b50e32e09c5fb5481ae642b3d3d1a36";

const _users: AverbadoraUser[] = [
  { id: 200, nome: "Admin Atlas", email: "admin@atlas.io", perfil: "supervisor", permissoes: [...PRESETS.supervisor], ativo: true, twoFactorEnabled: false, criadoEm: "2026-01-01T00:00:00Z", passwordHash: SEED_PASSWORD_HASH },
  { id: 201, nome: "Carla Mendes", email: "carla.mendes@atlas.io", perfil: "operador", permissoes: [...PRESETS.operador], ativo: true, twoFactorEnabled: false, criadoEm: "2026-02-10T00:00:00Z", ultimoLogin: "2026-06-22T14:30:00Z", passwordHash: SEED_PASSWORD_HASH },
  { id: 202, nome: "Rafael Pinto", email: "rafael@atlas.io", perfil: "comercial", permissoes: [...PRESETS.comercial], ativo: true, twoFactorEnabled: false, criadoEm: "2026-02-10T00:00:00Z", ultimoLogin: "2026-06-21T17:08:00Z", passwordHash: SEED_PASSWORD_HASH },
  { id: 203, nome: "Sandra Lopes", email: "sandra@atlas.io", perfil: "financeiro", permissoes: [...PRESETS.financeiro], ativo: true, twoFactorEnabled: true, twoFactorSecret: "JBSWY3DPEHPK3PXP", criadoEm: "2026-03-01T00:00:00Z", ultimoLogin: "2026-06-22T09:11:00Z", passwordHash: SEED_PASSWORD_HASH },
  { id: 204, nome: "Auditor LGPD", email: "auditoria@atlas.io", perfil: "auditoria", permissoes: [...PRESETS.auditoria], ativo: true, twoFactorEnabled: true, twoFactorSecret: "KRSXG5DJOZSXE6JANRQXEYK7", criadoEm: "2026-04-01T00:00:00Z", passwordHash: SEED_PASSWORD_HASH },
];

/** Migracao: usuarios hidratados do PG podem nao ter `permissoes` (schema antigo).
 *  Deriva do `perfil` legado (que hoje ainda funciona). Idempotente. */
function ensurePermissoes(u: AverbadoraUser): void {
  if (Array.isArray(u.permissoes) && u.permissoes.length > 0) return;
  const preset = PRESETS[u.perfil];
  u.permissoes = preset ? [...preset] : [];
}

/** Usuários crus (com hash/secret) — para persistência write-through. */
export function exportUsersRaw(): AverbadoraUser[] {
  return _users;
}
/** Substitui os usuários em memória pelos hidratados do Postgres.
 *  Migra permissoes derivando do perfil se ausente.
 *  Aceita array vazio: usado por /db/purge-usuarios pra zerar in-memory. */
export function hydrateUsers(rows: AverbadoraUser[]): void {
  rows.forEach(ensurePermissoes);
  _users.length = 0;
  _users.push(...rows);
}

export function listAverbadoraUsers(): Omit<AverbadoraUser, "passwordHash" | "twoFactorSecret">[] {
  return _users.map(sanitize);
}

export function getAverbadoraUser(id: number): AverbadoraUser | undefined {
  return _users.find((u) => u.id === id);
}

export function findByEmail(email: string): AverbadoraUser | undefined {
  return _users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function upsertAverbadoraUser(input: {
  id?: number;
  nome: string;
  email: string;
  /** Preset escolhido — apenas label. Se ausente, deriva de permissoes. */
  perfil?: AverbadoraPerfil;
  /** Fonte de verdade. Se ausente, deriva do preset. */
  permissoes?: string[];
  ativo: boolean;
  password?: string;
  twoFactorEnabled?: boolean;
}): Promise<Omit<AverbadoraUser, "passwordHash" | "twoFactorSecret">> {
  const email = input.email.trim().toLowerCase();
  // Resolve permissoes: se veio explicito, usa; senao deriva do preset; senao "operador".
  const permissoes = Array.isArray(input.permissoes)
    ? [...input.permissoes]
    : input.perfil && PRESETS[input.perfil]
      ? [...PRESETS[input.perfil]]
      : [...PRESETS.operador];
  const perfilLabel: AverbadoraPerfil = input.perfil ?? detectarPreset(permissoes);
  if (input.id) {
    const u = _users.find((x) => x.id === input.id);
    if (!u) throw new Error("user_not_found");
    u.nome = input.nome;
    u.email = email;
    u.perfil = perfilLabel;
    u.permissoes = permissoes;
    u.ativo = input.ativo;
    if (input.password) u.passwordHash = await sha256Hex(input.password);
    if (input.twoFactorEnabled !== undefined) {
      u.twoFactorEnabled = input.twoFactorEnabled;
      if (input.twoFactorEnabled && !u.twoFactorSecret) u.twoFactorSecret = generateTotpSecret();
    }
    return sanitize(u);
  }
  const novo: AverbadoraUser = {
    id: Math.max(...(_users.map((u) => u.id)), 200) + 1,
    nome: input.nome,
    email,
    perfil: perfilLabel,
    permissoes,
    ativo: input.ativo,
    twoFactorEnabled: input.twoFactorEnabled ?? false,
    twoFactorSecret: input.twoFactorEnabled ? generateTotpSecret() : undefined,
    criadoEm: new Date().toISOString(),
    passwordHash: input.password ? await sha256Hex(input.password) : undefined,
  };
  _users.push(novo);
  return sanitize(novo);
}

/** Retorna o segredo TOTP em base32 para apresentar no QR code uma vez. */
export function rotateTotpSecret(id: number): { secret: string; otpauthUrl: string } | undefined {
  const u = _users.find((x) => x.id === id);
  if (!u) return undefined;
  u.twoFactorSecret = generateTotpSecret();
  u.twoFactorEnabled = true;
  return {
    secret: u.twoFactorSecret,
    otpauthUrl: `otpauth://totp/Atlas%20Averbadora:${encodeURIComponent(u.email)}?secret=${u.twoFactorSecret}&issuer=Atlas%20Averbadora`,
  };
}

export function disable2FA(id: number): boolean {
  const u = _users.find((x) => x.id === id);
  if (!u) return false;
  u.twoFactorEnabled = false;
  u.twoFactorSecret = undefined;
  return true;
}

/** Nunca apaga — DESATIVA (ativo=false). Reativável via upsert. */
export function deleteAverbadoraUser(id: number): boolean {
  const u = _users.find((x) => x.id === id);
  if (!u) return false;
  u.ativo = false;
  return true;
}
/** Reativa (ativo=true). Reversivel do soft-delete. */
export function reactivateAverbadoraUser(id: number): boolean {
  const u = _users.find((x) => x.id === id);
  if (!u) return false;
  u.ativo = true;
  return true;
}

// ============================================================
// Presets CUSTOMIZADOS nomeados — reutilizaveis no dropdown "Perfil"
// ao criar um usuario com configuracao personalizada. Cliente pediu
// 22/07/2026 pra ter esse recurso em TODOS os perfis (colega ja fez em
// prefeitura; aqui replica pra averbadora).
// ============================================================
export interface AverbadoraPerfilPreset {
  key: string;      // slug do nome (unico global — averbadora e' o topo)
  nome: string;     // rotulo exibido no dropdown
  permissoes: string[];
  criadoEm: string;
}
const _presets: AverbadoraPerfilPreset[] = [];

function slugPreset(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
export function listAverbadoraPresets(): AverbadoraPerfilPreset[] {
  return [..._presets];
}
export function upsertAverbadoraPreset(input: { nome: string; permissoes: string[] }, now: string): AverbadoraPerfilPreset {
  const key = slugPreset(input.nome);
  const existing = _presets.find((p) => p.key === key);
  if (existing) {
    existing.nome = input.nome.trim();
    existing.permissoes = [...input.permissoes];
    return existing;
  }
  const novo: AverbadoraPerfilPreset = { key, nome: input.nome.trim(), permissoes: [...input.permissoes], criadoEm: now };
  _presets.push(novo);
  return novo;
}
export function hydrateAverbadoraPresets(rows: AverbadoraPerfilPreset[]): void {
  _presets.length = 0;
  _presets.push(...rows);
}
export function exportAverbadoraPresetsRaw(): AverbadoraPerfilPreset[] {
  return [..._presets];
}

export function perfilOptions(): { value: AverbadoraPerfil; label: string; descricao: string; permissoes: string[] }[] {
  return [
    { value: "supervisor", label: "Supervisor", descricao: "Acesso total ao painel — todas as permissoes marcadas.",                    permissoes: [...PRESETS.supervisor] },
    { value: "operador",   label: "Operador",   descricao: "Cadastros operacionais (servidores, prefeituras, tombamento, adf).",       permissoes: [...PRESETS.operador] },
    { value: "comercial",  label: "Comercial",  descricao: "Vitrine, comunicados, interessados. Sem cadastros sensiveis.",             permissoes: [...PRESETS.comercial] },
    { value: "financeiro", label: "Financeiro", descricao: "Folhas, bate-carteira, ADF. Sem CRUD.",                                    permissoes: [...PRESETS.financeiro] },
    { value: "auditoria",  label: "Auditoria",  descricao: "Read-only nos logs e trilha de auditoria.",                                permissoes: [...PRESETS.auditoria] },
    { value: "personalizado", label: "Personalizado", descricao: "Ponto de partida vazio — escolha caixa a caixa o que o usuario pode ver e fazer.", permissoes: [] },
  ];
}

function sanitize(u: AverbadoraUser): Omit<AverbadoraUser, "passwordHash" | "twoFactorSecret"> {
  const { passwordHash: _ph, twoFactorSecret: _ts, ...rest } = u;
  return rest;
}

/** Random RFC 4648 base32 string of 32 chars (160 bits — recommended TOTP key length). */
function generateTotpSecret(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let out = "";
  for (let i = 0; i < 32; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
