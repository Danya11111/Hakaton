"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn, formatNumber } from "@/lib/utils";

export function CompanyCard({
  href,
  name,
  totalAreaSqM,
  locationCount,
  shortType,
  sourceOnlyInExcel,
  index,
}: {
  href: string;
  name: string;
  totalAreaSqM: number;
  locationCount: number;
  shortType: string;
  sourceOnlyInExcel: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: index * 0.03 }}
      whileHover={{ y: -4 }}
    >
      <Link
        href={href}
        className={cn(
          "group flex h-full flex-col rounded-2xl border border-white/60 bg-white/85 p-5 shadow-sm backdrop-blur-md transition-all duration-300",
          "hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/10",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{shortType}</p>
            <h3 className="mt-1 font-display text-lg font-semibold text-slate-900 group-hover:text-indigo-800">
              {name}
            </h3>
          </div>
          {sourceOnlyInExcel ? (
            <Badge variant="muted" className="shrink-0">
              из Excel
            </Badge>
          ) : null}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
          <div className="rounded-xl bg-slate-900/[0.03] px-3 py-2 ring-1 ring-slate-900/5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Площадь</p>
            <p className="mt-1 font-semibold text-slate-900">{formatNumber(totalAreaSqM, 1)} м²</p>
          </div>
          <div className="rounded-xl bg-slate-900/[0.03] px-3 py-2 ring-1 ring-slate-900/5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Локации</p>
            <p className="mt-1 font-semibold text-slate-900">{locationCount}</p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
