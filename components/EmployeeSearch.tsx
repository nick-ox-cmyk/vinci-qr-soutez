"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { EmployeeSearchResultDTO } from "@/lib/dto";

type Status = "idle" | "loading" | "empty" | "results";

/**
 * Našeptávač jméno + firma (§5.1). Plná klávesová ovladatelnost
 * (↑ ↓ Enter Esc), `role="combobox"` + ARIA (§9.4). Min. 2 znaky, debounce
 * 250ms, max. 8 výsledků (vynucuje i server, tohle je jen UX).
 */
export function EmployeeSearch({
  onSelect,
  placeholder,
  emptyLabel,
  loadingLabel,
  autoFocus,
}: {
  onSelect: (employee: EmployeeSearchResultDTO) => void;
  placeholder: string;
  emptyLabel: string;
  loadingLabel: string;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<EmployeeSearchResultDTO[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const listboxId = useId();
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setStatus("idle");
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("loading");
      setOpen(true);
      try {
        const res = await fetch(`/api/employees/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("search failed");
        const data: EmployeeSearchResultDTO[] = await res.json();
        setResults(data);
        setStatus(data.length > 0 ? "results" : "empty");
        setActiveIndex(-1);
      } catch (err) {
        if ((err as { name?: string }).name !== "AbortError") {
          setResults([]);
          setStatus("empty");
        }
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleSelect(employee: EmployeeSearchResultDTO) {
    setOpen(false);
    setQuery("");
    setResults([]);
    setStatus("idle");
    onSelect(employee);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < results.length) {
        e.preventDefault();
        handleSelect(results[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-vinci-blue-ink placeholder:text-text-muted focus:border-vinci-blue focus:outline-none focus:ring-2 focus:ring-vinci-blue/20"
      />

      {open && (
        <ul id={listboxId} role="listbox" className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          {status === "loading" && <li className="px-4 py-3 text-sm text-text-muted">{loadingLabel}</li>}
          {status === "empty" && <li className="px-4 py-3 text-sm text-text-muted">{emptyLabel}</li>}
          {status === "results" &&
            results.map((employee, index) => (
              <li
                key={employee.id}
                id={`${listboxId}-opt-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(employee);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={`cursor-pointer px-4 py-3 ${index === activeIndex ? "bg-wenow-green-soft" : ""}`}
              >
                <div className="font-medium text-vinci-blue-ink">{employee.fullName}</div>
                <div className="text-sm text-text-muted">{employee.companyName}</div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
