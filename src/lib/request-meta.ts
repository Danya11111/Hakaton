type HeaderBag = { get(name: string): string | null };

export function getClientIp(headers: HeaderBag): string | null {
  const xf = headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip");
  if (real?.trim()) return real.trim();
  return null;
}

export function getUserAgent(headers: HeaderBag): string | null {
  const ua = headers.get("user-agent");
  return ua?.trim() ? ua.slice(0, 512) : null;
}
