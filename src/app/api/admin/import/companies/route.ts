import { NextResponse } from "next/server";
import { importCompaniesWorkbook, type ImportMode } from "@/lib/excel/companies-import";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  const modeRaw = String(form.get("mode") ?? "merge");
  const mode: ImportMode = modeRaw === "replace_companies" ? "replace_companies" : "merge";

  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ ok: false, error: "Файл не передан." }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const result = await importCompaniesWorkbook(buffer, mode);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/companies");
  revalidatePath("/admin/import-export");

  return NextResponse.json(result);
}
