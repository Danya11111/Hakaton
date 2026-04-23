"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export function AdminDashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/admin";
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminSidebar currentPath={pathname} />
      <div className="flex-1 px-4 py-8 lg:px-10">{children}</div>
    </div>
  );
}
