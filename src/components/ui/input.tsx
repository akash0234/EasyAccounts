import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Rubick form-control style
          "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm",
          "placeholder:text-slate-400/90 text-slate-800",
          "transition duration-200 ease-in-out",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:border-rubick-primary/40",
          "focus-visible:ring-rubick-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
