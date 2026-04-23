import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { writeAudit } from "@/lib/audit/write-audit";
import { getActorUsername } from "@/lib/actor";
import { buildTemplateBuffer } from "@/lib/excel/companies-export";
import { getClientIp, getUserAgent } from "@/lib/request-meta";

export async function GET() {
  const buf = buildTemplateBuffer();
  const h = await headers();
  const actor = await getActorUsername();
  await writeAudit({
    actorUsername: actor,
    action: "export_template",
    entityType: "export",
    entityLabel: "tinao-import-template.xlsx",
    metadata: { kind: "template" },
    ipAddress: getClientIp(h),
    userAgent: getUserAgent(h),
  });
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="tinao-import-template.xlsx"',
    },
  });
}
