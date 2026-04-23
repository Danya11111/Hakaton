import Link from "next/link";
import { Building2, Home, LogOut, Upload } from "lucide-react";
import { adminLogout } from "@/actions/admin/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Обзор", icon: Home },
  { href: "/admin/companies", label: "Компании", icon: Building2 },
  { href: "/admin/import-export", label: "Импорт / экспорт", icon: Upload },
];

export function AdminSidebar({ currentPath }: { currentPath: string }) {
  return (
    <aside className="flex w-full flex-col gap-6 border-b border-white/50 bg-white/70 p-4 backdrop-blur-xl lg:w-64 lg:border-b-0 lg:border-r">
      <div>
        <p className="font-display text-lg font-semibold text-slate-900">Админ · ТиНАО</p>
        <p className="text-xs text-slate-500">Управление данными</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = currentPath === href || (href !== "/admin" && currentPath.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                active ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-900/5",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <form action={adminLogout}>
        <Button type="submit" variant="outline" className="w-full justify-start gap-2">
          <LogOut className="h-4 w-4" />
          Выйти
        </Button>
      </form>
    </aside>
  );
}
