import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Table — Rubick's floating-row table style (.table-report).
 * Rows appear as elevated white cards with soft shadows.
 * Wrap in an overflow-x-auto container for responsive scrolling.
 */
function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("table-report", className)} {...props} />
    </div>
  );
}

function TableHead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("", className)} {...props} />;
}

function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("", className)} {...props} />;
}

function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("", className)} {...props} />;
}

function TableHeader({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("", className)} {...props} />;
}

function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("", className)} {...props} />;
}

export { Table, TableHead, TableBody, TableRow, TableHeader, TableCell };
