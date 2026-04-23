import { ImportExportClient } from "@/components/admin/ImportExportClient";

export default function AdminImportExportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-slate-900">Импорт и экспорт</h1>
        <p className="text-slate-600">Работа с Excel для массового обновления справочника.</p>
      </div>
      <ImportExportClient />
    </div>
  );
}
