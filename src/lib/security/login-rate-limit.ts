import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_USERNAME = 5;
const MAX_FAILS_PER_IP = 20;

export function normalizeLoginUsername(username: string): string {
  return username.trim().toLowerCase();
}

export async function assertLoginAllowed(
  username: string,
  ip: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const norm = normalizeLoginUsername(username);
  const since = new Date(Date.now() - WINDOW_MS);
  const [userFails, ipFails] = await Promise.all([
    prisma.loginAttempt.count({
      where: { username: norm, success: false, createdAt: { gte: since } },
    }),
    ip
      ? prisma.loginAttempt.count({
          where: { ipAddress: ip, success: false, createdAt: { gte: since } },
        })
      : Promise.resolve(0),
  ]);
  if (userFails >= MAX_FAILS_PER_USERNAME) {
    return {
      ok: false,
      message:
        "Слишком много неудачных попыток входа для этого логина. Подождите около 15 минут и попробуйте снова.",
    };
  }
  if (ipFails >= MAX_FAILS_PER_IP) {
    return {
      ok: false,
      message:
        "Слишком много неудачных попыток входа с вашего адреса. Подождите около 15 минут и попробуйте снова.",
    };
  }
  return { ok: true };
}

export async function recordLoginAttempt(input: {
  username: string;
  ip: string | null;
  success: boolean;
}): Promise<void> {
  try {
    await prisma.loginAttempt.create({
      data: {
        username: normalizeLoginUsername(input.username),
        ipAddress: input.ip,
        success: input.success,
      },
    });
  } catch {
    // ignore
  }
}
