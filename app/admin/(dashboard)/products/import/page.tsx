import { CjImportPanel } from "@/components/admin/cj-import-panel";

export default function AdminImportPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Import from CJ Dropshipping</h1>
        <p className="text-sm text-muted-foreground">
          Search the CJ catalog by product name or category id, then import products one by one,
          select a batch to import, or use auto-import to walk through every page of results.
          Already-imported products are marked and skipped automatically.
        </p>
      </div>
      <CjImportPanel />
    </div>
  );
}
