import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_CSRF_COOKIE, ADMIN_SESSION_COOKIE } from "@/lib/admin-auth-constants";
import { adminCookieBase } from "@/lib/admin-cookies";
import { getAdminSessionMaxAgeSeconds } from "@/lib/admin-session";
import { verifyAdminJwtHs256Edge } from "@/lib/admin-token-edge";

export async function POST() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.json({ error: "config" }, { status: 503 });
  }
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ok = await verifyAdminJwtHs256Edge(token, secret);
  if (!ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const existing = store.get(ADMIN_CSRF_COOKIE)?.value;
  if (existing) {
    return NextResponse.json({ ok: true, csrf: existing });
  }
  const csrf = randomBytes(32).toString("hex");
  store.set(ADMIN_CSRF_COOKIE, csrf, {
    ...adminCookieBase(),
    httpOnly: false,
    maxAge: getAdminSessionMaxAgeSeconds(),
  });
  return NextResponse.json({ ok: true, csrf });
}
