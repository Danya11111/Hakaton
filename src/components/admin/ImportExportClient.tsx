"use client";

import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ImportResult } from "@/lib/excel/companies-import";

export function ImportExportClient() {
  const [mode, setMode] = useState<"merge" | "replace_companies">("merge");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  const onImport = useCallback(() => {
    if (!file) {
      toast.error("Выберите файл .xlsx");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mode", mode);
      const res = await fetch("/api/admin/import/companies", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const json = (await res.json()) as ImportResult & { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Ошибка импорта");
        return;
      }
      setResult(json);
      toast.success("Импорт выполнен");
    });
  }, [file, mode]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-white/60 bg-white/90 backdrop-blur-md">
        <CardHeader>
          <CardTitle>Экспорт</CardTitle>
          <CardDescription>Скачайте полный справочник в формате Excel.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="gradient">
            <a href="/api/admin/export/companies">Скачать companies.xlsx</a>
          </Button>
          <Button asChild variant="outline">
            <a href="/api/admin/export/template">Шаблон для импорта</a>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-white/60 bg-white/90 backdrop-blur-md">
        <CardHeader>
          <CardTitle>Импорт</CardTitle>
          <CardDescription>
            Формат файла должен совпадать с экспортом. Режим «replace» удаляет все компании и связанные данные перед
            загрузкой.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Режим</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="merge">Merge (обновить / добавить)</SelectItem>
                <SelectItem value="replace_companies">Replace companies+locations</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-600 transition hover:border-indigo-400 hover:bg-indigo-50/40"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) setFile(f);
            }}
            onClick={() => document.getElementById("xlsx")?.click()}
          >
            <input
              id="xlsx"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? <p className="font-medium text-slate-900">{file.name}</p> : <p>Перетащите .xlsx или нажмите для выбора</p>}
          </div>
          <Button variant="gradient" type="button" disabled={pending} onClick={onImport}>
            {pending ? "Импорт…" : "Запустить импорт"}
          </Button>
        </CardContent>
      </Card>

      {result ? (
        <Card className="border-white/60 bg-white/90 backdrop-blur-md lg:col-span-2">
          <CardHeader>
            <CardTitle>Результат импорта</CardTitle>
            <CardDescription>
              Статус: {result.ok ? "без ошибок по строкам с предупреждениями" : "есть ошибки в отчёте"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <pre className="max-h-80 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
