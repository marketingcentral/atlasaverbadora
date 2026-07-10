// Gating de acesso por subperfil da averbadora.
//
// Fonte: matriz confirmada com o cliente (2026-07-10) — reflete o header do painel
// /averbadora/perfis. Cada key do menu tem uma lista de perfis que podem ver a aba.
// "supervisor" sempre pode; os outros veem apenas o que precisam.
//
// O JWT do subusuario carrega `averbadora_perfil` no claim (do backend); esta lib
// so decide client-side. Enforcement REAL vive no backend (requireAverbadoraPerfil).

export type AverbadoraPerfil = "operador" | "supervisor" | "comercial" | "financeiro" | "auditoria";

/** Todos os perfis existentes — util pra iterar em UIs (tela de matriz). */
export const TODOS_PERFIS: AverbadoraPerfil[] = ["supervisor", "operador", "comercial", "financeiro", "auditoria"];

/** Perfil por key do menu — quem ve o item.
 *  Convencao: se a key nao esta aqui, so supervisor ve. */
export const MATRIX: Record<string, AverbadoraPerfil[]> = {
  // Todos veem — visao geral
  dashboard: ["supervisor", "operador", "comercial", "financeiro", "auditoria"],
  health: ["supervisor", "operador", "comercial", "financeiro", "auditoria"],

  // Cadastros operacionais — operador e supervisor
  prefeituras: ["supervisor", "operador"],
  convenios: ["supervisor", "operador"],
  servidores: ["supervisor", "operador"],
  "pre-reservas": ["supervisor", "operador"],
  tombamento: ["supervisor", "operador"],
  adf: ["supervisor", "operador", "financeiro"],
  beneficios: ["supervisor", "operador"],

  // Banca — so supervisor (cadastro sensivel)
  bancos: ["supervisor"],

  // Financeiro
  folhas: ["supervisor", "financeiro"],
  "bate-carteira": ["supervisor", "financeiro"],

  // Comercial
  vitrine: ["supervisor", "comercial"],
  "comunicados-banco": ["supervisor", "comercial"],
  "comunicados-servidor": ["supervisor", "comercial"],
  comunicados: ["supervisor", "comercial"], // parent group

  // Auditoria — leitura
  auditoria: ["supervisor", "auditoria"],
  logs: ["supervisor", "auditoria"],

  // Administracao restrita — so supervisor
  perfis: ["supervisor"],
  "id-unico": ["supervisor"],
  api: ["supervisor"],
  "api-docs": ["supervisor"],
  "api-tokens": ["supervisor"],
  "api-webhooks": ["supervisor"],
  configuracoes: ["supervisor"],
  permissoes: ["supervisor"], // matriz de acesso — so supervisor audita
  conta: ["supervisor", "operador", "comercial", "financeiro", "auditoria"], // self-service pra todos
};

/** True se o perfil pode ver/acessar aquela chave do menu. Chaves nao mapeadas
 *  sao consideradas "so supervisor" por padrao — falha fechada. */
export function podeAcessar(perfil: AverbadoraPerfil | null | undefined, key: string): boolean {
  if (!perfil) return true; // sem claim (dev-user admin@atlas.test) — permite tudo pra retrocompat.
  if (perfil === "supervisor") return true;
  const allowed = MATRIX[key];
  return !!allowed && allowed.includes(perfil);
}

/** Le o subperfil do JWT persistido no storage do SDK. Retorna null se nao houver
 *  claim (dev-user admin@atlas.test, ou usuarios de outros perfis). */
export function readAverbadoraPerfilFromJwt(accessToken: string | null | undefined): AverbadoraPerfil | null {
  if (!accessToken) return null;
  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3) return null;
    // atob nao lida com base64url — trocar caracteres antes.
    const b64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    const p = payload.averbadora_perfil;
    if (p === "operador" || p === "supervisor" || p === "comercial" || p === "financeiro" || p === "auditoria") {
      return p;
    }
    return null;
  } catch {
    return null;
  }
}
