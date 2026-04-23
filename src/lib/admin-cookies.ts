export function adminCookieBase() {
  const secure = process.env.NODE_ENV === "production";
  return {
    path: "/" as const,
    sameSite: "lax" as const,
    secure,
  };
}
