import * as React from "react";
import { cn } from "@/lib/utils";

interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Inner padding utility class. Defaults to "p-5". Pass "" to disable. */
  padding?: string;
}

/**
 * Box — Rubick's panel / card pattern.
 * Soft shadow, white background, borderless.
 * Use this as a drop-in for Card when you want the full Rubick box look.
 */
function Box({ className, padding = "p-5", children, ...props }: BoxProps) {
  return (
    <div className={cn("box", padding, className)} {...props}>
      {children}
    </div>
  );
}

export { Box };
