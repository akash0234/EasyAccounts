"use client";

import Link from "next/link";
import Lucide from "@/base-components/lucide";

export default function WhatsAppSettingsIndex() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">WhatsApp Business</h1>
      <p className="text-slate-600 dark:text-slate-300">Manage your WhatsApp Business integration. Test credentials and sync your product catalogue.</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link href="/settings/whatsapp/test" className="group block rounded-2xl border border-slate-200/70 p-6 shadow-sm transition hover:shadow-md dark:border-white/10">
          <div className="flex items-center gap-3">
            <Lucide icon="CheckCircle2" className="h-5 w-5 text-rubick-primary" />
            <div className="text-lg font-medium">Test Connection</div>
          </div>
          <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">Verify access token and catalog permissions.</div>
        </Link>

        <Link href="/settings/whatsapp/catalog" className="group block rounded-2xl border border-slate-200/70 p-6 shadow-sm transition hover:shadow-md dark:border-white/10">
          <div className="flex items-center gap-3">
            <Lucide icon="ShoppingBag" className="h-5 w-5 text-rubick-primary" />
            <div className="text-lg font-medium">Sync Catalogue</div>
          </div>
          <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">Push products to Commerce Manager using Graph API.</div>
        </Link>
      </div>
    </div>
  );
}
