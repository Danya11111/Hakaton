"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { applyCompaniesImportAction, previewCompaniesImportAction } from "@/actions/admin/import";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminCsrf } from "@/components/admin/AdminCsrfContext";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DryRunSummary, ImportResult, RowIssue } from "@/lib/excel/import-types";
import { cn } from "@/lib/utils";

type Step = "upload" | "preview" | "done";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function SummaryGrid({ summary }: { summary: DryRunSummary }) {
  const rows = useMemo(
    () => [
      { label: "Группы", s: summary.groups },
      { label: "Компании", s: summary.companies },
      { label: "Локации", s: summary.locations },
      { label: "Расчёты", s: summary.evaluations },
    ],
    [summary],
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map(({ label, s }) => (
        <div key={label} className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-sm">
          <p className="font-medium text-slate-900">{label}</p>
          <p className="text-slate-600">
            создать: {s.create} · обновить: {s.update} · пропуск: {s.skip}
          </p>
        </div>
      ))}
      {summary.companiesDeletedIfReplace != null ? (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-3 text-sm text-amber-950 sm:col-span-2">
          В режиме replace будет удалено компаний (и связанных данных) перед импортом:{" "}
          <span className="font-semibold">{summary.companiesDeletedIfReplace}</span>
        </div>
      ) : null}
    </div>
  );
}

function IssuesPanel({ title, issues }: { title: string; issues: RowIssue[] }) {
  if (!issues.length) return null;
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/80 p-4">
      <p className="mb-2 text-sm font-semibold text-slate-900">{title}</p>
      <ul className="max-h-56 space-y-2 overflow-auto text-xs text-slate-700">
        {issues.map((it, idx) => (
          <li key={idx} className="rounded-lg bg-slate-50 px-2 py-1.5 ring-1 ring-slate-900/5">
            <span className="font-mono text-[11px] text-slate-500">
              {it.sheet} · строка {it.row}
              {it.column ? ` · ${it.column}` : ""}
            </span>
            <span className="block text-slate-800">{it.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "upload", label: "Загрузка" },
    { id: "preview", label: "Проверка" },
    { id: "done", label: "Готово" },
  ];
  const order: Record<Step, number> = { upload: 0, preview: 1, done: 2 };
  const current = order[step];
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
      {steps.map((s, i) => {
        const active = order[s.id] === current;
        const done = order[s.id] < current;
        return (
          <div key={s.id} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-[11px]",
                done ? "bg-emerald-600 text-white" : active ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600",
              )}
            >
              {i + 1}
            </span>
            <span className={active ? "text-slate-900" : ""}>{s.label}</span>
            {i < steps.length - 1 ? <span className="text-slate-300">→</span> : null}
          </div>
        );
      })}
    </div>
  );
}

export function ImportExportClient() {
  const csrf = useAdminCsrf();
  const [mode, setMode] = useState<"merge" | "replace_companies">("merge");
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [summary, setSummary] = useState<DryRunSummary | null>(null);
  const [fatal, setFatal] = useState<RowIssue[]>([]);
  const [warnings, setWarnings] = useState<RowIssue[]>([]);
  const [applyResult, setApplyResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  const resetFlow = useCallback(() => {
    setStep("upload");
    setPreviewId(null);
    setSummary(null);
    setFatal([]);
    setWarnings([]);
    setApplyResult(null);
    setFile(null);
  }, []);

  const onPreview = useCallback(() => {
    if (!file) {
      toast.error("Выберите файл .xlsx");
      return;
    }
    if (!csrf) {
      toast.error("Инициализация защиты формы… обновите страницу через пару секунд.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.append("csrf", csrf);
      fd.append("file", file);
      fd.append("mode", mode);
      const res = await previewCompaniesImportAction(fd);
      if (!res.ok) {
        toast.error(res.error ?? "Ошибка предпросмотра");
        setFatal(res.fatal);
        setWarnings(res.warnings);
        setSummary(null);
        setPreviewId(null);
        setStep("upload");
        return;
      }
      setFatal(res.fatal);
      setWarnings(res.warnings);
      setSummary(res.summary);
      setPreviewId(res.previewId);
      setStep("preview");
      toast.success("Файл проверен. Просмотрите сводку и примените импорт.");
    });
  }, [csrf, file, mode]);

  const onApply = useCallback(() => {
    if (!previewId || !csrf) {
      toast.error("Нет активного предпросмотра.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.append("csrf", csrf);
      fd.append("previewId", previewId);
      const res = await applyCompaniesImportAction(fd);
      if (!res.ok) {
        toast.error(res.error ?? "Ошибка применения");
        if (res.result) setApplyResult(res.result);
        return;
      }
      setApplyResult(res.result);
      setStep("done");
      toast.success("Импорт применён");
    });
  }, [csrf, previewId]);

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
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Импорт</CardTitle>
              <CardDescription>
                Двухшаговый процесс: сначала проверка без записи в БД, затем явное применение в одной транзакции.
              </CardDescription>
            </div>
          </div>
          <Stepper step={step === "upload" ? "upload" : step === "preview" ? "preview" : "done"} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Режим</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)} disabled={pending}>
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

          <div className="flex flex-wrap gap-2">
            <Button variant="gradient" type="button" disabled={pending || step === "done"} onClick={onPreview}>
              {pending && step !== "preview" ? "Проверка…" : "1. Предпросмотр"}
            </Button>
            <Button
              variant="secondary"
              type="button"
              disabled={pending || !previewId || step === "done"}
              onClick={onApply}
            >
              {pending && previewId ? "Применение…" : "2. Применить импорт"}
            </Button>
            <Button variant="outline" type="button" disabled={pending} onClick={resetFlow}>
              Сбросить
            </Button>
          </div>
        </CardContent>
      </Card>

      {(fatal.length || warnings.length) && step !== "done" ? (
        <div className="space-y-3 lg:col-span-2">
          <IssuesPanel title="Ошибки (блокируют применение)" issues={fatal} />
          <IssuesPanel title="Предупреждения" issues={warnings} />
        </div>
      ) : null}

      {summary && step !== "upload" ? (
        <Card className="border-white/60 bg-white/90 backdrop-blur-md lg:col-span-2">
          <CardHeader>
            <CardTitle>Сводка предпросмотра</CardTitle>
            <CardDescription>Оценка операций до записи в базу.</CardDescription>
          </CardHeader>
          <CardContent>
            <SummaryGrid summary={summary} />
          </CardContent>
        </Card>
      ) : null}

      {applyResult && step === "done" ? (
        <Card className="border-white/60 bg-white/90 backdrop-blur-md lg:col-span-2">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Результат применения</CardTitle>
              <CardDescription>
                Статус: {applyResult.ok ? "транзакция завершена без фатальных ошибок" : "есть ошибки в отчёте"}
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => downloadJson("import-result.json", applyResult)}>
              Скачать JSON-отчёт
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <pre className="max-h-80 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
              {JSON.stringify(applyResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
