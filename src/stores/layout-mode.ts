"use client";

import { useSyncExternalStore } from "react";

type Listener = () => void;

export type LayoutMode = "side-menu" | "simple-menu" | "top-menu";

export const layoutModes: LayoutMode[] = [
  "side-menu",
  "simple-menu",
  "top-menu",
];

const STORAGE_KEY = "easyaccounts:layoutMode";
const listeners = new Set<Listener>();
let layoutModeState: LayoutMode = "side-menu";

function isLayoutMode(value: string | null): value is LayoutMode {
  return value !== null && layoutModes.includes(value as LayoutMode);
}

function readLayoutMode() {
  if (typeof window === "undefined") {
    return layoutModeState;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  layoutModeState = isLayoutMode(stored) ? stored : "side-menu";
  return layoutModeState;
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function subscribeLayoutMode(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLayoutModeSnapshot() {
  return readLayoutMode();
}

export function setLayoutMode(next: LayoutMode) {
  layoutModeState = next;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  emitChange();
}

export function useLayoutModeStore() {
  return useSyncExternalStore(
    subscribeLayoutMode,
    getLayoutModeSnapshot,
    () => layoutModeState
  );
}
