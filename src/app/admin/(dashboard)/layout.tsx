import { AdminDashboardShell } from "@/components/admin/AdminDashboardShell";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return <AdminDashboardShell>{children}</AdminDashboardShell>;
}
