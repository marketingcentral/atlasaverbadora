// PII masking helpers — must be used before logging any object that may contain personal data.

export function maskCPF(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return "***.***.***-**";
  return `***.***.***-${d.slice(9, 11)}`;
}

export function maskEmail(email: string): string {
  const [name = "", domain = ""] = email.split("@");
  const visible = name.slice(0, 1);
  const dot = domain.indexOf(".");
  const tld = dot >= 0 ? domain.slice(dot) : "";
  return `${visible}***@***${tld}`;
}

export function maskName(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 0) return "";
  const [first = "", second = ""] = parts;
  return parts.length === 1 ? first : `${first} ${second.charAt(0)}.`;
}

const PII_KEYS = new Set(["cpf", "email", "nome", "senha", "password", "telefone", "phone", "rg", "endereco", "address"]);

export function maskPII<T extends Record<string, unknown>>(obj: T, extraKeys: string[] = []): T {
  const keys = new Set([...PII_KEYS, ...extraKeys.map((k) => k.toLowerCase())]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (keys.has(k.toLowerCase())) {
      if (typeof v === "string") {
        if (k.toLowerCase() === "cpf") out[k] = maskCPF(v);
        else if (k.toLowerCase().includes("email")) out[k] = maskEmail(v);
        else if (k.toLowerCase().includes("nome") || k.toLowerCase().includes("name")) out[k] = maskName(v);
        else out[k] = "***";
      } else out[k] = "***";
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = maskPII(v as Record<string, unknown>, extraKeys);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}
