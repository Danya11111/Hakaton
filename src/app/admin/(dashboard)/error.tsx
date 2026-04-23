"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card className="border-red-200/80 bg-white/95 shadow-lg backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-red-900">Ошибка в админке</CardTitle>
          <CardDescription>
            Что-то пошло не так при загрузке страницы. Попробуйте обновить или вернуться на панель.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === "development" ? (
            <pre className="max-h-40 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-red-100">{error.message}</pre>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="gradient" onClick={() => reset()}>
              Повторить
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin">На панель</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/login">Выйти и войти снова</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
