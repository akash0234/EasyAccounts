"use client";

import { FormEvent, useEffect, useState } from "react";
import Lucide from "@/base-components/lucide";

export default function WhatsAppTestConnection() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [appAccessToken, setAppAccessToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [form, setForm] = useState({
    accessToken: "",
    catalogId: "",
    appId: "",
    appSecret: "",
  });

  async function runTest() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const r = await fetch("/api/whatsapp/test", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        throw new Error(j.error || "Test failed");
      }
      setResult(j);
      setAppAccessToken(j.appAccessToken || "");
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Load existing credentials first, then run a test if present
    void (async () => {
      try {
        const r = await fetch("/api/whatsapp/credentials", { cache: "no-store" });
        const j = await r.json();
        if (j?.credentials) {
          setForm({
            accessToken: j.credentials.accessToken || "",
            catalogId: j.credentials.catalogId || "",
            appId: j.credentials.appId || "",
            appSecret: j.credentials.appSecret || "",
          });
          if (j.credentials.accessToken && j.credentials.catalogId) {
            await runTest();
          }
        }
      } catch {
        // ignore load errors
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setResult(null);
    try {
      const r = await fetch("/api/whatsapp/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: form.accessToken,
          catalogId: form.catalogId,
          appId: form.appId || undefined,
          appSecret: form.appSecret || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        throw new Error(j.error || "Save failed");
      }
      await runTest();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Lucide icon="CheckCircle2" className="h-5 w-5 text-rubick-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">Test Connection</h1>
      </div>
      <p className="text-slate-600 dark:text-slate-300">Runs a live Graph API check using the stored access token and catalog_id for your active company.</p>

      <div className="rounded-2xl border border-slate-200/70 p-5 dark:border-white/10">
        <div className="mb-4 text-sm font-medium">Credentials</div>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <div className="mb-1 text-dark dark:text-slate-200">Access Token</div>
            <input
              type="password"
              value={form.accessToken}
              onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-transparent"
              placeholder="EAAG..."
            />
          </label>
          <label className="block text-sm">
            <div className="mb-1 text-dark dark:text-slate-200">Catalog ID</div>
            <input
              value={form.catalogId}
              onChange={(e) => setForm((f) => ({ ...f, catalogId: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-transparent"
              placeholder="123456789012345"
            />
          </label>
          
          <label className="block text-sm">
            <div className="mb-1 text-dark dark:text-slate-200">App ID</div>
            <input
              value={form.appId}
              onChange={(e) => setForm((f) => ({ ...f, appId: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-transparent"
              placeholder="APP_ID"
              required
            />
          </label>
          <label className="block text-sm">
            <div className="mb-1 text-dark dark:text-slate-200">App Secret</div>
            <input
              type="password"
              value={form.appSecret}
              onChange={(e) => setForm((f) => ({ ...f, appSecret: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-transparent"
              placeholder="APP_SECRET"
              required
            />
          </label>
          <div className="flex items-end">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-rubick-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
              <Lucide icon="Save" className="h-4 w-4" />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
          <div className="md:col-span-2 text-xs text-slate-500 dark:text-slate-400">Tip: You can save just App ID and App Secret now. Add Access Token + Catalog ID later when you’re ready to sync.</div>
          {appAccessToken ? (
            <label className="md:col-span-2 block text-sm">
              <div className="mb-1 text-dark dark:text-slate-200">Generated App Access Token (client_credentials)</div>
              <input
                value={appAccessToken}
                readOnly
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-50 dark:text-slate-300"
              />
            </label>
          ) : null}
        </form>

        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-700 dark:text-slate-200">Status</div>
          <button onClick={runTest} disabled={loading} className="rounded-full bg-rubick-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{loading ? "Testing..." : "Re-run"}</button>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</div>
        ) : null}

        {result ? (
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <div className="font-medium">Catalog</div>
              <pre className="mt-1 overflow-auto rounded-lg bg-slate-50 p-3 text-xs dark:bg-white/5">{JSON.stringify(result.catalog, null, 2)}</pre>
            </div>
            <div>
              <div className="font-medium">Sample Items</div>
              <pre className="mt-1 overflow-auto rounded-lg bg-slate-50 p-3 text-xs dark:bg-white/5">{JSON.stringify(result.sample, null, 2)}</pre>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
