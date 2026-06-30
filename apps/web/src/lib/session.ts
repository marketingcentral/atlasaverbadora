// Chaves do localStorage usadas pelo app servidor. Centralizadas aqui pra
// que logout e troca de matricula limpem o estado consistentemente — evita
// vazamento de propostas/criadas entre usuarios diferentes.

export const STORAGE_KEYS = {
  role: "atlas:role",
  tokens: "atlas:tokens",
  idMatricula: "atlas:idMatricula",
  idMatriculaMeta: "atlas:idMatricula:meta",
  propostasUserCriadas: "atlas:propostas:userCriadas",
} as const;

/** Limpa apenas o estado de matricula ativa (usado no fluxo de trocar). */
export function clearActiveMatricula(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEYS.idMatricula);
    window.localStorage.removeItem(STORAGE_KEYS.idMatriculaMeta);
  } catch {
    // ignore
  }
}

/** Apaga tudo do localStorage do Atlas. Usado no logout. */
export function clearAtlasState(): void {
  for (const key of Object.values(STORAGE_KEYS)) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore (modo privado)
    }
  }
}
