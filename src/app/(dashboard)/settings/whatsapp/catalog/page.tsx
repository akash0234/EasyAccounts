"use client";

import { useState } from "react";
import Lucide from "@/base-components/lucide";

export default function WhatsAppSyncCatalogue() {
  const [currency, setCurrency] = useState("INR");
  const [limit, setLimit] = useState(100);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");

  async function syncNow() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const r = await fetch("/api/whatsapp/catalog-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency, limit }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        throw new Error(j.error || "Sync failed");
      }
      setResult(j.result);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Lucide icon="ShoppingBag" className="h-5 w-5 text-rubick-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">Sync Catalogue</h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300">Push active products to your WhatsApp Commerce Manager Catalog using the Graph API items_batch endpoint.</p>

      <div className="rounded-2xl border border-slate-200/70 p-5 dark:border-white/10">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block text-sm">
            <div className="mb-1 text-dark dark:text-slate-200">Currency</div>
            <input value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-transparent" />
          </label>
          <label className="block text-sm">
            <div className="mb-1 text-dark dark:text-slate-200">Limit</div>
            <input type="number" value={limit} onChange={(e) => setLimit(parseInt(e.target.value || "0", 10))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-transparent" />
          </label>
          <div className="flex items-end">
            <button onClick={syncNow} disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-rubick-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
              <Lucide icon="Upload" className="h-4 w-4" />
              {loading ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</div>
        ) : null}

        {result ? (
          <div className="mt-4">
            <div className="text-sm font-medium">Result</div>
            <pre className="mt-2 overflow-auto rounded-lg bg-slate-50 p-3 text-xs dark:bg-white/5">{JSON.stringify(result, null, 2)}</pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
