import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ADMIN_CSRF_COOKIE } from "@/lib/admin-auth-constants";

export async function verifyAdminCsrfFromForm(formData: FormData): Promise<boolean> {
  const token = String(formData.get("csrf") ?? "");
  return verifyAdminCsrfToken(token);
}

export async function verifyAdminCsrfToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const expected = (await cookies()).get(ADMIN_CSRF_COOKIE)?.value;
  if (!expected || token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token, "utf8"), Buffer.from(expected, "utf8"));
  } catch {
    return false;
  }
}
