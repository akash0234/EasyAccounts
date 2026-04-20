"use client";

import { useSyncExternalStore } from "react";

type Listener = () => void;

export type ColorScheme = "default" | "theme-1" | "theme-2" | "theme-3" | "theme-4";

export const colorSchemes: ColorScheme[] = [
  "default",
  "theme-1",
  "theme-2",
  "theme-3",
  "theme-4",
];

const STORAGE_KEY = "easyaccounts:colorScheme";
const listeners = new Set<Listener>();
let colorSchemeState: ColorScheme = "default";

function isColorScheme(value: string | null): value is ColorScheme {
  return value !== null && colorSchemes.includes(value as ColorScheme);
}

function readColorScheme() {
  if (typeof window === "undefined") {
    return colorSchemeState;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  colorSchemeState = isColorScheme(stored) ? stored : "default";
  return colorSchemeState;
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function subscribeColorScheme(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getColorSchemeSnapshot() {
  return readColorScheme();
}

export function setColorScheme(next: ColorScheme) {
  colorSchemeState = next;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  emitChange();
}

export function useColorSchemeStore() {
  return useSyncExternalStore(
    subscribeColorScheme,
    getColorSchemeSnapshot,
    () => colorSchemeState
  );
}

export function getThemeAttribute(colorScheme: ColorScheme) {
  switch (colorScheme) {
    case "theme-1":
      return "1";
    case "theme-2":
      return "2";
    case "theme-3":
      return "3";
    case "theme-4":
      return "4";
    default:
      return "0";
  }
}
