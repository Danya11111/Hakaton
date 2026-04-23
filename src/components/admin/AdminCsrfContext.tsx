"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const Ctx = createContext<string>("");

export function AdminCsrfProvider({
  initialToken,
  children,
}: {
  initialToken: string;
  children: React.ReactNode;
}) {
  const [token, setToken] = useState(initialToken);

  useEffect(() => {
    if (token) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/session/bootstrap", { method: "POST", credentials: "include" });
        const j = (await res.json()) as { csrf?: string };
        if (!cancelled && j.csrf) setToken(j.csrf);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo(() => token, [token]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminCsrf(): string {
  return useContext(Ctx);
}
