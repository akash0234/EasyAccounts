"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Lucide from "@/base-components/lucide";
import { matchesNavPath, navItems } from "@/components/layout/nav-items";

export function TopMenuNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 overflow-x-auto rounded-[24px] border border-slate-200/80 bg-white/85 px-3 py-3 text-slate-700 shadow-xl shadow-slate-950/10 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100">
      <div className="flex min-w-max items-center gap-2">
        {navItems.map((item) => {
          const isActive = matchesNavPath(pathname, item.href, item.match);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-rubick-primary text-white shadow-sm shadow-rubick-primary/20"
                  : "text-slate-600 hover:bg-rubick-primary/10 hover:text-rubick-primary dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              )}
            >
              <Lucide icon={item.icon} className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
