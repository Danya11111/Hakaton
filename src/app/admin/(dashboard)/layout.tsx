import { cookies } from "next/headers";
import { AdminDashboardShell } from "@/components/admin/AdminDashboardShell";
import { ADMIN_CSRF_COOKIE } from "@/lib/admin-auth-constants";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const csrf = (await cookies()).get(ADMIN_CSRF_COOKIE)?.value ?? "";
  return <AdminDashboardShell csrfToken={csrf}>{children}</AdminDashboardShell>;
}
