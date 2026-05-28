"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

export interface SearchSelectOption {
  id: string;
  label: string;
  hint?: string;
  meta?: unknown;
}

type SearchSelectRow = Record<string, unknown>;

interface SearchSelectProps<T extends SearchSelectRow> {
  value: string;
  displayValue: string;
  onChange: (option: SearchSelectOption | null) => void;
  endpoint: string;
  mapResult: (row: T) => SearchSelectOption;
  placeholder?: string;
  initialLimit?: number;
  searchLimit?: number;
  disabled?: boolean;
  allowClear?: boolean;
}

export function SearchSelect<T extends SearchSelectRow>({
  value,
  displayValue,
  onChange,
  endpoint,
  mapResult,
  placeholder = "Search...",
  initialLimit = 5,
  searchLimit = 50,
  disabled,
  allowClear = true,
}: SearchSelectProps<T>) {
  const [query, setQuery] = useState(displayValue);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchSelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  const displayValueRef = useRef(displayValue);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    displayValueRef.current = displayValue;
    setQuery(displayValue);
  }, [displayValue]);

  const hasQuery = query.trim().length > 0 && query.trim() !== displayValue.trim();

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const q = hasQuery ? query.trim() : "";
    const limit = q ? searchLimit : initialLimit;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const sep = endpoint.includes("?") ? "&" : "?";
        const res = await fetch(
          `${endpoint}${sep}q=${encodeURIComponent(q)}&limit=${limit}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) setResults(data.map((row) => mapResult(row as T)));
      } catch {
        // ignore aborts
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, open, hasQuery, endpoint, initialLimit, searchLimit, mapResult]);

  function handleSelect(option: SearchSelectOption) {
    onChange(option);
    setQuery(option.label);
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleClear() {
    onChange(null);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value && e.target.value !== displayValue) {
            onChange(null);
          }
        }}
        onFocus={(e) => {
          setOpen(true);
          e.target.select();
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setOpen(false);
            if (!valueRef.current) setQuery("");
            else setQuery(displayValueRef.current);
          }, 150);
        }}
      />
      {allowClear && value && !disabled && (
        <button
          type="button"
          aria-label="Clear"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
          onMouseDown={(e) => {
            e.preventDefault();
            handleClear();
          }}
        >
          ×
        </button>
      )}
      {open && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-md border border-[var(--border)] bg-[var(--card)] shadow-md">
          {results.map((option) => (
            <button
              key={option.id}
              type="button"
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--muted)]"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(option);
              }}
            >
              <span className="truncate">{option.label}</span>
              {option.hint && (
                <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                  {option.hint}
                </span>
              )}
            </button>
          ))}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-[var(--muted-foreground)]">
              {hasQuery ? "No matches" : "No results"}
            </div>
          )}
          {loading && (
            <div className="px-3 py-2 text-xs text-[var(--muted-foreground)]">
              Searching...
            </div>
          )}
          {!hasQuery && results.length >= initialLimit && (
            <div className="border-t border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)]">
              Type to search more...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
