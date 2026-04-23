"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminHealthCard() {
  const [text, setText] = useState<string>("Проверка…");
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const body = await res.text();
        if (!cancelled) {
          setOk(res.ok);
          setText(body.slice(0, 280));
        }
      } catch {
        if (!cancelled) {
          setOk(false);
          setText("Не удалось запросить /api/health");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card
      className={
        ok === null
          ? "border-white/60 bg-white/90 backdrop-blur-md"
          : ok
            ? "border-emerald-200/80 bg-emerald-50/60 backdrop-blur-md"
            : "border-red-200/80 bg-red-50/60 backdrop-blur-md"
      }
    >
      <CardHeader>
        <CardTitle className="text-base">Состояние API</CardTitle>
        <CardDescription>GET /api/health (как при деплое)</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="font-mono text-xs text-slate-800">{text}</p>
      </CardContent>
    </Card>
  );
}
