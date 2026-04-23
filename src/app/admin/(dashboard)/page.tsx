import Link from "next/link";
import { ArrowRight, Building2, LineChart, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const [groups, companies, evaluations, latest] = await Promise.all([
    prisma.group.count(),
    prisma.company.count(),
    prisma.evaluation.count(),
    prisma.evaluation.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { company: { select: { name: true, slug: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-slate-900">Панель управления</h1>
        <p className="text-slate-600">Сводка по справочнику и быстрые действия.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="gradient">
          <Link href="/admin/companies">
            Управление компаниями
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/import-export">Импорт / экспорт</Link>
        </Button>
      </div>

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
                  <p className="font-medium text-slate-900">{e.company.name}</p>
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
