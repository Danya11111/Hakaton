/**
 * Проверка JWT HS256 для Edge middleware без зависимостей с Node-only API.
 * Должна соответствовать токенам, выпущенным через `jose` SignJWT (alg HS256).
 */

function base64UrlToBytes(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export async function verifyAdminJwtHs256Edge(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [h64, p64, s64] = parts;
  if (!h64 || !p64 || !s64) return false;

  try {
    const payloadJson = new TextDecoder().decode(base64UrlToBytes(p64));
    const payload = JSON.parse(payloadJson) as { exp?: number };
    if (payload.exp && Date.now() / 1000 > payload.exp) return false;
  } catch {
    return false;
  }

  const enc = new TextEncoder();
  const data = enc.encode(`${h64}.${p64}`);
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, data);
  const sig = new Uint8Array(sigBuf);
  const expected = base64UrlToBytes(s64);
  return timingSafeEqual(sig, expected);
}
