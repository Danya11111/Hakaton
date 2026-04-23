import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { GroupCard } from "@/components/groups/GroupCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function GroupsIndexPage() {
  const groups = await prisma.group.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { companies: true } } },
  });

  const totalCompanies = groups.reduce((acc, g) => acc + g._count.companies, 0);

  return (
    <PageContainer className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="w-fit gap-2 px-0 text-slate-600 hover:text-slate-900">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              На главную
            </Link>
          </Button>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Группы учреждений
          </h1>
          <p className="max-w-2xl text-slate-600">
            Все направления рейтинга. Выберите карточку, чтобы открыть список организаций и поиск по группе.
          </p>
        </div>
        <div className="rounded-2xl border border-white/60 bg-white/80 px-5 py-4 text-right shadow-sm backdrop-blur-md">
          <p className="text-xs uppercase tracking-wide text-slate-500">Всего учреждений</p>
          <p className="font-display text-3xl font-semibold text-slate-900">{totalCompanies}</p>
          <p className="text-sm text-slate-500">групп в справочнике: {groups.length}</p>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-6 text-amber-950 backdrop-blur-md">
          <p className="font-medium">В базе пока нет групп.</p>
          <p className="mt-2 text-sm text-amber-900/90">
            Выполните миграции и seed (см. README) или импортируйте справочник из админки.
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/admin/import-export">Импорт / экспорт</Link>
          </Button>
        </div>
      ) : (
        <section className="space-y-6">
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
          <div className="flex justify-center">
            <Button asChild variant="gradient" className="rounded-2xl px-6">
              <Link href="/">
                На главную
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      )}
    </PageContainer>
  );
}
