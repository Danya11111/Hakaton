import Link from "next/link";
import { CompanyAdminForm, type AdminGroupOption } from "@/components/admin/CompanyAdminForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCompanyNewPage() {
  const groups = await prisma.group.findMany({ orderBy: { sortOrder: "asc" } });
  const opts: AdminGroupOption[] = groups.map((g) => ({ id: g.id, title: g.title, code: g.code }));

  if (opts.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Card className="border-amber-200/80 bg-white/95 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Нет групп в базе</CardTitle>
            <CardDescription>
              Сначала нужны группы (справочник). Выполните seed на сервере или импортируйте Excel из админки.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="gradient">
              <Link href="/admin/import-export">Импорт / экспорт</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/companies">К списку компаний</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <CompanyAdminForm groups={opts} company={null} />;
}
