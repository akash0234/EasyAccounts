"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Lucide from "@/base-components/lucide";
import {
  ColorScheme,
  colorSchemes,
  setColorScheme,
  useColorSchemeStore,
} from "@/stores/color-scheme";
import {
  LayoutMode,
  setLayoutMode,
  useLayoutModeStore,
} from "@/stores/layout-mode";
import { toggleDarkMode, useDarkModeStore } from "@/stores/dark-mode";

const layoutOptions: { value: LayoutMode; label: string }[] = [
  { value: "side-menu", label: "Side" },
  { value: "simple-menu", label: "Simple" },
  { value: "top-menu", label: "Top" },
];

const schemeClasses: Record<ColorScheme, string> = {
  default: "bg-blue-800",
  "theme-1": "bg-emerald-900",
  "theme-2": "bg-indigo-950",
  "theme-3": "bg-cyan-900",
  "theme-4": "bg-indigo-700",
};

export function AppearanceSwitcher() {
  const [open, setOpen] = useState(false);
  const darkMode = useDarkModeStore();
  const colorScheme = useColorSchemeStore();
  const layoutMode = useLayoutModeStore();

  return (
    <div className="fixed bottom-5 right-5 z-[70] hidden xl:block">
      <div className="relative">
        {open && (
          <div className="absolute bottom-18 right-0 flex w-[320px] flex-col gap-3">
            <div className="box rounded-3xl border border-white/40 bg-white/90 p-4 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/85">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Layout Setup
                  </div>
                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Choose the Source-style navigation mode.
                  </div>
                </div>
                
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {layoutOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLayoutMode(option.value)}
                    className={cn(
                      "rounded-full px-3 py-2 text-sm transition-colors",
                      layoutMode === option.value
                        ? "bg-rubick-primary text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
                <div>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Dark mode
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Match the Source switcher behavior
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className={cn(
                    "relative h-8 w-14 rounded-full transition-colors",
                    darkMode ? "bg-rubick-primary" : "bg-slate-300"
                  )}
                  aria-pressed={darkMode}
                >
                  <span
                    className={cn(
                      "absolute top-1 h-6 w-6 rounded-full bg-white transition-transform",
                      darkMode ? "translate-x-[-1px]" : "translate-x-[-24px]"
                    )}
                  />
                </button>
              </div>

              <div className="mt-4">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Color Scheme
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {colorSchemes.map((scheme) => (
                    <button
                      key={scheme}
                      type="button"
                      onClick={() => setColorScheme(scheme)}
                      className={cn(
                        "h-9 w-9 rounded-full border-4 transition-colors",
                        schemeClasses[scheme],
                        colorScheme === scheme
                          ? "border-slate-300 dark:border-slate-700"
                          : "border-white dark:border-slate-900"
                      )}
                      aria-label={`Use ${scheme} color scheme`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-xl shadow-slate-900/10 transition-transform hover:-translate-y-0.5 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
          aria-expanded={open}
          aria-label="Open layout setup"
        >
          <Lucide icon="Settings2" className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
