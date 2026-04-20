"use client";

import { useEffect } from "react";
import {
  getThemeAttribute,
  useColorSchemeStore,
} from "@/stores/color-scheme";
import { useDarkModeStore } from "@/stores/dark-mode";
import { useLayoutModeStore } from "@/stores/layout-mode";

export function UiPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const darkMode = useDarkModeStore();
  const colorScheme = useColorSchemeStore();
  const layoutMode = useLayoutModeStore();

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("dark", darkMode);
    html.dataset.colorScheme = colorScheme;
    html.dataset.theme = getThemeAttribute(colorScheme);
    html.dataset.layoutMode = layoutMode;
  }, [colorScheme, darkMode, layoutMode]);

  return <>{children}</>;
}
