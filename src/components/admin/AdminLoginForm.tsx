"use client";

import { useActionState } from "react";
import { adminLogin, type LoginState } from "@/actions/admin/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLoginForm({ configError }: { configError?: boolean }) {
  const [state, formAction, pending] = useActionState(adminLogin, {} as LoginState);

  return (
    <Card className="mx-auto mt-16 max-w-md border-white/60 bg-white/90 shadow-glow backdrop-blur-md">
      <CardHeader>
        <CardTitle className="font-display text-2xl">Вход в админку</CardTitle>
        <CardDescription>Доступ только для операторов справочника.</CardDescription>
      </CardHeader>
      <CardContent>
        {configError ? (
          <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
            Не настроен ADMIN_SESSION_SECRET (≥32 символов). Обратитесь к администратору сервера.
          </p>
        ) : null}
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Логин</Label>
            <Input id="username" name="username" autoComplete="username" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
          <Button type="submit" className="w-full" variant="gradient" disabled={pending}>
            {pending ? "Вход…" : "Войти"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
