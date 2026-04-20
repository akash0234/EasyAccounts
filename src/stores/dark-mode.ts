"use client";

import { useSyncExternalStore } from "react";

type Listener = () => void;

const STORAGE_KEY = "easyaccounts:darkMode";
const listeners = new Set<Listener>();
let darkModeState = false;

function readDarkMode() {
  if (typeof window === "undefined") {
    return darkModeState;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  darkModeState = stored === "true";
  return darkModeState;
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function subscribeDarkMode(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDarkModeSnapshot() {
  return readDarkMode();
}

export function setDarkMode(
  next: boolean | ((previous: boolean) => boolean)
) {
  const previous = readDarkMode();
  darkModeState = typeof next === "function" ? next(previous) : next;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, String(darkModeState));
  }

  emitChange();
}

export function toggleDarkMode() {
  setDarkMode((previous) => !previous);
}

export function useDarkModeStore() {
  return useSyncExternalStore(
    subscribeDarkMode,
    getDarkModeSnapshot,
    () => darkModeState
  );
}
