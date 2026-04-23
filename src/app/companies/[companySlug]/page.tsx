import { notFound } from "next/navigation";
import { CompanyHero } from "@/components/companies/CompanyHero";
import { PageContainer } from "@/components/layout/PageContainer";
import { CriteriaForm } from "@/components/scoring/CriteriaForm";
import { LastEvaluationsList } from "@/components/scoring/LastEvaluationsList";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ companySlug: string }> };

export default async function CompanyPage({ params }: PageProps) {
  const { companySlug } = await params;
  const company = await prisma.company.findUnique({
    where: { slug: companySlug },
    include: {
      group: true,
      evaluations: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!company) notFound();

  return (
    <PageContainer className="space-y-6 sm:space-y-8">
      <CompanyHero
        name={company.name}
        groupTitle={company.group.title}
        groupSlug={company.group.slug}
        totalAreaSqM={company.totalAreaSqM}
        locationCount={company.locationCount}
        sourceOnlyInExcel={company.sourceOnlyInExcel}
      />

      <section className="space-y-3 sm:space-y-4" aria-label="Расчёт и аналитика">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900 sm:text-2xl">Нормирование и оценка</h2>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            Введите фактические показатели. Расчёт на устройстве; при сохранении — проверка на сервере.
          </p>
        </div>
        <CriteriaForm
          companyId={company.id}
          companySlug={company.slug}
          groupCode={company.group.code}
          areaSqM={company.totalAreaSqM}
        />
      </section>

      <section className="space-y-2.5 border-t border-slate-200/60 pt-6" aria-label="История">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Сохранённые расчёты</h3>
          <p className="text-xs text-slate-500">До 10 последних записей</p>
        </div>
        <LastEvaluationsList
          evaluations={company.evaluations.map((e) => ({
            id: e.id,
            periodLabel: e.periodLabel,
            integralScore: e.integralScore,
            statusLabel: e.statusLabel,
            createdAt: e.createdAt,
          }))}
        />
      </section>
    </PageContainer>
  );
}
