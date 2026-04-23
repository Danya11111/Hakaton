"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { shortUnitLabel } from "@/lib/unit-type-short";

export type GroupCompanyListItem = {
  slug: string;
  name: string;
  totalAreaSqM: number;
  locationCount: number;
  sourceOnlyInExcel: boolean;
};

type SortKey = "name-asc" | "name-desc" | "area-desc" | "area-asc";

export function GroupCompanyList({
  companies,
  groupSlug,
}: {
  companies: GroupCompanyListItem[];
  groupSlug: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("area-desc");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = companies.filter((c) => (q ? c.name.toLowerCase().includes(q) : true));
    const sorted = [...list].sort((a, b) => {
      if (sort === "name-asc") return a.name.localeCompare(b.name, "ru");
      if (sort === "name-desc") return b.name.localeCompare(a.name, "ru");
      if (sort === "area-asc") return a.totalAreaSqM - b.totalAreaSqM;
      return b.totalAreaSqM - a.totalAreaSqM;
    });
    return sorted;
  }, [companies, query, sort]);

  const shortType = shortUnitLabel(groupSlug);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-3xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur-md md:grid-cols-[1.2fr_0.8fr] md:items-end">
        <div className="space-y-2">
          <Label htmlFor="search">Поиск по названию</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="search"
              className="pl-10"
              placeholder="Начните вводить название учреждения"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Сортировка</Label>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите сортировку" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="area-desc">Площадь: сначала большие</SelectItem>
              <SelectItem value="area-asc">Площадь: сначала компактные</SelectItem>
              <SelectItem value="name-asc">Название: А → Я</SelectItem>
              <SelectItem value="name-desc">Название: Я → А</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c, index) => (
          <CompanyCard
            key={c.slug}
            href={`/companies/${c.slug}`}
            name={c.name}
            totalAreaSqM={c.totalAreaSqM}
            locationCount={c.locationCount}
            shortType={shortType}
            sourceOnlyInExcel={c.sourceOnlyInExcel}
            index={index}
          />
        ))}
      </div>

      {!filtered.length ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-sm text-slate-600 backdrop-blur">
          Ничего не найдено — попробуйте изменить запрос или сортировку.
        </div>
      ) : null}
    </div>
  );
}
