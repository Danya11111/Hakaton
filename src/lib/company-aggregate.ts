import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = typeof prisma | Prisma.TransactionClient;

/** Пересчитывает totalAreaSqM и locationCount из строк локаций. */
export async function syncCompanyLocationAggregates(
  companyId: string,
  db: DbClient = prisma,
): Promise<{
  totalAreaSqM: number;
  locationCount: number;
}> {
  const rows = await db.companyLocation.findMany({
    where: { companyId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  const locationCount = rows.length;
  const totalAreaSqM =
    locationCount === 0 ? 0 : rows.reduce((sum, r) => sum + (Number.isFinite(r.areaSqM) ? r.areaSqM : 0), 0);

  await db.company.update({
    where: { id: companyId },
    data: { totalAreaSqM, locationCount },
  });

  return { totalAreaSqM, locationCount };
}
