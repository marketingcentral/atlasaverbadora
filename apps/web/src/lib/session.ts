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
