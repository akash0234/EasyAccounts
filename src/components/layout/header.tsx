"use client";

import { useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { CalendarDays, LogOut, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInitials, getPageMeta } from "@/components/layout/nav-items";
import { MobileSidebar } from "@/components/layout/sidebar";

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const page = getPageMeta(pathname);
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(new Date()),
    []
  );
  const initials = getInitials(session?.user?.name);

  return (
    <>
      <header className="rubick-top-bar">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">
              <span>{page.groupLabel}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {todayLabel}
              </span>
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-3">
              <h1 className="truncate text-lg font-semibold text-slate-800">
                {page.label}
              </h1>
              <p className="hidden truncate text-sm text-slate-500 lg:block">
                {page.description}
              </p>
            </div>
          </div>
        </div>

        <div className="hidden flex-1 justify-center px-6 xl:flex">
          <label className="rubick-command">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customers, invoices, ledgers..."
              className="h-full w-full bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400"
            />
          </label>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {session?.user?.companyName && (
            <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-2 lg:block">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {session.user.organizationName}
              </div>
              <div className="text-sm text-slate-600">{session.user.companyName}</div>
            </div>
          )}

          <div className="hidden items-center gap-3 rounded-full bg-slate-100 p-1 pr-3 sm:flex">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rubick-primary text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="hidden md:block">
              <div className="max-w-[160px] truncate text-sm font-medium text-slate-700">
                {session?.user?.name ?? "EasyAccounts User"}
              </div>
              <div className="max-w-[160px] truncate text-xs text-slate-500">
                {session?.user?.email ?? "Signed in"}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-full border-slate-200 bg-white"
            title="Sign out"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />
    </>
  );
}
