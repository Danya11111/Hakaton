"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteEvaluationAdmin, saveEvaluationAdmin } from "@/actions/admin/evaluations";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { groupTemplatesByBlock } from "@/lib/scoring";
import { getTemplatesForGroup } from "@/lib/scoring-templates";
import { formatNumber } from "@/lib/utils";

type EvalRow = {
  id: string;
  periodLabel: string;
  integralScore: number;
  statusLabel: string;
  createdAt: string;
  rawPayloadJson: unknown;
};

function rawToForm(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    if (k === "auto" || k === "values") continue;
    if (v === null || v === undefined) out[k] = "";
    else out[k] = String(v);
  }
  return out;
}

export function AdminEvaluationsPanel({
  csrf,
  companyId,
  companySlug,
  groupCode,
  areaSqM,
  evaluations,
}: {
  csrf: string;
  companyId: string;
  companySlug: string;
  groupCode: string;
  areaSqM: number;
  evaluations: EvalRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const templates = useMemo(() => getTemplatesForGroup(groupCode), [groupCode]);
  const grouped = useMemo(() => groupTemplatesByBlock(templates), [templates]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function openNew() {
    setEditingId(undefined);
    const base: Record<string, string> = { periodLabel: "", staffCount: "", populationInZone: "" };
    for (const t of templates.filter((x) => !x.autoCalculated)) {
      base[t.code] = "";
    }
    setFields(base);
    setDialogOpen(true);
  }

  function openEdit(ev: EvalRow) {
    setEditingId(ev.id);
    setFields(rawToForm(ev.rawPayloadJson));
    setDialogOpen(true);
  }

  function save() {
    if (!csrf) {
      toast.error("Защита формы не готова. Обновите страницу.");
      return;
    }
    startTransition(async () => {
      const res = await saveEvaluationAdmin({
        csrf,
        id: editingId,
        companyId,
        companySlug,
        groupCode,
        areaSqM,
        form: fields,
      });
      if (!res.ok) {
        toast.error(res.message ?? "Ошибка");
        return;
      }
      toast.success("Расчёт сохранён");
      setDialogOpen(false);
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleteId) return;
    if (!csrf) {
      toast.error("Защита формы не готова. Обновите страницу.");
      return;
    }
    startTransition(async () => {
      const res = await deleteEvaluationAdmin({ csrf, id: deleteId, companyId, companySlug });
      if (!res.ok) {
        toast.error(res.message ?? "Ошибка");
        return;
      }
      toast.success("Удалено");
      setDeleteId(null);
      router.refresh();
    });
  }

  const blockTitle = (b: string) =>
    b === "RESULT" ? "Результат" : b === "EFFICIENCY" ? "Эффективность" : "Качество";

  return (
    <Card className="border-white/60 bg-white/90 backdrop-blur-md">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Расчёты эффективности</CardTitle>
          <CardDescription>Редактирование пересчитывает баллы по шаблону группы {groupCode}.</CardDescription>
        </div>
        <Button variant="gradient" type="button" onClick={openNew}>
          Новый расчёт
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {evaluations.length === 0 ? (
          <p className="text-sm text-slate-600">Пока нет сохранённых расчётов.</p>
        ) : (
          evaluations.map((e) => (
            <div
              key={e.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-slate-900">{e.periodLabel}</p>
                <p className="text-xs text-slate-500">{new Date(e.createdAt).toLocaleString("ru-RU")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-xl font-semibold">{formatNumber(e.integralScore, 1)}</span>
                <Badge variant="secondary">{e.statusLabel}</Badge>
                <Button size="sm" variant="outline" type="button" onClick={() => openEdit(e)}>
                  Изменить
                </Button>
                <Button size="sm" variant="outline" type="button" onClick={() => setDeleteId(e.id)}>
                  Удалить
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Редактировать расчёт" : "Новый расчёт"}</DialogTitle>
            <DialogDescription>Все поля валидируются по методике; автопоказатели пересчитаются.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label>Период</Label>
                <Input value={fields.periodLabel ?? ""} onChange={(e) => setFields((f) => ({ ...f, periodLabel: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Население в зоне</Label>
                <Input
                  value={fields.populationInZone ?? ""}
                  onChange={(e) => setFields((f) => ({ ...f, populationInZone: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Штатные ставки</Label>
                <Input value={fields.staffCount ?? ""} onChange={(e) => setFields((f) => ({ ...f, staffCount: e.target.value }))} />
              </div>
            </div>
            {grouped.map(({ block, items }) => (
              <div key={block} className="space-y-2 rounded-xl border border-slate-200/80 p-3">
                <p className="text-sm font-semibold text-indigo-800">{blockTitle(block)}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {items
                    .filter((t) => !t.autoCalculated)
                    .map((t) => (
                      <div key={t.code} className="space-y-1">
                        <Label>{t.label}</Label>
                        <Input
                          value={fields[t.code] ?? ""}
                          onChange={(e) => setFields((f) => ({ ...f, [t.code]: e.target.value }))}
                        />
                        <p className="text-xs text-slate-500">{t.helpText}</p>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button variant="gradient" type="button" disabled={pending} onClick={save}>
              {pending ? "Сохранение…" : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить расчёт?</AlertDialogTitle>
            <AlertDialogDescription>Действие необратимо.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <Button variant="destructive" type="button" disabled={pending} onClick={confirmDelete}>
              {pending ? "Удаление…" : "Удалить"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
