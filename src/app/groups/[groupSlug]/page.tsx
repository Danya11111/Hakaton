import { notFound } from "next/navigation";
import { GroupCompanyList } from "@/components/companies/GroupCompanyList";
import { GroupHero } from "@/components/groups/GroupHero";
import { PageContainer } from "@/components/layout/PageContainer";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ groupSlug: string }> };

export default async function GroupPage({ params }: PageProps) {
  const { groupSlug } = await params;
  const group = await prisma.group.findUnique({
    where: { slug: groupSlug },
    include: {
      companies: { orderBy: { name: "asc" } },
    },
  });

  if (!group) notFound();

  return (
    <PageContainer className="space-y-10">
      <GroupHero
        title={group.title}
        unitType={group.unitType}
        description={group.description}
        companyCount={group.companies.length}
      />
      <GroupCompanyList
        groupSlug={group.slug}
        companies={group.companies.map((c) => ({
          slug: c.slug,
          name: c.name,
          totalAreaSqM: c.totalAreaSqM,
          locationCount: c.locationCount,
          sourceOnlyInExcel: c.sourceOnlyInExcel,
        }))}
      />
    </PageContainer>
  );
}
