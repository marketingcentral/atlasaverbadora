// Chaves do localStorage usadas pelo app. Centralizadas aqui pra que logout
// e troca de matricula limpem o estado consistentemente.
//
// Grupos:
// - AUTH: identidade e credenciais. Sempre limpo em logout.
// - SESSION: estado do usuario ATUAL (matricula ativa, propostas do servidor
//   logado, etc.). Limpo em logout do servidor pra evitar vazamento entre
//   contas. Preservado em logout de outros perfis.
// - DEMO_DATA: dados persistidos por cada portal (banco/prefeitura) que
//   representam o estado do sistema, nao do usuario logado. Preservados em
//   qualquer logout — so limpos por reset explicito do demo.

export const STORAGE_KEYS = {
  role: "atlas:role",
  tokens: "atlas:tokens",
  idMatricula: "atlas:idMatricula",
  idMatriculaMeta: "atlas:idMatricula:meta",
  propostasUserCriadas: "atlas:propostas:userCriadas",
  simulationLock: "atlas:simulationLock",
  notificationsRead: "atlas:notifications:read",
  bancoPropostas: "atlas:banco:propostas",
  bancoAdf: "atlas:banco:adf",
  bancoConvenios: "atlas:banco:convenios",
  bancoConveniosRemovidos: "atlas:banco:convenios:removidos",
} as const;

const AUTH_KEYS = [STORAGE_KEYS.role, STORAGE_KEYS.tokens] as const;

const SESSION_KEYS = [
  STORAGE_KEYS.idMatricula,
  STORAGE_KEYS.idMatriculaMeta,
  STORAGE_KEYS.propostasUserCriadas,
  STORAGE_KEYS.simulationLock,
  STORAGE_KEYS.notificationsRead,
] as const;

// DEMO_DATA (nao listado como const pra evitar warning): bancoPropostas,
// bancoAdf, bancoConvenios. Preservados em qualquer logout.

/** Limpa apenas o estado de matricula ativa (usado no fluxo de trocar). */
export function clearActiveMatricula(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEYS.idMatricula);
    window.localStorage.removeItem(STORAGE_KEYS.idMatriculaMeta);
  } catch {
    // ignore
  }
}

/**
 * Logout do servidor: limpa auth + sessao do usuario atual (matricula,
 * propostas criadas, notificacoes lidas). Preserva os dados dos outros
 * portais (banco/prefeitura) pra que convenios cadastrados, propostas do
 * banco, ADFs geradas etc. sobrevivam.
 */
export function clearAtlasState(): void {
  for (const key of [...AUTH_KEYS, ...SESSION_KEYS]) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore (modo privado)
    }
  }
}

/** Wipe COMPLETO — usar so em reset explicito do demo. */
export function resetDemoState(): void {
  for (const key of Object.values(STORAGE_KEYS)) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}
