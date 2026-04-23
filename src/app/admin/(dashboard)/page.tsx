import Link from "next/link";
import { ArrowRight, Building2, ClipboardList, LineChart, Sparkles, Upload } from "lucide-react";
import { AdminHealthCard } from "@/components/admin/AdminHealthCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const [groups, companies, evaluations, latest, audit] = await Promise.all([
    prisma.group.count(),
    prisma.company.count(),
    prisma.evaluation.count(),
    prisma.evaluation.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { company: { select: { name: true, slug: true } } },
    }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-slate-900">Панель управления</h1>
        <p className="text-slate-600">Сводка по справочнику, здоровье API и последние события.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-white/60 bg-white/90 shadow-card backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Группы</CardTitle>
            <Sparkles className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="font-display text-4xl font-semibold">{groups}</p>
          </CardContent>
        </Card>
        <Card className="border-white/60 bg-white/90 shadow-card backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Компании</CardTitle>
            <Building2 className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <p className="font-display text-4xl font-semibold">{companies}</p>
          </CardContent>
        </Card>
        <Card className="border-white/60 bg-white/90 shadow-card backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Расчёты</CardTitle>
            <LineChart className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <p className="font-display text-4xl font-semibold">{evaluations}</p>
          </CardContent>
        </Card>
        <AdminHealthCard />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="gradient">
          <Link href="/admin/companies">
            Управление компаниями
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/import-export" className="inline-flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Импорт / экспорт
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/audit" className="inline-flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Журнал аудита
          </Link>
        </Button>
      </div>

      <Card className="border-white/60 bg-white/90 backdrop-blur-md">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Последние события аудита</CardTitle>
            <CardDescription>Логин, CRUD, импорт и выгрузки.</CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/audit">Все записи</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {audit.length === 0 ? (
            <p className="text-sm text-slate-600">Пока нет записей аудита.</p>
          ) : (
            audit.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-1 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-slate-900">{a.action}</p>
                  <p className="text-xs text-slate-500">
                    {a.actorUsername} · {a.entityType}
                    {a.entityLabel ? ` · ${a.entityLabel}` : ""}
                  </p>
                </div>
                <p className="text-xs text-slate-400">{a.createdAt.toLocaleString("ru-RU")}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-white/60 bg-white/90 backdrop-blur-md">
        <CardHeader>
          <CardTitle>Последние расчёты</CardTitle>
          <CardDescription>Недавно сохранённые оценки по всем учреждениям.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {latest.length === 0 ? (
            <p className="text-sm text-slate-600">Пока нет данных.</p>
          ) : (
            latest.map((e) => (
              <div
                key={e.id}
                className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-medium text-slate-900">{e.company?.name ?? "—"}</p>
                  <p className="text-xs text-slate-500">{e.periodLabel}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-lg font-semibold">{formatNumber(e.integralScore, 1)}</span>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/companies/${e.companyId}`}>Открыть</Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
