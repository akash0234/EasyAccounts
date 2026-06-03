"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

export interface SimpleOption {
  value: string;
  label: string;
  hint?: string;
}

interface SimpleSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SimpleOption[];
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
}

export function SimpleSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled,
  allowClear = true,
  className,
}: SimpleSelectProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function handleSelect(v: string) {
    onChange(v);
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleClear() {
    onChange("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        readOnly
        disabled={disabled}
        value={selected?.label ?? ""}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen((o) => !o)}
        className={className}
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
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--muted)] ${
                value === opt.value ? "bg-[var(--muted)]" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(opt.value);
              }}
            >
              <span className="truncate">{opt.label}</span>
              {opt.hint && (
                <span className="shrink-0 text-xs text-[var(--muted-foreground)]">{opt.hint}</span>
              )}
            </button>
          ))}
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-[var(--muted-foreground)]">No options</div>
          )}
        </div>
      )}
    </div>
  );
}
