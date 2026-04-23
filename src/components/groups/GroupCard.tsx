"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function GroupCard({
  href,
  title,
  unitType,
  description,
  companyCount,
  index,
}: {
  href: string;
  title: string;
  unitType: string;
  description: string;
  companyCount: number;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
      whileHover={{ y: -6 }}
      className="h-full"
    >
      <Link href={href} className="group block h-full focus:outline-none">
        <Card className="relative h-full overflow-hidden border-white/50 bg-gradient-to-br from-white/95 via-white/90 to-slate-50/90 transition-shadow duration-300 group-hover:shadow-glow">
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sky-400/15 blur-2xl" />
            <div className="absolute -bottom-12 left-0 h-44 w-44 rounded-full bg-fuchsia-400/15 blur-2xl" />
          </div>
          <CardContent className="relative flex h-full flex-col gap-4 p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600/90">
                  {unitType}
                </p>
                <h3 className="font-display text-2xl font-semibold text-slate-900">{title}</h3>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/20 transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-3">
                <ArrowUpRight className="h-5 w-5" />
              </span>
            </div>
            <p className="flex-1 text-sm leading-relaxed text-slate-600">{description}</p>
            <div className="flex items-center justify-between rounded-2xl bg-slate-900/[0.03] px-4 py-3 ring-1 ring-slate-900/5">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <Sparkles className="h-4 w-4 text-amber-500" />
                {companyCount} компаний
              </div>
              <span className="text-xs font-semibold text-indigo-700">Подробнее</span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
