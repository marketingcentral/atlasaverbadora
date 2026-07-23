// Mascaramento de PII compartilhado entre modulos.
//
// Historico: cada modulo tinha sua versao (auth: "580.***.***-33",
// admin/tombamento: "580.***.***-33", SERVIDORES_BUSCA_MOCK.cpfMasked:
// "***.***.***-33"). O filtro por CPF na trilha de auditoria e' match
// exato — com formatos diferentes, o cliente NUNCA achava a trilha
// completa do mesmo servidor. Padronizado aqui em 22/07/2026.

/** Mascara CPF completo -> "580.***.***-33" (mantem 3 primeiros + 2 ultimos).
 *  Preserva formato ja mascarado. String vazia se input invalido. */
export function maskCpf(cpf: string | undefined | null): string {
  if (!cpf) return "";
  const raw = String(cpf);
  if (raw.includes("*")) return raw; // ja mascarado — nao remascara
  const d = raw.replace(/\D/g, "");
  if (d.length < 11) return "";
  const cpfDig = d.length > 11 ? d.slice(-11) : d;
  return `${cpfDig.slice(0, 3)}.***.***-${cpfDig.slice(-2)}`;
}

/** Mascara e-mail: "diego.ferreira@x.com" -> "di•••@x.com". */
export function maskEmail(email: string | undefined | null): string {
  if (!email || !String(email).includes("@")) return "";
  const [user = "", domain = ""] = String(email).split("@");
  return `${user.slice(0, 2)}•••@${domain}`;
}

/** Mascara telefone deixando os 4 ultimos digitos: "(••) •••••-4407". */
export function maskPhone(phone: string | undefined | null): string {
  const d = String(phone ?? "").replace(/\D/g, "");
  if (d.length < 4) return "";
  return `(••) •••••-${d.slice(-4)}`;
}
