"use client";

import { useMemo, useState, type ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => string | number;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
}

/** Řaditelná, vyhledávatelná tabulka se sticky hlavičkou (§9.4). */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  searchable = true,
  searchPlaceholder = "Hledat…",
  defaultSortKey,
  defaultSortDir = "asc",
}: {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  defaultSortKey?: string;
  defaultSortDir?: "asc" | "desc";
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((row) => columns.some((col) => String(col.accessor(row)).toLowerCase().includes(q)));
  }, [rows, query, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => {
      const av = col.accessor(a);
      const bv = col.accessor(b);
      const cmp =
        typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), "cs");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, columns]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div>
      {searchable && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="mb-3 w-full rounded-xl border border-border px-4 py-2 text-base"
        />
      )}
      <div className="max-h-[70vh] overflow-auto rounded-2xl border border-border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-surface-muted">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable !== false ? () => toggleSort(col.key) : undefined}
                  className={`border-b border-border px-3 py-2 text-left font-semibold text-vinci-blue-ink ${
                    col.sortable !== false ? "cursor-pointer select-none" : ""
                  }`}
                >
                  {col.header}
                  {sortKey === col.key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={getRowId(row)} className="border-b border-border odd:bg-surface even:bg-surface-muted/40 last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2">
                    {col.render ? col.render(row) : col.accessor(row)}
                  </td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-text-muted">
                  Nic nenalezeno.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
