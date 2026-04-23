/**
 * One-time style bootstrap: if there are zero groups, run `prisma db seed`.
 * Safe to run on every boot when wired via RUN_BOOTSTRAP_IF_EMPTY=1 — exits immediately if data exists.
 * Run: node scripts/bootstrap-if-empty.mjs
 */
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
let count = 0;
try {
  count = await prisma.group.count();
} finally {
  await prisma.$disconnect();
}

if (count > 0) {
  console.log(`[bootstrap-if-empty] OK: already ${count} group(s), skip seed.`);
  process.exit(0);
}

console.log("[bootstrap-if-empty] No groups in DB; running prisma db seed…");
const r = spawnSync("npx", ["prisma", "db", "seed"], {
  stdio: "inherit",
  cwd: process.cwd(),
  env: process.env,
  shell: process.platform === "win32",
});
process.exit(r.status === 0 || r.status === null ? 0 : r.status);
