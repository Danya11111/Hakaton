import { SignJWT, jwtVerify } from "jose";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth-constants";

function getSecret() {
  const raw = process.env.ADMIN_SESSION_SECRET ?? "";
  if (raw.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters.");
  }
  return new TextEncoder().encode(raw);
}

export async function createAdminSessionToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());
}

export async function verifyAdminSessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export { ADMIN_SESSION_COOKIE };

export function readTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((c) => c.trim());
  for (const p of parts) {
    if (p.startsWith(`${ADMIN_SESSION_COOKIE}=`)) {
      return decodeURIComponent(p.slice(ADMIN_SESSION_COOKIE.length + 1));
    }
  }
  return null;
}
