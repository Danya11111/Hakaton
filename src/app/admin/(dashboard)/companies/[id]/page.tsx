import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminDeleteCompany } from "@/components/admin/AdminDeleteCompany";
import { CompanyAdminForm, type AdminCompanyPayload, type AdminGroupOption } from "@/components/admin/CompanyAdminForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  const prefix = `${company.slug} —`;
  const auditForCompany = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: "company", entityId: company.id },
        { entityLabel: { startsWith: prefix } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

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
    <div className="space-y-6">
      <div className="flex justify-end">
        <AdminDeleteCompany id={company.id} name={company.name} />
      </div>
      <CompanyAdminForm groups={opts} company={payload} />
      <Card className="border-white/60 bg-white/90 backdrop-blur-md">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Аудит по компании</CardTitle>
            <CardDescription>Последние действия, связанные с этой записью.</CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/audit?entity=company`}>Все по типу company</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {auditForCompany.length === 0 ? (
            <p className="text-slate-600">Записей пока нет.</p>
          ) : (
            auditForCompany.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
                <p className="font-medium text-slate-900">{a.action}</p>
                <p className="text-xs text-slate-500">
                  {a.actorUsername} · {a.createdAt.toLocaleString("ru-RU")}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
