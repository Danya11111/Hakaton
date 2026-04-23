export function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export function num(v: unknown): number {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export function bool(v: unknown): boolean {
  const s = str(v).toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "да";
}

export function jsonFormToFormRecord(form: Record<string, unknown>): Record<string, unknown> {
  const skip = new Set(["auto", "values"]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(form)) {
    if (skip.has(k)) continue;
    if (v === null || v === undefined) out[k] = "";
    else if (typeof v === "number" || typeof v === "boolean") out[k] = String(v);
    else if (typeof v === "string") out[k] = v;
    else out[k] = JSON.stringify(v);
  }
  return out;
}
