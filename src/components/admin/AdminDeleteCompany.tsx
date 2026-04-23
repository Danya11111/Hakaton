"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteCompanyAdmin } from "@/actions/admin/companies";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function AdminDeleteCompany({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function runDelete() {
    startTransition(async () => {
      const res = await deleteCompanyAdmin(id);
      if (!res.ok) {
        toast.error(res.message ?? "Ошибка");
        return;
      }
      toast.success("Компания удалена");
      setOpen(false);
      router.push("/admin/companies");
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" type="button" onClick={() => setOpen(true)}>
        Удалить компанию
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить «{name}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Будут удалены все локации и расчёты этой компании. Действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <Button variant="destructive" disabled={pending} type="button" onClick={runDelete}>
              {pending ? "Удаление…" : "Удалить навсегда"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
