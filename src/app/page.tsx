import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GroupCard } from "@/components/groups/GroupCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const groups = await prisma.group.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { companies: true } } },
  });

  return (
    <PageContainer className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/75 p-8 shadow-glow backdrop-blur-xl sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-fuchsia-500/10" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-700">ТиНАО · Gov-tech clarity</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Рейтинг учреждений культуры и спорта
            </h1>
            <p className="text-lg leading-relaxed text-slate-600">
              Прозрачная карта групп, паспортные данные площадок и расчёт эффективности по единой методике. Интерфейс
              ориентирован на руководителей и аналитиков без технической подготовки.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="gradient" size="lg" className="rounded-2xl px-6">
                <Link href="/groups">
                  Перейти к группам
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-2xl px-6">
                <Link href="/groups/libraries">Библиотеки</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-3xl bg-slate-900 px-6 py-5 text-white shadow-2xl shadow-slate-900/30 ring-1 ring-white/10">
            <p className="text-xs uppercase tracking-wide text-white/60">В справочнике</p>
            <p className="mt-2 font-display text-4xl font-semibold">
              {groups.reduce((acc, g) => acc + g._count.companies, 0)}
            </p>
            <p className="text-sm text-white/70">учреждений · групп в справочнике: {groups.length}</p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-slate-900">Группы учреждений</h2>
            <p className="text-sm text-slate-600">Выберите направление, чтобы увидеть список организаций.</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((g, index) => (
            <GroupCard
              key={g.id}
              href={`/groups/${g.slug}`}
              title={g.title}
              unitType={g.unitType}
              description={g.description}
              companyCount={g._count.companies}
              index={index}
            />
          ))}
        </div>
      </section>
    </PageContainer>
  );
}
