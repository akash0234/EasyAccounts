"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ReportShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <Link
          href="/reports"
          className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-slate-800"
          aria-label="Back to reports"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function SummaryStrip({
  items,
}: {
  items: { label: string; value: string; tone?: "default" | "positive" | "negative" | "warn" }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
      {items.map((it) => (
        <Card key={it.label} className="p-0">
          <CardContent className="p-4">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              {it.label}
            </div>
            <div
              className={cn(
                "mt-1 text-lg font-semibold",
                it.tone === "positive" && "text-emerald-600",
                it.tone === "negative" && "text-rose-600",
                it.tone === "warn" && "text-amber-600",
                (!it.tone || it.tone === "default") && "text-slate-800"
              )}
            >
              {it.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function formatINR(n: number) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function toCSV(
  filename: string,
  header: string[],
  rows: (string | number | null | undefined)[][]
) {
  const escape = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes("\n") || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [header.map(escape).join(",")];
  for (const row of rows) lines.push(row.map(escape).join(","));
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
