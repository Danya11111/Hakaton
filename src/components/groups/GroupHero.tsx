"use client";

import { motion } from "framer-motion";
import { Building2, MapPin } from "lucide-react";

export function GroupHero({
  title,
  unitType,
  description,
  companyCount,
}: {
  title: string;
  unitType: string;
  description: string;
  companyCount: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-8 shadow-glow backdrop-blur-xl sm:p-10">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-fuchsia-500/10" />
      <div className="relative space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-slate-900/10"
        >
          <Building2 className="h-3.5 w-3.5" />
          {unitType}
        </motion.div>
        <motion.h1
          className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          {title}
        </motion.h1>
        <motion.p
          className="max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
        >
          {description}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-wrap items-center gap-3 text-sm text-slate-600"
        >
          <span className="inline-flex items-center gap-2 rounded-2xl bg-white/80 px-4 py-2 shadow-sm ring-1 ring-slate-900/5">
            <MapPin className="h-4 w-4 text-indigo-600" />
            {companyCount} учреждений в рейтинге
          </span>
        </motion.div>
      </div>
    </div>
  );
}
