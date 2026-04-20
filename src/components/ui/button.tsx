import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rubick-primary/20 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        /* ── Core ─────────────────────────────────── */
        default:
          "bg-rubick-primary text-white shadow-sm hover:bg-rubick-primary/90",
        secondary:
          "bg-rubick-secondary text-slate-800 shadow-sm hover:bg-rubick-secondary/80",
        destructive:
          "bg-rubick-danger text-white shadow-sm hover:bg-rubick-danger/90",

        /* ── Semantic fills ───────────────────────── */
        success:
          "bg-rubick-success text-slate-900 shadow-sm hover:bg-rubick-success/90",
        warning:
          "bg-rubick-warning text-slate-900 shadow-sm hover:bg-rubick-warning/90",
        danger:
          "bg-rubick-danger text-white shadow-sm hover:bg-rubick-danger/90",
        info:
          "bg-rubick-info text-white shadow-sm hover:bg-rubick-info/90",
        pending:
          "bg-rubick-pending text-white shadow-sm hover:bg-rubick-pending/90",

        /* ── Outline variants ─────────────────────── */
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        "outline-primary":
          "border border-rubick-primary text-rubick-primary bg-transparent hover:bg-rubick-primary/10",
        "outline-success":
          "border border-rubick-success text-rubick-success bg-transparent hover:bg-rubick-success/10",
        "outline-danger":
          "border border-rubick-danger text-rubick-danger bg-transparent hover:bg-rubick-danger/10",
        "outline-warning":
          "border border-rubick-warning text-rubick-warning bg-transparent hover:bg-rubick-warning/10",

        /* ── Soft / light fill ───────────────────── */
        "soft-primary":
          "bg-rubick-primary/10 text-rubick-primary border border-rubick-primary/10 hover:bg-rubick-primary/20",
        "soft-success":
          "bg-rubick-success/10 text-green-700 border border-rubick-success/10 hover:bg-rubick-success/20",
        "soft-danger":
          "bg-rubick-danger/10 text-rubick-danger border border-rubick-danger/10 hover:bg-rubick-danger/20",

        /* ── Ghost / link ─────────────────────────── */
        ghost: "hover:bg-slate-100 hover:text-slate-900",
        link: "text-rubick-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
