"use client";

import { usePathname } from "next/navigation";
import { AdminCsrfProvider } from "@/components/admin/AdminCsrfContext";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export function AdminDashboardShell({
  children,
  csrfToken,
}: {
  children: React.ReactNode;
  csrfToken: string;
}) {
  const pathname = usePathname() ?? "/admin";
  return (
    <AdminCsrfProvider initialToken={csrfToken}>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <AdminSidebar currentPath={pathname} />
        <div className="flex-1 px-4 py-8 lg:px-10">{children}</div>
      </div>
    </AdminCsrfProvider>
  );
}
