"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveCompanyAdmin } from "@/actions/admin/companies";
import { useAdminCsrf } from "@/components/admin/AdminCsrfContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumber } from "@/lib/utils";
import { AdminEvaluationsPanel } from "@/components/admin/AdminEvaluationsPanel";

export type AdminGroupOption = { id: string; title: string; code: string };

export type AdminLocationRow = {
  id: string;
  title: string;
  addressLine: string;
  areaSqM: string;
  locationType: string;
  sortOrder: string;
};

export type AdminCompanyPayload = {
  id: string;
  groupId: string;
  slug: string;
  name: string;
  shortName: string;
  sourceOnlyInExcel: boolean;
  totalAreaSqM: number;
  locationCount: number;
  groupCode: string;
  locations: {
    id: string;
    title: string | null;
    addressLine: string;
    areaSqM: number;
    locationType: string | null;
    sortOrder: number;
  }[];
  evaluations: {
    id: string;
    periodLabel: string;
    integralScore: number;
    statusLabel: string;
    createdAt: string;
    rawPayloadJson: unknown;
  }[];
};

function locToRow(l: AdminCompanyPayload["locations"][0]): AdminLocationRow {
  return {
    id: l.id,
    title: l.title ?? "",
    addressLine: l.addressLine,
    areaSqM: String(l.areaSqM),
    locationType: l.locationType ?? "",
    sortOrder: String(l.sortOrder),
  };
}

function emptyRow(): AdminLocationRow {
  return { id: "", title: "", addressLine: "", areaSqM: "0", locationType: "", sortOrder: "0" };
}

export function CompanyAdminForm({
  groups,
  company,
}: {
  groups: AdminGroupOption[];
  company: AdminCompanyPayload | null;
}) {
  const router = useRouter();
  const csrf = useAdminCsrf();
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);
  const [groupId, setGroupId] = useState(company?.groupId ?? groups[0]?.id ?? "");
  const [name, setName] = useState(company?.name ?? "");
  const [shortName, setShortName] = useState(company?.shortName ?? "");
  const [slug, setSlug] = useState(company?.slug ?? "");
  const [sourceOnly, setSourceOnly] = useState(company?.sourceOnlyInExcel ?? false);
  const [locations, setLocations] = useState<AdminLocationRow[]>(
    company?.locations?.length ? company.locations.map(locToRow) : [emptyRow()],
  );

  useEffect(() => {
    if (!dirty) return;
    const fn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty]);

  const liveSummary = useMemo(() => {
    let area = 0;
    let count = 0;
    for (const l of locations) {
      const a = Number(String(l.areaSqM).replace(",", "."));
      if (!Number.isFinite(a) || a <= 0) continue;
      area += a;
      count += 1;
    }
    return { area, count };
  }, [locations]);

  function setRow(index: number, patch: Partial<AdminLocationRow>) {
    setDirty(true);
    setLocations((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRow(index: number) {
    setDirty(true);
    setLocations((rows) => rows.filter((_, i) => i !== index));
  }

  const handleSave = () => {
    if (!csrf) {
      toast.error("Защита формы не готова. Подождите секунду и обновите страницу.");
      return;
    }
    startTransition(async () => {
      const res = await saveCompanyAdmin({
        csrf,
        id: company?.id,
        meta: {
          id: company?.id,
          groupId,
          name,
          shortName: shortName.trim() || null,
          slug: slug.trim(),
          sourceOnlyInExcel: sourceOnly,
        },
        locations: locations.map((l, idx) => ({
          id: l.id || undefined,
          title: l.title || null,
          addressLine: l.addressLine,
          areaSqM: Number(String(l.areaSqM).replace(",", ".")),
          locationType: l.locationType || null,
          sortOrder: Number.parseInt(String(l.sortOrder), 10) || idx,
        })),
      });
      if (!res.ok) {
        toast.error(res.message ?? "Ошибка");
        return;
      }
      setDirty(false);
      toast.success("Сохранено");
      if (!company?.id && res.id) {
        router.push(`/admin/companies/${res.id}`);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-slate-900">
            {company ? "Редактирование компании" : "Новая компания"}
          </h1>
          <p className="text-sm text-slate-600">Площадь и число локаций пересчитываются автоматически после сохранения.</p>
          {dirty ? (
            <p className="text-sm font-medium text-amber-800">Есть несохранённые изменения — не закрывайте вкладку без сохранения.</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/companies">Назад</Link>
          </Button>
          <Button variant="gradient" onClick={handleSave} disabled={pending}>
            {pending ? "Сохранение…" : "Сохранить"}
          </Button>
        </div>
      </div>

      <Card className="border-white/60 bg-white/90 shadow-card backdrop-blur-md">
        <CardHeader>
          <CardTitle>Сводка (черновик)</CardTitle>
          <CardDescription>
            Сумма площадей по строкам: {formatNumber(liveSummary.area, 2)} м² · строк: {locations.length} (учитываются
            только строки с площадью &gt; 0 для ориентира)
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-900/[0.03] p-4 ring-1 ring-slate-900/5">
            <p className="text-xs uppercase text-slate-500">В БД после сохранения</p>
            <p className="font-display text-2xl font-semibold text-slate-900">
              {company ? `${formatNumber(company.totalAreaSqM, 1)} м²` : "—"}
            </p>
            <p className="text-sm text-slate-600">Локаций: {company?.locationCount ?? "—"}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-indigo-600/10 to-fuchsia-600/10 p-4 ring-1 ring-indigo-500/15">
            <p className="text-xs uppercase text-indigo-800">Подсказка</p>
            <p className="text-sm text-slate-700">
              После сохранения агрегаты берутся только из таблицы локаций. Удалите лишние строки или задайте нулевую
              площадь — такие строки можно очистить перед сохранением.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="main">
        <TabsList>
          <TabsTrigger value="main">Основное</TabsTrigger>
          <TabsTrigger value="locations">Локации</TabsTrigger>
          {company ? <TabsTrigger value="evaluations">Расчёты</TabsTrigger> : null}
        </TabsList>
        <TabsContent value="main" className="space-y-4">
          <Card className="border-white/60 bg-white/90 backdrop-blur-md">
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label>Группа</Label>
                <Select
                  value={groupId}
                  onValueChange={(v) => {
                    setDirty(true);
                    setGroupId(v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите группу" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.title} ({g.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Название</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => {
                      setDirty(true);
                      setName(e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shortName">Краткое название</Label>
                  <Input
                    id="shortName"
                    value={shortName}
                    onChange={(e) => {
                      setDirty(true);
                      setShortName(e.target.value);
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug URL</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setDirty(true);
                    setSlug(e.target.value);
                  }}
                  placeholder="latin-kebab"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="excel"
                  checked={sourceOnly}
                  onCheckedChange={(v) => {
                    setDirty(true);
                    setSourceOnly(v === true);
                  }}
                />
                <Label htmlFor="excel">Только в сводном Excel</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="locations" className="space-y-4">
          <Card className="border-white/60 bg-white/90 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Локации</CardTitle>
                <CardDescription>Каждая строка — отдельная площадка. Пустые строки удалите перед сохранением.</CardDescription>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDirty(true);
                  setLocations((r) => [...r, emptyRow()]);
                }}
              >
                Добавить строку
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {locations.map((row, idx) => (
                <div
                  key={`${row.id}-${idx}`}
                  className="grid gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 md:grid-cols-6"
                >
                  <div className="space-y-1 md:col-span-2">
                    <Label>Название</Label>
                    <Input value={row.title} onChange={(e) => setRow(idx, { title: e.target.value })} />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Адрес</Label>
                    <Input value={row.addressLine} onChange={(e) => setRow(idx, { addressLine: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Площадь, м²</Label>
                    <Input value={row.areaSqM} onChange={(e) => setRow(idx, { areaSqM: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Тип</Label>
                    <Input
                      value={row.locationType}
                      onChange={(e) => setRow(idx, { locationType: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Порядок</Label>
                    <Input value={row.sortOrder} onChange={(e) => setRow(idx, { sortOrder: e.target.value })} />
                  </div>
                  <div className="flex items-end md:col-span-6">
                    <Button type="button" variant="outline" onClick={() => removeRow(idx)}>
                      Удалить строку
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        {company ? (
          <TabsContent value="evaluations">
            <AdminEvaluationsPanel
              csrf={csrf}
              companyId={company.id}
              companySlug={company.slug}
              groupCode={company.groupCode}
              areaSqM={company.totalAreaSqM}
              evaluations={company.evaluations}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
