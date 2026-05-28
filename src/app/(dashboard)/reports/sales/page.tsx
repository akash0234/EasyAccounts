"use client";

import { FormEvent, useEffect, useState } from "react";
import { Download, Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ReportShell,
  SummaryStrip,
  formatINR,
  formatDate,
  toCSV,
} from "@/components/reports/report-shell";
import { SearchSelect } from "@/components/ui/search-select";

interface ReportRow {
  id: string;
  date: string;
  invoiceNumber: string;
  status: "UNPAID" | "PARTIAL" | "PAID";
  customer: { id: string; name: string; gstin: string | null } | null;
  facility: { id: string; name: string } | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstanding: number;
  itemCount: number;
}

interface Summary {
  count: number;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paid: number;
  outstanding: number;
}

type AggregationRow = Record<string, string | number | null | undefined>;
interface Aggregation {
  groupBy: string;
  rows: AggregationRow[];
}

const today = () => new Date().toISOString().split("T")[0];
const firstOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
};

export default function SalesReportPage() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());

  const [customerId, setCustomerId] = useState("");
  const [customerDisplay, setCustomerDisplay] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [facilityDisplay, setFacilityDisplay] = useState("");
  const [productId, setProductId] = useState("");
  const [productDisplay, setProductDisplay] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryDisplay, setCategoryDisplay] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [subcategoryDisplay, setSubcategoryDisplay] = useState("");

  const [status, setStatus] = useState("");
  const [hsn, setHsn] = useState("");
  const [gstPercent, setGstPercent] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [groupBy, setGroupBy] = useState("");

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [aggregation, setAggregation] = useState<Aggregation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildQuery() {
    const params = new URLSearchParams();
    const add = (k: string, v: string) => v && params.set(k, v);
    add("from", from);
    add("to", to);
    add("customerId", customerId);
    add("facilityId", facilityId);
    add("status", status);
    add("productId", productId);
    add("categoryId", categoryId);
    add("subcategoryId", subcategoryId);
    add("hsn", hsn);
    add("gstPercent", gstPercent);
    add("batchNo", batchNo);
    add("minAmount", minAmount);
    add("maxAmount", maxAmount);
    add("groupBy", groupBy);
    return params.toString();
  }

  async function runReport(e?: FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/sales?${buildQuery()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setRows(data.rows ?? []);
      setSummary(data.summary ?? null);
      setAggregation(data.aggregation ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setFrom(firstOfMonth());
    setTo(today());
    setCustomerId(""); setCustomerDisplay("");
    setFacilityId(""); setFacilityDisplay("");
    setProductId(""); setProductDisplay("");
    setCategoryId(""); setCategoryDisplay("");
    setSubcategoryId(""); setSubcategoryDisplay("");
    setStatus("");
    setHsn("");
    setGstPercent("");
    setBatchNo("");
    setMinAmount("");
    setMaxAmount("");
    setGroupBy("");
  }

  function exportCsv() {
    toCSV(
      `sales-report-${from || "all"}-${to || "all"}.csv`,
      [
        "Date",
        "Invoice #",
        "Customer",
        "GSTIN",
        "Facility",
        "Status",
        "Subtotal",
        "Tax",
        "Discount",
        "Total",
        "Paid",
        "Outstanding",
      ],
      rows.map((r) => [
        formatDate(r.date),
        r.invoiceNumber,
        r.customer?.name ?? "",
        r.customer?.gstin ?? "",
        r.facility?.name ?? "",
        r.status,
        r.subtotal,
        r.taxAmount,
        r.discountAmount,
        r.totalAmount,
        r.paidAmount,
        r.outstanding,
      ])
    );
  }

  return (
    <ReportShell
      title="Sales Report"
      description="Sales invoices with party, product, GST, HSN, and date filters."
    >
      <form onSubmit={runReport}>
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              <Field label="From">
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </Field>
              <Field label="To">
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </Field>
              <Field label="Customer">
                <SearchSelect
                  value={customerId}
                  displayValue={customerDisplay}
                  endpoint="/api/customers"
                  placeholder="All customers"
                  mapResult={(r: { id: string; name: string; gstin: string | null }) => ({
                    id: r.id,
                    label: r.name,
                    hint: r.gstin ?? undefined,
                  })}
                  onChange={(opt) => {
                    setCustomerId(opt?.id ?? "");
                    setCustomerDisplay(opt?.label ?? "");
                  }}
                />
              </Field>
              <Field label="Facility">
                <SearchSelect
                  value={facilityId}
                  displayValue={facilityDisplay}
                  endpoint="/api/facilities"
                  placeholder="All facilities"
                  mapResult={(r: { id: string; name: string }) => ({ id: r.id, label: r.name })}
                  onChange={(opt) => {
                    setFacilityId(opt?.id ?? "");
                    setFacilityDisplay(opt?.label ?? "");
                  }}
                />
              </Field>
              <Field label="Status">
                <Select value={status} onChange={setStatus}>
                  <option value="">All</option>
                  <option value="UNPAID">Unpaid</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="PAID">Paid</option>
                </Select>
              </Field>
              <Field label="Category">
                <SearchSelect
                  value={categoryId}
                  displayValue={categoryDisplay}
                  endpoint="/api/products/categories"
                  placeholder="All categories"
                  mapResult={(r: { id: string; name: string }) => ({ id: r.id, label: r.name })}
                  onChange={(opt) => {
                    setCategoryId(opt?.id ?? "");
                    setCategoryDisplay(opt?.label ?? "");
                    setSubcategoryId("");
                    setSubcategoryDisplay("");
                  }}
                />
              </Field>
              <Field label="Subcategory">
                <SearchSelect
                  value={subcategoryId}
                  displayValue={subcategoryDisplay}
                  endpoint="/api/products/subcategories"
                  placeholder="All subcategories"
                  mapResult={(r: { id: string; name: string; categoryName: string }) => ({
                    id: r.id,
                    label: r.name,
                    hint: r.categoryName,
                  })}
                  onChange={(opt) => {
                    setSubcategoryId(opt?.id ?? "");
                    setSubcategoryDisplay(opt?.label ?? "");
                  }}
                />
              </Field>
              <Field label="Product">
                <SearchSelect
                  value={productId}
                  displayValue={productDisplay}
                  endpoint="/api/products"
                  placeholder="All products"
                  mapResult={(r: { id: string; name: string; hsn: string | null }) => ({
                    id: r.id,
                    label: r.name,
                    hint: r.hsn ?? undefined,
                  })}
                  onChange={(opt) => {
                    setProductId(opt?.id ?? "");
                    setProductDisplay(opt?.label ?? "");
                  }}
                />
              </Field>
              <Field label="HSN">
                <Input value={hsn} onChange={(e) => setHsn(e.target.value)} placeholder="e.g. 3004" />
              </Field>
              <Field label="GST %">
                <Input type="number" step="0.01" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} placeholder="e.g. 18" />
              </Field>
              <Field label="Batch #">
                <Input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="Batch number" />
              </Field>
              <Field label="Min amount">
                <Input type="number" step="0.01" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
              </Field>
              <Field label="Max amount">
                <Input type="number" step="0.01" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
              </Field>
              <Field label="Group by">
                <Select value={groupBy} onChange={setGroupBy}>
                  <option value="">None (detail rows)</option>
                  <option value="customer">Customer</option>
                  <option value="product">Product</option>
                  <option value="month">Month</option>
                </Select>
              </Field>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={loading}>
                <Filter className="mr-2 h-4 w-4" />
                {loading ? "Loading…" : "Apply filters"}
              </Button>
              <Button type="button" variant="outline" onClick={resetFilters}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button type="button" variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              {error && <span className="text-sm text-rose-600">{error}</span>}
            </div>
          </CardContent>
        </Card>
      </form>

      {summary && (
        <SummaryStrip
          items={[
            { label: "Invoices", value: String(summary.count) },
            { label: "Subtotal", value: formatINR(summary.subtotal) },
            { label: "Tax", value: formatINR(summary.tax) },
            { label: "Discount", value: formatINR(summary.discount) },
            { label: "Total", value: formatINR(summary.total), tone: "positive" },
            { label: "Outstanding", value: formatINR(summary.outstanding), tone: summary.outstanding > 0 ? "warn" : "default" },
          ]}
        />
      )}

      {aggregation ? (
        <AggregationTable aggregation={aggregation} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table className="min-w-[70rem] table-fixed">
              <colgroup>
                <col className="w-[7rem]" />
                <col className="w-[8rem]" />
                <col />
                <col className="w-[8rem]" />
                <col className="w-[6rem]" />
                <col className="w-[7rem]" />
                <col className="w-[6rem]" />
                <col className="w-[7rem]" />
                <col className="w-[6rem]" />
                <col className="w-[7rem]" />
              </colgroup>
              <TableHead>
                <TableRow>
                  <TableHeader className="rounded-l-md bg-rubick-primary text-white">Date</TableHeader>
                  <TableHeader className="bg-rubick-primary text-white">Invoice #</TableHeader>
                  <TableHeader className="bg-rubick-primary text-white">Customer</TableHeader>
                  <TableHeader className="bg-rubick-primary text-white">Facility</TableHeader>
                  <TableHeader className="bg-rubick-primary text-white">Status</TableHeader>
                  <TableHeader className="bg-rubick-primary text-right text-white">Subtotal</TableHeader>
                  <TableHeader className="bg-rubick-primary text-right text-white">Tax</TableHeader>
                  <TableHeader className="bg-rubick-primary text-right text-white">Total</TableHeader>
                  <TableHeader className="bg-rubick-primary text-right text-white">Paid</TableHeader>
                  <TableHeader className="rounded-r-md bg-rubick-primary text-right text-white">Outstanding</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-sm text-slate-500">
                      {loading ? "Loading…" : "No invoices match the current filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap align-middle">{formatDate(r.date)}</TableCell>
                      <TableCell className="align-middle font-medium">{r.invoiceNumber}</TableCell>
                      <TableCell className="align-middle">
                        <div>{r.customer?.name ?? "—"}</div>
                        {r.customer?.gstin && (
                          <div className="text-xs text-slate-500">{r.customer.gstin}</div>
                        )}
                      </TableCell>
                      <TableCell className="align-middle">{r.facility?.name ?? "—"}</TableCell>
                      <TableCell className="align-middle">
                        <Badge
                          variant={
                            r.status === "PAID"
                              ? "paid"
                              : r.status === "PARTIAL"
                              ? "partial"
                              : "unpaid"
                          }
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap align-middle text-right">{formatINR(r.subtotal)}</TableCell>
                      <TableCell className="whitespace-nowrap align-middle text-right">{formatINR(r.taxAmount)}</TableCell>
                      <TableCell className="whitespace-nowrap align-middle text-right font-semibold">{formatINR(r.totalAmount)}</TableCell>
                      <TableCell className="whitespace-nowrap align-middle text-right">{formatINR(r.paidAmount)}</TableCell>
                      <TableCell className="whitespace-nowrap align-middle text-right">{formatINR(r.outstanding)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </ReportShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-xs uppercase tracking-[0.14em] text-slate-500">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:border-rubick-primary focus:outline-none focus:ring-2 focus:ring-rubick-primary/30 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
    >
      {children}
    </select>
  );
}

function AggregationTable({ aggregation }: { aggregation: Aggregation }) {
  const { groupBy, rows } = aggregation;
  if (!rows?.length) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-slate-500">
          No data to group.
        </CardContent>
      </Card>
    );
  }

  const columns =
    groupBy === "customer"
      ? [
          { key: "name", label: "Customer" },
          { key: "count", label: "Invoices", align: "right" as const },
          { key: "total", label: "Total", align: "right" as const, format: formatINR },
          { key: "paid", label: "Paid", align: "right" as const, format: formatINR },
        ]
      : groupBy === "month"
      ? [
          { key: "month", label: "Month" },
          { key: "count", label: "Invoices", align: "right" as const },
          { key: "total", label: "Total", align: "right" as const, format: formatINR },
          { key: "tax", label: "Tax", align: "right" as const, format: formatINR },
        ]
      : [
          { key: "name", label: "Product" },
          { key: "hsn", label: "HSN" },
          { key: "qty", label: "Qty", align: "right" as const },
          { key: "amount", label: "Amount", align: "right" as const, format: formatINR },
          { key: "tax", label: "Tax", align: "right" as const, format: formatINR },
        ];

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((c, i) => (
                <TableHeader
                  key={c.key}
                  className={`bg-rubick-primary text-white ${c.align === "right" ? "text-right" : ""} ${i === 0 ? "rounded-l-md" : ""} ${i === columns.length - 1 ? "rounded-r-md" : ""}`}
                >
                  {c.label}
                </TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                {columns.map((c) => {
                  const v = r[c.key];
                  const display = c.format
                    ? c.format(Number(v) || 0)
                    : v === null || v === undefined
                    ? "—"
                    : String(v);
                  return (
                    <TableCell key={c.key} className={c.align === "right" ? "align-middle text-right" : "align-middle"}>
                      {display}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
