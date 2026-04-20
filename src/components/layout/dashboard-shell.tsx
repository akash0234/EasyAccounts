"use client";

import SideMenuLayout from "@/layouts/side-menu/NextMain";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AppearanceSwitcher } from "@/components/layout/appearance-switcher";
import { TopMenuNav } from "@/components/layout/top-menu-nav";
import { useLayoutModeStore } from "@/stores/layout-mode";

function SimpleMenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rubick-shell">
      <Sidebar variant="simple" />
      <div className="relative z-10 md:ml-[92px] md:pr-6 md:py-4">
        <div className="rubick-content">
          <Header />
          <main className="rubick-page">{children}</main>
        </div>
      </div>
    </div>
  );
}

function TopMenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rubick-shell">
      <div className="relative z-10 md:px-6 md:py-4">
        <div className="rubick-content">
          <Header />
          <main className="rubick-page">
            <TopMenuNav />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const layoutMode = useLayoutModeStore();

  return (
    <>
      {layoutMode === "simple-menu" ? (
        <SimpleMenuLayout>{children}</SimpleMenuLayout>
      ) : layoutMode === "top-menu" ? (
        <TopMenuLayout>{children}</TopMenuLayout>
      ) : (
        <SideMenuLayout>{children}</SideMenuLayout>
      )}
      <AppearanceSwitcher />
    </>
  );
}
