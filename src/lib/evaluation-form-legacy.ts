/**
 * Migrations for raw evaluation form payloads (e.g. saved before childEventsCount was introduced).
 */
function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function num(v: unknown): number {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * For group A: if an old save has childEventsSharePct (manual) but not childEventsCount,
 * derive an approximate count so the form validates and the score can be recalculated.
 * Removes childEventsSharePct from the form object so it does not confuse the new schema.
 */
export function migrateLegacyEvaluationForm(
  groupCode: string,
  form: Record<string, unknown>,
): void {
  if (groupCode !== "A" || !form) return;
  const hasCec = str(form.childEventsCount) !== "";
  if (hasCec) {
    delete form.childEventsSharePct;
    return;
  }
  const share = form.childEventsSharePct;
  const ev = form.eventsCount;
  if (str(share) === "" || str(ev) === "") {
    delete form.childEventsSharePct;
    return;
  }
  const nEv = num(ev);
  const nSh = num(share);
  if (Number.isFinite(nEv) && Number.isFinite(nSh) && nEv >= 0) {
    form.childEventsCount = String(Math.max(0, Math.round((nSh / 100) * nEv)));
  }
  delete form.childEventsSharePct;
}
