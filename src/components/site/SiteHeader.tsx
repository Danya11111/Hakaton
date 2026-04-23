import Link from "next/link";
import { Sparkles } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/40 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-slate-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-500/25">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-base font-semibold">ТиНАО · Рейтинг</p>
            <p className="text-xs text-slate-500">Культура и спорт</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
          <Link className="transition hover:text-slate-900" href="/">
            Главная
          </Link>
          <Link className="transition hover:text-slate-900" href="/groups/dk">
            Группы
          </Link>
        </nav>
      </div>
    </header>
  );
}
