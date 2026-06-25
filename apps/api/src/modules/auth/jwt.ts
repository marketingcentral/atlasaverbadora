import { SignJWT, importPKCS8 } from "jose";
import type { Env } from "../../env.js";
import type { JwtClaims } from "../../middleware/auth.js";

let cachedPriv: CryptoKey | null = null;
async function getPrivateKey(env: Env): Promise<CryptoKey> {
  if (cachedPriv) return cachedPriv;
  cachedPriv = (await importPKCS8(env.JWT_PRIVATE_KEY, "RS256")) as CryptoKey;
  return cachedPriv;
}

export async function signAccessToken(env: Env, payload: Omit<JwtClaims, "iat" | "exp">): Promise<string> {
  const key = await getPrivateKey(env);
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .setIssuer("https://api.atlas.io")
    .sign(key);
}

export function generateRefreshToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
