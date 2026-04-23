import * as XLSX from "xlsx";

export const SHEET_GROUPS = "groups";
export const SHEET_COMPANIES = "companies";
export const SHEET_LOCATIONS = "locations";
export const SHEET_EVALUATIONS = "evaluations";

export function sheetFromRows<T extends Record<string, unknown>>(name: string, rows: T[]) {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ _empty: "" }]);
  if (rows.length === 0) {
    delete (ws as Record<string, unknown>)["!ref"];
  }
  return { name, ws };
}

export function buildWorkbook(sheets: { name: string; ws: XLSX.WorkSheet }[]) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    XLSX.utils.book_append_sheet(wb, s.ws, s.name);
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function parseWorkbook(buffer: ArrayBuffer): XLSX.WorkBook {
  return XLSX.read(buffer, { type: "array", cellDates: true });
}

export function sheetToJson<T = Record<string, unknown>>(wb: XLSX.WorkBook, name: string): T[] {
  const sheet = wb.Sheets[name];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<T>(sheet, { defval: "" });
}
