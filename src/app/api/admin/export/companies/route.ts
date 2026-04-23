import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { writeAudit } from "@/lib/audit/write-audit";
import { getActorUsername } from "@/lib/actor";
import { buildCompaniesExportBuffer } from "@/lib/excel/companies-export";
import { getClientIp, getUserAgent } from "@/lib/request-meta";

export async function GET() {
  const buf = await buildCompaniesExportBuffer();
  const h = await headers();
  const actor = await getActorUsername();
  await writeAudit({
    actorUsername: actor,
    action: "export_workbook",
    entityType: "export",
    entityLabel: "companies.xlsx",
    metadata: { kind: "companies" },
    ipAddress: getClientIp(h),
    userAgent: getUserAgent(h),
  });
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="tinao-companies.xlsx"',
    },
  });
}
