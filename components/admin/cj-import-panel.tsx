"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CJProductListItem } from "@/lib/cj-api";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [20, 50, 100];

interface CjSearchResponse {
  list?: CJProductListItem[];
  total?: number;
  pageNum?: number;
  pageSize?: number;
  importedIds?: string[];
  error?: string;
}

export function CjImportPanel() {
  const [productName, setProductName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [pageNum, setPageNum] = useState(1);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<CJProductListItem[]>([]);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [importingPid, setImportingPid] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [autoLimit, setAutoLimit] = useState(100);
  const [autoProgress, setAutoProgress] = useState<{
    done: number;
    total: number;
    page: number;
  } | null>(null);
  const cancelAutoRef = useRef(false);

  const totalPages = total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const busy = searching || bulkProgress !== null || autoProgress !== null;
  const selectableCount = results.filter((r) => !importedIds.has(r.pid)).length;
  const allSelected = selectableCount > 0 && selected.size === selectableCount;

  async function runSearch(page: number, size: number = pageSize): Promise<CjSearchResponse | null> {
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (productName) params.set("productName", productName);
      if (categoryId) params.set("categoryId", categoryId);
      params.set("pageNum", String(page));
      params.set("pageSize", String(size));

      const res = await fetch(`/api/admin/cj/search?${params.toString()}`);
      const data: CjSearchResponse = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");

      setResults(data.list ?? []);
      setTotal(data.total ?? 0);
      setPageNum(page);
      setImportedIds(new Set(data.importedIds ?? []));
      setSelected(new Set());
      setHasSearched(true);
      return data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed");
      return null;
    } finally {
      setSearching(false);
    }
  }

  function changePageSize(size: number) {
    setPageSize(size);
    if (hasSearched) runSearch(1, size);
  }

  async function importOne(pid: string): Promise<boolean> {
    try {
      const res = await fetch("/api/admin/cj/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setImportedIds((prev) => new Set(prev).add(pid));
      return true;
    } catch (error) {
      toast.error(`${pid}: ${error instanceof Error ? error.message : "Import failed"}`);
      return false;
    }
  }

  async function importProduct(pid: string) {
    setImportingPid(pid);
    const ok = await importOne(pid);
    if (ok) toast.success("Product imported");
    setImportingPid(null);
  }

  async function importSelected() {
    const pids = results
      .filter((r) => selected.has(r.pid) && !importedIds.has(r.pid))
      .map((r) => r.pid);
    if (pids.length === 0) return;

    setBulkProgress({ done: 0, total: pids.length });
    for (let i = 0; i < pids.length; i++) {
      await importOne(pids[i]);
      setBulkProgress({ done: i + 1, total: pids.length });
    }
    setSelected(new Set());
    setBulkProgress(null);
    toast.success("Selected products imported");
  }

  async function autoImportAll() {
    cancelAutoRef.current = false;
    setAutoProgress({ done: 0, total: Math.min(total || autoLimit, autoLimit), page: 1 });

    let page = 1;
    let done = 0;

    try {
      while (!cancelAutoRef.current && done < autoLimit) {
        const data = await runSearch(page, pageSize);
        if (!data?.list?.length) break;

        const knownTotal = Math.min(data.total ?? autoLimit, autoLimit);
        const imported = new Set(data.importedIds ?? []);

        for (const item of data.list) {
          if (cancelAutoRef.current || done >= autoLimit) break;
          if (!imported.has(item.pid)) {
            await importOne(item.pid);
          }
          done++;
          setAutoProgress({ done, total: knownTotal, page });
        }

        if (cancelAutoRef.current || done >= autoLimit) break;
        if (page * pageSize >= (data.total ?? 0)) break;
        page++;
      }
      toast.success(cancelAutoRef.current ? "Auto-import stopped" : "Auto-import finished");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Auto-import failed");
    } finally {
      setAutoProgress(null);
    }
  }

  function toggleSelectAll(checked: boolean) {
    setSelected(checked ? new Set(results.filter((r) => !importedIds.has(r.pid)).map((r) => r.pid)) : new Set());
  }

  function toggleSelect(pid: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(pid);
      else next.delete(pid);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Product name</label>
          <Input
            placeholder="e.g. wireless earbuds"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="w-56"
            disabled={busy}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Category id</label>
          <Input
            placeholder="optional"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-48"
            disabled={busy}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Page size</label>
          <div className="flex gap-1">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <Button
                key={size}
                type="button"
                size="sm"
                variant={pageSize === size ? "default" : "outline"}
                onClick={() => changePageSize(size)}
                disabled={busy}
              >
                {size}
              </Button>
            ))}
          </div>
        </div>
        <Button onClick={() => runSearch(1)} disabled={busy}>
          {searching ? (
            <>
              <Loader2 className="animate-spin" /> Searching...
            </>
          ) : (
            "Search CJ catalog"
          )}
        </Button>
      </div>

      {hasSearched && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => toggleSelectAll(!!checked)}
            disabled={busy || selectableCount === 0}
          />
          <span className="text-sm text-muted-foreground">
            {selected.size > 0 ? `${selected.size} selected` : "Select all on this page"}
          </span>
          <Button size="sm" onClick={importSelected} disabled={busy || selected.size === 0}>
            {bulkProgress
              ? `Importing ${bulkProgress.done}/${bulkProgress.total}...`
              : `Import selected (${selected.size})`}
          </Button>

          <div className="ml-auto flex items-center gap-2">
            {autoProgress ? (
              <>
                <span className="text-sm text-muted-foreground">
                  Auto-import: page {autoProgress.page} &middot; {autoProgress.done}/
                  {autoProgress.total} processed
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    cancelAutoRef.current = true;
                  }}
                >
                  <X /> Stop
                </Button>
              </>
            ) : (
              <>
                <Input
                  type="number"
                  min={1}
                  max={2000}
                  value={autoLimit}
                  onChange={(e) => setAutoLimit(Math.max(1, Number(e.target.value) || 1))}
                  className="w-20"
                  disabled={busy}
                />
                <Button size="sm" variant="secondary" onClick={autoImportAll} disabled={busy}>
                  <Sparkles /> Auto-import
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead className="w-16"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((item) => {
                const isImported = importedIds.has(item.pid);
                return (
                  <TableRow key={item.pid}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(item.pid)}
                        onCheckedChange={(checked) => toggleSelect(item.pid, !!checked)}
                        disabled={busy || isImported}
                      />
                    </TableCell>
                    <TableCell>
                      {item.productImage ? (
                        <Image
                          src={item.productImage}
                          alt={item.productNameEn ?? item.productName}
                          width={40}
                          height={40}
                          className="rounded object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted" />
                      )}
                    </TableCell>
                    <TableCell className="max-w-sm">
                      <p className="truncate">{item.productNameEn ?? item.productName}</p>
                      {item.categoryName && (
                        <p className="truncate text-xs text-muted-foreground">{item.categoryName}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.productSku}</TableCell>
                    <TableCell>${Number(item.sellPrice ?? 0).toFixed(2)}</TableCell>
                    <TableCell>
                      {isImported ? (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 />
                          Imported
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          disabled={busy || importingPid === item.pid}
                          onClick={() => importProduct(item.pid)}
                        >
                          {importingPid === item.pid ? (
                            <>
                              <Loader2 className="animate-spin" /> Importing...
                            </>
                          ) : (
                            "Import"
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {hasSearched && results.length === 0 && !searching && (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No products found. Try a different search term or category id.
        </p>
      )}

      {hasSearched && total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total.toLocaleString()} products found</span>
          <div className="flex items-center gap-2">
            <Button
              size="icon-sm"
              variant="outline"
              disabled={busy || pageNum <= 1}
              onClick={() => runSearch(pageNum - 1)}
            >
              <ChevronLeft />
            </Button>
            <span>
              Page {pageNum} of {totalPages.toLocaleString()}
            </span>
            <Button
              size="icon-sm"
              variant="outline"
              disabled={busy || pageNum >= totalPages}
              onClick={() => runSearch(pageNum + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
