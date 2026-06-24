import { CjImportPanel } from "@/components/admin/cj-import-panel";

export default function AdminImportPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Імпорт з CJ Dropshipping</h1>
        <p className="text-sm text-muted-foreground">
          Шукайте товари в каталозі CJ за назвою або ID категорії, потім імпортуйте їх по одному,
          оберіть кілька для пакетного імпорту, або скористайтесь автоімпортом, щоб пройти всі сторінки
          результатів. Підтягуються лише товари, що реально є в наявності на CJ — вже імпортовані
          товари позначаються і автоматично пропускаються.
        </p>
      </div>
      <CjImportPanel />
    </div>
  );
}
