"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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

interface Customer { id: string; name: string }
interface Facility { id: string; name: string }
interface Product { id: string; name: string; hsn?: string | null; categoryId?: string | null; subcategoryId?: string | null }
interface Category { id: string; name: string }
interface Subcategory { id: string; name: string; categoryId: string }

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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  // Filters
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [customerId, setCustomerId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [status, setStatus] = useState("");
  const [productId, setProductId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
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
    let cancelled = false;
    async function loadMasters() {
      const [cRes, fRes, pRes, catRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/facilities"),
        fetch("/api/products"),
        fetch("/api/products/categories"),
      ]);
      const [cData, fData, pData, catData] = await Promise.all([
        cRes.json(),
        fRes.json(),
        pRes.json(),
        catRes.json(),
      ]);
      if (cancelled) return;
      if (Array.isArray(cData)) setCustomers(cData);
      if (Array.isArray(fData)) setFacilities(fData);
      if (Array.isArray(pData)) setProducts(pData);
      if (Array.isArray(catData)) {
        setCategories(catData);
        // if API returns category rows with nested subcategories, flatten:
        const subs: Subcategory[] = [];
        for (const c of catData) {
          if (Array.isArray(c.subcategories)) {
            for (const s of c.subcategories) {
              subs.push({ id: s.id, name: s.name, categoryId: c.id });
            }
          }
        }
        setSubcategories(subs);
      }
    }
    loadMasters();
    runReport();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSubcategories = useMemo(
    () => (categoryId ? subcategories.filter((s) => s.categoryId === categoryId) : subcategories),
    [categoryId, subcategories]
  );

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
    setCustomerId("");
    setFacilityId("");
    setStatus("");
    setProductId("");
    setCategoryId("");
    setSubcategoryId("");
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
                <Select value={customerId} onChange={setCustomerId}>
                  <option value="">All customers</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Facility">
                <Select value={facilityId} onChange={setFacilityId}>
                  <option value="">All facilities</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </Select>
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
                <Select value={categoryId} onChange={(v) => { setCategoryId(v); setSubcategoryId(""); }}>
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Subcategory">
                <Select value={subcategoryId} onChange={setSubcategoryId}>
                  <option value="">All subcategories</option>
                  {filteredSubcategories.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Product">
                <Select value={productId} onChange={setProductId}>
                  <option value="">All products</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
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
                      <TableCell>{formatDate(r.date)}</TableCell>
                      <TableCell className="font-medium">{r.invoiceNumber}</TableCell>
                      <TableCell>
                        <div>{r.customer?.name ?? "—"}</div>
                        {r.customer?.gstin && (
                          <div className="text-xs text-slate-500">{r.customer.gstin}</div>
                        )}
                      </TableCell>
                      <TableCell>{r.facility?.name ?? "—"}</TableCell>
                      <TableCell>
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
                      <TableCell className="text-right">{formatINR(r.subtotal)}</TableCell>
                      <TableCell className="text-right">{formatINR(r.taxAmount)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatINR(r.totalAmount)}</TableCell>
                      <TableCell className="text-right">{formatINR(r.paidAmount)}</TableCell>
                      <TableCell className="text-right">{formatINR(r.outstanding)}</TableCell>
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
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key} className={c.align === "right" ? "text-right" : undefined}>
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
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
                    <TableCell key={c.key} className={c.align === "right" ? "text-right" : undefined}>
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
