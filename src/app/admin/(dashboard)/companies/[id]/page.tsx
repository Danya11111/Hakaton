import { notFound } from "next/navigation";
import { AdminDeleteCompany } from "@/components/admin/AdminDeleteCompany";
import { CompanyAdminForm, type AdminCompanyPayload, type AdminGroupOption } from "@/components/admin/CompanyAdminForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminCompanyEditPage({ params }: Props) {
  const { id } = await params;
  const [company, groups] = await Promise.all([
    prisma.company.findUnique({
      where: { id },
      include: {
        group: true,
        locations: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
        evaluations: { orderBy: { createdAt: "desc" }, take: 40 },
      },
    }),
    prisma.group.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  if (!company) notFound();

  const opts: AdminGroupOption[] = groups.map((g) => ({ id: g.id, title: g.title, code: g.code }));

  const payload: AdminCompanyPayload = {
    id: company.id,
    groupId: company.groupId,
    slug: company.slug,
    name: company.name,
    shortName: company.shortName ?? "",
    sourceOnlyInExcel: company.sourceOnlyInExcel,
    totalAreaSqM: company.totalAreaSqM,
    locationCount: company.locationCount,
    groupCode: company.group.code,
    locations: company.locations,
    evaluations: company.evaluations.map((e) => ({
      id: e.id,
      periodLabel: e.periodLabel,
      integralScore: e.integralScore,
      statusLabel: e.statusLabel,
      createdAt: e.createdAt.toISOString(),
      rawPayloadJson: e.rawPayloadJson,
    })),
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AdminDeleteCompany id={company.id} name={company.name} />
      </div>
      <CompanyAdminForm groups={opts} company={payload} />
    </div>
  );
}
