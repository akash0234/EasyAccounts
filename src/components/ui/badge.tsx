import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:   "bg-rubick-primary/10 text-rubick-primary",
        success:   "bg-rubick-success/15 text-green-700",
        warning:   "bg-rubick-warning/25 text-yellow-700",
        danger:    "bg-rubick-danger/10 text-rubick-danger",
        info:      "bg-rubick-info/15 text-cyan-700",
        pending:   "bg-rubick-pending/15 text-orange-700",
        secondary: "bg-slate-100 text-slate-600",
        /* Invoice / payment status aliases */
        paid:      "bg-green-50 text-green-700",
        partial:   "bg-yellow-50 text-yellow-700",
        unpaid:    "bg-red-50 text-red-600",
        draft:     "bg-slate-100 text-slate-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
