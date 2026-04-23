"use server";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit/write-audit";
import { ADMIN_CSRF_COOKIE, ADMIN_SESSION_COOKIE, ADMIN_USER_COOKIE } from "@/lib/admin-auth-constants";
import { adminCookieBase } from "@/lib/admin-cookies";
import { createAdminSessionToken, getAdminSessionMaxAgeSeconds } from "@/lib/admin-session";
import { getClientIp, getUserAgent } from "@/lib/request-meta";
import { assertLoginAllowed, normalizeLoginUsername, recordLoginAttempt } from "@/lib/security/login-rate-limit";
import { verifyAdminCsrfFromForm } from "@/lib/security/csrf";

export type LoginState = { error?: string };

export async function adminLogin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const expectedUser = process.env.ADMIN_USERNAME ?? "";
  const expectedPass = process.env.ADMIN_PASSWORD ?? "";
  const h = await headers();
  const ip = getClientIp(h);
  const ua = getUserAgent(h);

  if (!expectedUser || !expectedPass) {
    return { error: "ADMIN_USERNAME / ADMIN_PASSWORD не заданы в окружении." };
  }

  const lock = await assertLoginAllowed(username, ip);
  if (!lock.ok) {
    return { error: lock.message };
  }

  if (username !== expectedUser || password !== expectedPass) {
    await recordLoginAttempt({ username, ip, success: false });
    await writeAudit({
      actorUsername: normalizeLoginUsername(username),
      action: "admin_login_failure",
      entityType: "auth",
      metadata: { reason: "bad_credentials" },
      ipAddress: ip,
      userAgent: ua,
    });
    return { error: "Неверный логин или пароль." };
  }

  try {
    const token = await createAdminSessionToken();
    const csrf = randomBytes(32).toString("hex");
    const store = await cookies();
    const maxAge = getAdminSessionMaxAgeSeconds();
    const base = adminCookieBase();
    store.set(ADMIN_SESSION_COOKIE, token, {
      ...base,
      httpOnly: true,
      maxAge,
    });
    store.set(ADMIN_CSRF_COOKIE, csrf, {
      ...base,
      httpOnly: false,
      maxAge,
    });
    store.set(ADMIN_USER_COOKIE, username, {
      ...base,
      httpOnly: false,
      maxAge,
    });
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Не удалось создать сессию. Проверьте ADMIN_SESSION_SECRET (≥32 символов).",
    };
  }

  await recordLoginAttempt({ username, ip, success: true });
  await writeAudit({
    actorUsername: username,
    action: "admin_login_success",
    entityType: "auth",
    metadata: {},
    ipAddress: ip,
    userAgent: ua,
  });

  redirect("/admin");
}

export async function adminLogout(formData: FormData) {
  if (!(await verifyAdminCsrfFromForm(formData))) {
    redirect("/admin/login?error=csrf");
  }
  const h = await headers();
  const store = await cookies();
  const actor = store.get(ADMIN_USER_COOKIE)?.value ?? "unknown";
  const ip = getClientIp(h);
  const ua = getUserAgent(h);

  await writeAudit({
    actorUsername: actor,
    action: "admin_logout",
    entityType: "auth",
    metadata: {},
    ipAddress: ip,
    userAgent: ua,
  });

  store.delete(ADMIN_SESSION_COOKIE);
  store.delete(ADMIN_CSRF_COOKIE);
  store.delete(ADMIN_USER_COOKIE);
  redirect("/admin/login");
}
