"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth-constants";
import { createAdminSessionToken } from "@/lib/admin-session";

export type LoginState = { error?: string };

export async function adminLogin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const expectedUser = process.env.ADMIN_USERNAME ?? "";
  const expectedPass = process.env.ADMIN_PASSWORD ?? "";

  if (!expectedUser || !expectedPass) {
    return { error: "ADMIN_USERNAME / ADMIN_PASSWORD не заданы в окружении." };
  }
  if (username !== expectedUser || password !== expectedPass) {
    return { error: "Неверный логин или пароль." };
  }

  try {
    const token = await createAdminSessionToken();
    const store = await cookies();
    store.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Не удалось создать сессию. Проверьте ADMIN_SESSION_SECRET (≥32 символов).",
    };
  }

  redirect("/admin");
}

export async function adminLogout() {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
  redirect("/admin/login");
}
