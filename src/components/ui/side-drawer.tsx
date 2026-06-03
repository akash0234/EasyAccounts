"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SideDrawerProps {
  open: boolean;
  title?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  widthClassName?: string; // e.g. w-[520px]
  showOverlay?: boolean;
  closeOnOverlayClick?: boolean;
  trapFocus?: boolean;
  closeOnEsc?: boolean;
}

export function SideDrawer({
  open,
  title,
  onClose,
  children,
  widthClassName = "w-[720px] max-w-[100vw]",
  showOverlay = true,
  closeOnOverlayClick = true,
  trapFocus = true,
  closeOnEsc = true,
}: SideDrawerProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const prevActiveRef = useRef<HTMLElement | null>(null);
  const prevBodyOverflowRef = useRef<string>("");
  const titleId = useId();

  useEffect(() => {
    if (open) {
      setMounted(true);
      prevBodyOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      try {
        document.documentElement.classList.add("rubick-drawer-open");
      } catch {}
      prevActiveRef.current = (document.activeElement as HTMLElement) || null;
      const raf = requestAnimationFrame(() => setVisible(true));
      const focusTimer = window.setTimeout(() => {
        if (!drawerRef.current) return;
        const focusables = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1 && el.offsetParent !== null);
        if (focusables.length > 0) {
          focusables[0].focus();
        } else if (closeBtnRef.current) {
          closeBtnRef.current.focus();
        } else {
          drawerRef.current.focus();
        }
      }, 10);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(focusTimer);
        try {
          document.documentElement.classList.remove("rubick-drawer-open");
        } catch {}
      };
    } else if (mounted) {
      setVisible(false);
      const timer = window.setTimeout(() => {
        setMounted(false);
        document.body.style.overflow = prevBodyOverflowRef.current;
        try {
          document.documentElement.classList.remove("rubick-drawer-open");
        } catch {}
        if (prevActiveRef.current && typeof prevActiveRef.current.focus === "function") {
          try {
            prevActiveRef.current.focus({ preventScroll: true } as FocusOptions);
          } catch {}
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [open, mounted]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!mounted) return;
      if (closeOnEsc && e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (!trapFocus || e.key !== "Tab" || !drawerRef.current) return;
      const focusables = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1 && el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !drawerRef.current.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !drawerRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mounted, trapFocus, closeOnEsc, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {showOverlay && (
        <div
          className={`absolute inset-0 z-[100] bg-black/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
          onClick={closeOnOverlayClick ? onClose : undefined}
        />
      )}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`absolute right-0 top-0 h-full bg-[var(--card)] border-l border-[var(--border)] shadow-xl ${widthClassName} flex flex-col transform transition-transform duration-300 will-change-transform ${visible ? "translate-x-0  z-[110]" : "translate-x-full"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div id={titleId} className="text-lg font-semibold truncate">{title}</div>
          <Button ref={closeBtnRef} variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}
