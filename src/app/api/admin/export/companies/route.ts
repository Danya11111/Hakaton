import { NextResponse } from "next/server";
import { buildCompaniesExportBuffer } from "@/lib/excel/companies-export";

export async function GET() {
  const buf = await buildCompaniesExportBuffer();
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="tinao-companies.xlsx"',
    },
  });
}
