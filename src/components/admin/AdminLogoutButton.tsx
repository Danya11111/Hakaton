"use client";

import { LogOut } from "lucide-react";
import { adminLogout } from "@/actions/admin/auth";
import { useAdminCsrf } from "@/components/admin/AdminCsrfContext";
import { Button } from "@/components/ui/button";

export function AdminLogoutButton() {
  const csrf = useAdminCsrf();
  return (
    <form action={adminLogout}>
      <input type="hidden" name="csrf" value={csrf} />
      <Button type="submit" variant="outline" className="w-full justify-start gap-2">
        <LogOut className="h-4 w-4" />
        Выйти
      </Button>
    </form>
  );
}
