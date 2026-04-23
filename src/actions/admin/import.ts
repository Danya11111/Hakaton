"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { writeAudit } from "@/lib/audit/write-audit";
import { getActorUsername } from "@/lib/actor";
import { buildImportPreview, MAX_IMPORT_BYTES } from "@/lib/excel/import-build-preview";
import { executeImportPayload } from "@/lib/excel/import-execute";
import { parseStoredImportPayload } from "@/lib/excel/import-payload-schema";
import type { DryRunSummary, ImportMode, ImportResult, RowIssue } from "@/lib/excel/import-types";
import { getClientIp, getUserAgent } from "@/lib/request-meta";
import { verifyAdminCsrfFromForm } from "@/lib/security/csrf";
import { prisma } from "@/lib/prisma";

const PREVIEW_TTL_MS = 20 * 60 * 1000;

export type PreviewCompaniesImportResponse =
  | {
      ok: true;
      previewId: string;
      summary: DryRunSummary;
      fatal: RowIssue[];
      warnings: RowIssue[];
    }
  | {
      ok: false;
      error?: string;
      fatal: RowIssue[];
      warnings: RowIssue[];
    };

export type ApplyCompaniesImportResponse =
  | { ok: true; result: ImportResult }
  | { ok: false; error: string; result?: ImportResult };

function isXlsxFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx")) return false;
  const t = file.type;
  if (!t) return true;
  return (
    t === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    t === "application/octet-stream"
  );
}

export async function previewCompaniesImportAction(formData: FormData): Promise<PreviewCompaniesImportResponse> {
  if (!(await verifyAdminCsrfFromForm(formData))) {
    return { ok: false, error: "CSRF: обновите страницу и войдите снова.", fatal: [], warnings: [] };
  }
  const h = await headers();
  const actor = await getActorUsername();
  const ip = getClientIp(h);
  const ua = getUserAgent(h);

  const file = formData.get("file");
  const modeRaw = String(formData.get("mode") ?? "merge");
  const mode: ImportMode = modeRaw === "replace_companies" ? "replace_companies" : "merge";

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Файл не передан.", fatal: [], warnings: [] };
  }
  if (!isXlsxFile(file)) {
    return { ok: false, error: "Допускаются только файлы .xlsx.", fatal: [], warnings: [] };
  }
  if (file.size > MAX_IMPORT_BYTES) {
    return {
      ok: false,
      error: `Файл слишком больший (максимум ${Math.round(MAX_IMPORT_BYTES / (1024 * 1024))} МБ).`,
      fatal: [],
      warnings: [],
    };
  }

  const buffer = await file.arrayBuffer();
  const built = await buildImportPreview(buffer, mode);

  if (!built.payload || built.fatal.length) {
    await writeAudit({
      actorUsername: actor,
      action: "import_preview",
      entityType: "import",
      entityLabel: file.name,
      metadata: { ok: false, mode, fatalCount: built.fatal.length, warningCount: built.warnings.length },
      ipAddress: ip,
      userAgent: ua,
    });
    return {
      ok: false,
      error: "Проверка файла не пройдена.",
      fatal: built.fatal,
      warnings: built.warnings,
    };
  }

  const expiresAt = new Date(Date.now() + PREVIEW_TTL_MS);
  const preview = await prisma.importPreview.create({
    data: {
      mode,
      payload: built.payload as object,
      expiresAt,
    },
  });

  await writeAudit({
    actorUsername: actor,
    action: "import_preview",
    entityType: "import",
    entityId: preview.id,
    entityLabel: file.name,
    metadata: { ok: true, mode, summary: built.summary },
    ipAddress: ip,
    userAgent: ua,
  });

  await prisma.importPreview.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  return {
    ok: true,
    previewId: preview.id,
    summary: built.summary!,
    fatal: built.fatal,
    warnings: built.warnings,
  };
}

export async function applyCompaniesImportAction(formData: FormData): Promise<ApplyCompaniesImportResponse> {
  if (!(await verifyAdminCsrfFromForm(formData))) {
    return { ok: false, error: "CSRF: обновите страницу и войдите снова." };
  }
  const h = await headers();
  const actor = await getActorUsername();
  const ip = getClientIp(h);
  const ua = getUserAgent(h);

  const previewId = String(formData.get("previewId") ?? "").trim();
  if (!previewId) {
    return { ok: false, error: "Не указан previewId." };
  }

  const row = await prisma.importPreview.findUnique({ where: { id: previewId } });
  if (!row || row.expiresAt < new Date()) {
    return { ok: false, error: "Предпросмотр устарел или не найден. Загрузите файл снова." };
  }

  const payload = parseStoredImportPayload(row.payload);
  if (!payload) {
    await prisma.importPreview.delete({ where: { id: previewId } }).catch(() => undefined);
    return { ok: false, error: "Некорректный payload предпросмотра." };
  }

  const result = await executeImportPayload(payload);

  await prisma.importPreview.delete({ where: { id: previewId } }).catch(() => undefined);

  await writeAudit({
    actorUsername: actor,
    action: "import_apply",
    entityType: "import",
    entityId: previewId,
    entityLabel: row.mode,
    metadata: {
      ok: result.ok,
      mode: result.mode,
      counters: result.counters,
      errors: result.errors.slice(0, 50),
    },
    ipAddress: ip,
    userAgent: ua,
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/companies");
  revalidatePath("/admin/import-export");

  if (!result.ok) {
    return { ok: false, error: "Импорт завершился с ошибками.", result };
  }
  return { ok: true, result };
}
