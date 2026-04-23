import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminCompaniesPage() {
  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    include: { group: { select: { title: true, code: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-slate-900">Компании</h1>
          <p className="text-sm text-slate-600">Список учреждений и переход к редактированию.</p>
        </div>
        <Button asChild variant="gradient">
          <Link href="/admin/companies/new">
            <Plus className="h-4 w-4" />
            Новая компания
          </Link>
        </Button>
      </div>

      <Card className="border-white/60 bg-white/90 backdrop-blur-md">
        <CardHeader>
          <CardTitle>Все записи ({companies.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="pb-2">Название</th>
                <th className="pb-2">Группа</th>
                <th className="pb-2">Slug</th>
                <th className="pb-2">Площадь</th>
                <th className="pb-2">Локации</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-t border-slate-200/80">
                  <td className="py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="py-3 text-slate-600">
                    {c.group.title} ({c.group.code})
                  </td>
                  <td className="py-3 text-slate-600">{c.slug}</td>
                  <td className="py-3">{formatNumber(c.totalAreaSqM, 1)} м²</td>
                  <td className="py-3">{c.locationCount}</td>
                  <td className="py-3 text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/companies/${c.id}`}>Изменить</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
