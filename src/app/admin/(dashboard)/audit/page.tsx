import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entity?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const where: {
    action?: string;
    entityType?: string;
    createdAt?: { gte?: Date; lte?: Date };
  } = {};
  if (sp.action?.trim()) where.action = sp.action.trim();
  if (sp.entity?.trim()) where.entityType = sp.entity.trim();
  const createdAt: { gte?: Date; lte?: Date } = {};
  if (sp.from?.trim()) {
    const d = new Date(sp.from);
    if (!Number.isNaN(d.getTime())) createdAt.gte = d;
  }
  if (sp.to?.trim()) {
    const d = new Date(sp.to);
    if (!Number.isNaN(d.getTime())) createdAt.lte = d;
  }
  if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const qs = new URLSearchParams();
  if (sp.action) qs.set("action", sp.action);
  if (sp.entity) qs.set("entity", sp.entity);
  if (sp.from) qs.set("from", sp.from);
  if (sp.to) qs.set("to", sp.to);
  const q = qs.toString();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-slate-900">Журнал аудита</h1>
        <p className="text-slate-600">Ключевые действия в админке и импорт/экспорт.</p>
      </div>

      <Card className="border-white/60 bg-white/90 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-base">Фильтры</CardTitle>
          <CardDescription>GET-параметры; до 200 последних записей.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4" action="/admin/audit" method="get">
            <div className="space-y-1">
              <Label htmlFor="action">Действие</Label>
              <Input id="action" name="action" defaultValue={sp.action ?? ""} placeholder="import_apply" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="entity">Тип сущности</Label>
              <Input id="entity" name="entity" defaultValue={sp.entity ?? ""} placeholder="company" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="from">С даты</Label>
              <Input id="from" name="from" type="datetime-local" defaultValue={sp.from ?? ""} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="to">По дату</Label>
              <Input id="to" name="to" type="datetime-local" defaultValue={sp.to ?? ""} />
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-4">
              <Button type="submit" variant="gradient">
                Применить
              </Button>
              <Button asChild variant="outline" type="button">
                <Link href="/admin/audit">Сбросить</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-white/60 bg-white/90 backdrop-blur-md">
        <CardHeader>
          <CardTitle>Записи</CardTitle>
          <CardDescription>
            {rows.length} записей{q ? ` · фильтр: ?${q}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-600">Нет записей.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-sm text-slate-800"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-slate-900">{r.action}</span>
                    <span className="text-xs text-slate-500">{r.createdAt.toLocaleString("ru-RU")}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    {r.actorUsername} · {r.entityType}
                    {r.entityId ? ` · ${r.entityId}` : ""}
                    {r.entityLabel ? ` · ${r.entityLabel}` : ""}
                  </p>
                  {r.ipAddress ? <p className="text-[11px] text-slate-400">IP: {r.ipAddress}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
