"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Layers, MapPinned } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";

export function CompanyHero({
  name,
  groupTitle,
  groupSlug,
  totalAreaSqM,
  locationCount,
  sourceOnlyInExcel,
}: {
  name: string;
  groupTitle: string;
  groupSlug: string;
  totalAreaSqM: number;
  locationCount: number;
  sourceOnlyInExcel: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-5 text-white shadow-2xl sm:p-6 sm:rounded-3xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.35),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(244,114,182,0.25),transparent_40%)]" />
      <div className="relative space-y-4 sm:space-y-5">
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-white/70 sm:text-sm">
          <Link
            href={`/groups/${groupSlug}`}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white ring-1 ring-white/20 transition hover:bg-white/15"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {groupTitle}
          </Link>
          {sourceOnlyInExcel ? (
            <Badge variant="secondary" className="bg-white/15 text-white ring-1 ring-white/30">
              из Excel
            </Badge>
          ) : null}
        </div>
        <motion.h1
          className="font-display text-2xl font-semibold leading-tight sm:text-3xl lg:text-4xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          {name}
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3"
        >
          <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur sm:p-3.5">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/60 sm:text-xs">
              <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Площадь
            </div>
            <p className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{formatNumber(totalAreaSqM, 1)} м²</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur sm:p-3.5">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/60 sm:text-xs">
              <MapPinned className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Локации
            </div>
            <p className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{locationCount}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-r from-sky-400/20 via-indigo-400/20 to-fuchsia-400/20 p-3 ring-1 ring-white/20 backdrop-blur sm:col-span-2 sm:p-3.5 lg:col-span-1">
            <p className="text-[10px] uppercase tracking-wide text-white/70 sm:text-xs">Паспортные данные</p>
            <p className="mt-1.5 text-xs text-white/80 sm:text-sm">
              Площадь и число локаций в справочнике; участвуют в автопоказателях эффективности.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
