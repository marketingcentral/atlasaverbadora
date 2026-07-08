// Subperfis da averbadora — todos têm role="averbadora" no JWT, mas com permissões diferentes
// dentro do painel. Granularidade futura: ACL por rota. Hoje serve como metadado de auditoria
// e gating de telas no front.

import { sha256Hex } from "./api-tokens.js";

export type AverbadoraPerfil = "operador" | "supervisor" | "comercial" | "financeiro" | "auditoria";

export interface AverbadoraUser {
  id: number;
  nome: string;
  email: string;
  perfil: AverbadoraPerfil;
  ativo: boolean;
  passwordHash?: string;
  twoFactorEnabled: boolean;
  /** RFC 6238 TOTP secret (base32). Stored as plaintext here for the in-memory mock;
   *  in production this would live encrypted server-side. */
  twoFactorSecret?: string;
  criadoEm: string;
  ultimoLogin?: string;
}

const _users: AverbadoraUser[] = [
  { id: 200, nome: "Admin Atlas", email: "admin@atlas.io", perfil: "supervisor", ativo: true, twoFactorEnabled: false, criadoEm: "2026-01-01T00:00:00Z" },
  { id: 201, nome: "Carla Mendes", email: "carla.mendes@atlas.io", perfil: "operador", ativo: true, twoFactorEnabled: false, criadoEm: "2026-02-10T00:00:00Z", ultimoLogin: "2026-06-22T14:30:00Z" },
  { id: 202, nome: "Rafael Pinto", email: "rafael@atlas.io", perfil: "comercial", ativo: true, twoFactorEnabled: false, criadoEm: "2026-02-10T00:00:00Z", ultimoLogin: "2026-06-21T17:08:00Z" },
  { id: 203, nome: "Sandra Lopes", email: "sandra@atlas.io", perfil: "financeiro", ativo: true, twoFactorEnabled: true, twoFactorSecret: "JBSWY3DPEHPK3PXP", criadoEm: "2026-03-01T00:00:00Z", ultimoLogin: "2026-06-22T09:11:00Z" },
  { id: 204, nome: "Auditor LGPD", email: "auditoria@atlas.io", perfil: "auditoria", ativo: true, twoFactorEnabled: true, twoFactorSecret: "KRSXG5DJOZSXE6JANRQXEYK7", criadoEm: "2026-04-01T00:00:00Z" },
];

/** Usuários crus (com hash/secret) — para persistência write-through. */
export function exportUsersRaw(): AverbadoraUser[] {
  return _users;
}
/** Substitui os usuários em memória pelos hidratados do Postgres. */
export function hydrateUsers(rows: AverbadoraUser[]): void {
  if (rows.length) { _users.length = 0; _users.push(...rows); }
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
  perfil: AverbadoraPerfil;
  ativo: boolean;
  password?: string;
  twoFactorEnabled?: boolean;
}): Promise<Omit<AverbadoraUser, "passwordHash" | "twoFactorSecret">> {
  const email = input.email.trim().toLowerCase();
  if (input.id) {
    const u = _users.find((x) => x.id === input.id);
    if (!u) throw new Error("user_not_found");
    u.nome = input.nome;
    u.email = email;
    u.perfil = input.perfil;
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
    perfil: input.perfil,
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

export function perfilOptions(): { value: AverbadoraPerfil; label: string; descricao: string }[] {
  return [
    { value: "operador",   label: "Operador",   descricao: "Cadastros operacionais (servidores, prefeituras), sem alterar bancos." },
    { value: "supervisor", label: "Supervisor", descricao: "Acesso total ao painel incluindo bancos, convenios, configs." },
    { value: "comercial",  label: "Comercial",  descricao: "Vitrine, comunicados, relatorios comerciais. Sem cadastros sensiveis." },
    { value: "financeiro", label: "Financeiro", descricao: "Folhas, bate-de-carteira, relatorios de receita. Sem CRUD." },
    { value: "auditoria",  label: "Auditoria",  descricao: "Read-only nos logs de auditoria, sem permissao de escrita." },
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
