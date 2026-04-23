import { CompanyAdminForm, type AdminGroupOption } from "@/components/admin/CompanyAdminForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCompanyNewPage() {
  const groups = await prisma.group.findMany({ orderBy: { sortOrder: "asc" } });
  const opts: AdminGroupOption[] = groups.map((g) => ({ id: g.id, title: g.title, code: g.code }));

  return <CompanyAdminForm groups={opts} company={null} />;
}
