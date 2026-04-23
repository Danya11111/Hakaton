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
    <PageContainer className="space-y-10">
      <CompanyHero
        name={company.name}
        groupTitle={company.group.title}
        groupSlug={company.group.slug}
        totalAreaSqM={company.totalAreaSqM}
        locationCount={company.locationCount}
        sourceOnlyInExcel={company.sourceOnlyInExcel}
      />

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-slate-900">Расчёт и история</h2>
          <p className="text-sm text-slate-600">
            Заполните показатели — расчёт выполняется сразу на вашем устройстве и повторно проверяется на сервере при
            сохранении.
          </p>
        </div>
        <CriteriaForm
          companyId={company.id}
          companySlug={company.slug}
          groupCode={company.group.code}
          areaSqM={company.totalAreaSqM}
        />
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="font-display text-xl font-semibold text-slate-900">Последние сохранённые расчёты</h3>
          <p className="text-sm text-slate-600">До 10 последних записей для этого учреждения.</p>
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
