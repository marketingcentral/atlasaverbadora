// TOTP (Time-based One-Time Password) — RFC 6238.
// Implementacao minima usando WebCrypto (disponivel em Cloudflare Workers).
// Secret e armazenado em base32 (compativel com Google Authenticator/Authy/1Password).
// Janela padrao: aceita codigo do intervalo atual +- 1 (compensa clock drift).

/** Decodifica base32 (RFC 4648) — case-insensitive, ignora "=" padding. */
function base32Decode(input: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  const bytes: number[] = [];
  let buf = 0;
  let bits = 0;
  for (const ch of clean) {
    const v = alphabet.indexOf(ch);
    if (v < 0) continue;
    buf = (buf << 5) | v;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buf >> bits) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}

/** Numero (unix seconds / 30) codificado em 8 bytes big-endian pro HMAC. */
function counterBytes(counter: number): Uint8Array {
  const b = new Uint8Array(8);
  // 32 bits altos ficam 0 nas proximas ~136 anos.
  let n = counter;
  for (let i = 7; i >= 4; i--) { b[i] = n & 0xff; n = Math.floor(n / 256); }
  return b;
}

/** Gera o codigo TOTP de 6 digitos pra um secret base32 num dado tempo. */
export async function generateTotp(secret: string, atSeconds: number = Math.floor(Date.now() / 1000)): Promise<string> {
  const key = base32Decode(secret);
  const counter = Math.floor(atSeconds / 30);
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key.buffer as ArrayBuffer, { name: "HMAC", hash: "SHA-1" }, false, ["sign"],
  );
  const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, counterBytes(counter).buffer as ArrayBuffer));
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const bin =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  const otp = bin % 1_000_000;
  return String(otp).padStart(6, "0");
}

/** Valida um codigo TOTP contra o secret, aceitando janela +- 1 (30s antes/depois)
 *  pra compensar clock drift do dispositivo do usuario. RFC 6238 recomenda 1
 *  no minimo — 2 quando o dispositivo tem baixa qualidade de clock. */
export async function verifyTotp(secret: string, code: string, windowSteps: number = 1): Promise<boolean> {
  const clean = code.replace(/\D/g, "");
  if (clean.length !== 6) return false;
  const now = Math.floor(Date.now() / 1000);
  for (let w = -windowSteps; w <= windowSteps; w++) {
    const expected = await generateTotp(secret, now + w * 30);
    if (expected === clean) return true;
  }
  return false;
}
