"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Lucide from "@/base-components/lucide";
import logoUrl from "@/assets/images/logo.svg";
import {
  navGroups,
  matchesNavPath,
  type NavItem,
} from "@/components/layout/nav-items";

function SidebarNavigation({
  mobile = false,
  compact = false,
  onNavigate,
}: {
  mobile?: boolean;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const topNavGroups = navGroups.filter((group) => group.placement !== "bottom");
  const bottomNavGroups = navGroups.filter(
    (group) => group.placement === "bottom"
  );
  let animationIndex = 0;

  function isItemActive(item: NavItem) {
    if (item.children) {
      return item.children.some(
        (c) => matchesNavPath(pathname, c.href, c.match)
      );
    }
    return matchesNavPath(pathname, item.href, item.match);
  }

  function renderNavLink(
    item: NavItem,
    idx: number,
    {
      isActive,
      activeTone = "default",
      isChild = false,
    }: { isActive: boolean; activeTone?: "default" | "soft"; isChild?: boolean }
  ) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        title={compact ? item.label : undefined}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "mx-2 flex items-center rounded-full text-sm transition-all duration-150",
          isChild ? "h-[42px] pl-12 pr-4" : "h-[52px] pl-5 pr-4",
          compact && "mx-auto h-12 w-12 justify-center px-0",
          isActive
            ? activeTone === "soft"
              ? "border border-white/40 bg-white/75 text-slate-900 shadow-sm"
              : "rubick-nav-active"
            : "text-white/70 hover:bg-white/5 hover:text-white"
        )}
        style={{
          opacity: 0,
          transform: "translateX(50px)",
          animation: "rubick-intro-menu 0.4s ease-in-out forwards",
          animationDelay: `${idx * 0.08 + 0.2}s`,
        }}
      >
          <Lucide
            icon={item.icon}
            className={cn(
              isChild ? "h-3.5 w-3.5" : "h-4 w-4",
              "flex-shrink-0",
              isActive ? "text-rubick-primary" : "text-current"
            )}
          />
        <div className={cn("ml-3 min-w-0 flex-1", compact && "hidden")}>
          <div
            className={cn(
              "truncate",
              isActive && "font-medium text-slate-800"
            )}
          >
            {item.label}
          </div>
          {!isChild && (
            <div
              className={cn(
                "hidden truncate text-xs lg:block",
                isActive ? "text-slate-500" : "text-white/45"
              )}
            >
              {item.description}
            </div>
          )}
        </div>
      </Link>
    );
  }

  function CollapsibleNavItem({ item }: { item: NavItem }) {
    const isActive = isItemActive(item);
    const [open, setOpen] = useState(isActive);
    const idx = animationIndex++;

    return (
      <li className="mb-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title={compact ? item.label : undefined}
          className={cn(
            "mx-2 flex h-[52px] w-[calc(100%-16px)] items-center rounded-full pl-5 pr-4 text-sm transition-all duration-150",
            compact && "mx-auto h-12 w-12 justify-center px-0",
            isActive
              ? "rubick-nav-active"
              : "text-white/70 hover:bg-white/5 hover:text-white"
          )}
          style={{
            opacity: 0,
            transform: "translateX(50px)",
            animation: "rubick-intro-menu 0.4s ease-in-out forwards",
            animationDelay: `${idx * 0.08 + 0.2}s`,
          }}
        >
          <Lucide
            icon={item.icon}
            className={cn(
              "h-4 w-4 flex-shrink-0",
              isActive ? "text-rubick-primary" : "text-current"
            )}
          />
          <div className={cn("ml-3 min-w-0 flex-1 text-left", compact && "hidden")}>
            <div
              className={cn(
                "truncate",
                isActive && "font-medium text-slate-800"
              )}
            >
              {item.label}
            </div>
            <div
              className={cn(
                "hidden truncate text-xs lg:block",
                isActive ? "text-slate-500" : "text-white/45"
              )}
            >
              {item.description}
            </div>
          </div>
          <Lucide
            icon="ChevronDown"
            className={cn(
              "ml-auto h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200",
              compact && "hidden",
              open && "rotate-180"
            )}
          />
        </button>
        {open && !compact && (
          <ul className="mt-1">
            {item.children!.map((child) => {
              const childIdx = animationIndex++;
              const childActive = matchesNavPath(pathname, child.href, child.match);
              return (
                <li key={child.href} className="mb-0.5">
                  {renderNavLink(child, childIdx, {
                    isActive: childActive,
                    activeTone: "soft",
                    isChild: true,
                  })}
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  }

  function renderGroups(groups: typeof navGroups) {
    return groups.map((group) => (
      <div key={group.label} className={`mb-5 ` + group.label}>
        <div
          className={cn(
            "mb-2 px-5 text-[11px] font-medium uppercase tracking-[0.28em] text-white/45",
            compact && "px-0 text-center"
          )}
        >
          {group.label}
        </div>
        <ul className="overflow-hidden rounded-lg">
          {group.items.map((item) => {
            if (item.children) {
              return <CollapsibleNavItem key={item.href} item={item} />;
            }

            const currentIndex = animationIndex++;
            const isActive = isItemActive(item);

            return (
            <li key={item.href} className="mb-1">
              {renderNavLink(item, currentIndex, { isActive })}
            </li>
            );
          })}
        </ul>
      </div>
    ));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn("px-5 pt-5", mobile && "px-4 pt-4")}>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white shadow-lg shadow-slate-950/10 ring-1 ring-white/15">
            <Image src={logoUrl} alt="EasyAccounts" className="h-6 w-6" />
          </div>
          <div className={cn("min-w-0", compact && "hidden")}>
            <div className="truncate text-base font-semibold text-white">
              EasyAccounts
            </div>
            <div className="truncate text-xs uppercase tracking-[0.24em] text-white/60">
              Ledger-first GST billing
            </div>
          </div>
        </Link>
      </div>

      <div className={cn("mx-5 my-5 h-px bg-white/10", mobile && "mx-4")} />

      <nav className="flex min-h-0 flex-1 flex-col">
        <div className={cn("min-h-0 flex-1 overflow-y-auto pr-5", mobile && "pr-0")}>
          {renderGroups(topNavGroups)}
        </div>

        {bottomNavGroups.length > 0 ? (
          <div className={cn("shrink-0 pr-5 pb-8", mobile && "pr-0")}>
            {topNavGroups.length > 0 ? (
              <div className={cn("mx-5 mb-5 h-px bg-white/10", mobile && "mx-4")} />
            ) : null}
            {renderGroups(bottomNavGroups)}
          </div>
        ) : null}
      </nav>
    </div>
  );
}

export function Sidebar({ variant = "side" }: { variant?: "side" | "simple" }) {
  const compact = variant === "simple";

  return (
    <aside
      className={cn(
        "hidden md:fixed md:inset-y-0 md:left-0 md:z-50 md:flex md:flex-col",
        compact ? "md:w-[92px]" : "md:w-[250px]"
      )}
      style={{ backgroundColor: "rgb(var(--rubick-primary))" }}
    >
      <SidebarNavigation compact={compact} />
    </aside>
  );
}

export function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] md:hidden">
      <button
        type="button"
        aria-label="Close navigation"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <aside
        className="absolute inset-y-0 left-0 flex w-[292px] flex-col shadow-2xl"
        style={{ backgroundColor: "rgb(var(--rubick-primary))" }}
      >
        <div className="flex justify-end p-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
            aria-label="Close menu"
          >
            <Lucide icon="X" className="h-4 w-4" />
          </button>
        </div>
        <SidebarNavigation mobile onNavigate={() => onOpenChange(false)} />
      </aside>
    </div>
  );
}
