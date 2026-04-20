"use client";

import { SessionProvider } from "next-auth/react";
import { UiPreferencesProvider } from "@/components/layout/ui-preferences-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <UiPreferencesProvider>{children}</UiPreferencesProvider>
    </SessionProvider>
  );
}
