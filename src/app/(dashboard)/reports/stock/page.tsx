"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, Filter, RotateCcw, Settings2 } from "lucide-react";
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
  formatDate,
  toCSV,
} from "@/components/reports/report-shell";

interface Facility { id: string; name: string }
interface Product { id: string; name: string; hsn?: string | null; unit?: string }
interface Category { id: string; name: string; subcategories?: { id: string; name: string }[] }
interface Subcategory { id: string; name: string; categoryId: string }

interface StockRow {
  id: string;
  createdAt: string;
  type: "IN" | "OUT" | "ADJUST";
  quantity: number;
  batchNo: string | null;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  product: { id: string; name: string; hsn: string | null; unit: string } | null;
  facility: { id: string; name: string } | null;
}

interface Summary {
  count: number;
  inQty: number;
  outQty: number;
  adjustQty: number;
  netQty: number;
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

const fmtQty = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n || 0);

export default function StockReportPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [productId, setProductId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [type, setType] = useState("");
  const [referenceType, setReferenceType] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [hsn, setHsn] = useState("");
  const [groupBy, setGroupBy] = useState("");

  const [rows, setRows] = useState<StockRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [aggregation, setAggregation] = useState<Aggregation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadMasters() {
      const [fRes, pRes, catRes] = await Promise.all([
        fetch("/api/facilities"),
        fetch("/api/products"),
        fetch("/api/products/categories"),
      ]);
      const [fData, pData, catData] = await Promise.all([
        fRes.json(),
        pRes.json(),
        catRes.json(),
      ]);
      if (cancelled) return;
      if (Array.isArray(fData)) setFacilities(fData);
      if (Array.isArray(pData)) setProducts(pData);
      if (Array.isArray(catData)) {
        setCategories(catData);
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
    add("productId", productId);
    add("categoryId", categoryId);
    add("subcategoryId", subcategoryId);
    add("facilityId", facilityId);
    add("type", type);
    add("referenceType", referenceType);
    add("batchNo", batchNo);
    add("hsn", hsn);
    add("groupBy", groupBy);
    return params.toString();
  }

  async function runReport(e?: FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/stock?${buildQuery()}`);
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
    setProductId("");
    setCategoryId("");
    setSubcategoryId("");
    setFacilityId("");
    setType("");
    setReferenceType("");
    setBatchNo("");
    setHsn("");
    setGroupBy("");
  }

  function exportCsv() {
    toCSV(
      `stock-report-${from || "all"}-${to || "all"}.csv`,
      [
        "Date",
        "Type",
        "Product",
        "HSN",
        "Unit",
        "Facility",
        "Quantity",
        "Batch #",
        "Reference",
        "Notes",
      ],
      rows.map((r) => [
        formatDate(r.createdAt),
        r.type,
        r.product?.name ?? "",
        r.product?.hsn ?? "",
        r.product?.unit ?? "",
        r.facility?.name ?? "",
        r.quantity,
        r.batchNo ?? "",
        r.referenceType ?? "",
        r.notes ?? "",
      ])
    );
  }

  return (
    <ReportShell
      title="Stock Transactions Report"
      description="Inward, outward, and adjustment movements with product, batch, and facility filters."
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
              <Field label="Type">
                <Select value={type} onChange={setType}>
                  <option value="">All</option>
                  <option value="IN">Inward (IN)</option>
                  <option value="OUT">Outward (OUT)</option>
                  <option value="ADJUST">Adjustment</option>
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
                <Input value={hsn} onChange={(e) => setHsn(e.target.value)} placeholder="e.g. 8528" />
              </Field>
              <Field label="Batch #">
                <Input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="Batch number" />
              </Field>
              <Field label="Reference">
                <Select value={referenceType} onChange={setReferenceType}>
                  <option value="">All references</option>
                  <option value="INVOICE">Invoice</option>
                  <option value="ADJUSTMENT">Adjustment</option>
                </Select>
              </Field>
              <Field label="Group by">
                <Select value={groupBy} onChange={setGroupBy}>
                  <option value="">None (detail rows)</option>
                  <option value="product">Product</option>
                  <option value="facility">Facility</option>
                  <option value="type">Movement type</option>
                  <option value="day">Day</option>
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
            { label: "Movements", value: String(summary.count) },
            { label: "Inward", value: fmtQty(summary.inQty), tone: "positive" },
            { label: "Outward", value: fmtQty(summary.outQty), tone: "negative" },
            { label: "Adjustments", value: fmtQty(summary.adjustQty), tone: "warn" },
            {
              label: "Net",
              value: fmtQty(summary.netQty),
              tone: summary.netQty >= 0 ? "positive" : "negative",
            },
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
                  <TableHead>Type</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-slate-500">
                      {loading ? "Loading…" : "No stock movements match the current filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{formatDate(r.createdAt)}</TableCell>
                      <TableCell>
                        <TypeBadge type={r.type} />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{r.product?.name ?? "—"}</div>
                        {r.product?.hsn && (
                          <div className="text-xs text-slate-500">HSN {r.product.hsn}</div>
                        )}
                      </TableCell>
                      <TableCell>{r.facility?.name ?? "—"}</TableCell>
                      <TableCell>{r.batchNo ?? "—"}</TableCell>
                      <TableCell>{r.referenceType ?? "—"}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {fmtQty(r.quantity)} {r.product?.unit ?? ""}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs text-slate-500">
                        {r.notes ?? "—"}
                      </TableCell>
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

function TypeBadge({ type }: { type: "IN" | "OUT" | "ADJUST" }) {
  if (type === "IN") {
    return (
      <Badge variant="default" className="gap-1 bg-emerald-100 text-emerald-700">
        <ArrowDown className="h-3 w-3" /> IN
      </Badge>
    );
  }
  if (type === "OUT") {
    return (
      <Badge variant="danger" className="gap-1">
        <ArrowUp className="h-3 w-3" /> OUT
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Settings2 className="h-3 w-3" /> ADJ
    </Badge>
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
    groupBy === "product"
      ? [
          { key: "name", label: "Product" },
          { key: "hsn", label: "HSN" },
          { key: "inQty", label: "In", align: "right" as const, format: fmtQty },
          { key: "outQty", label: "Out", align: "right" as const, format: fmtQty },
          { key: "adjustQty", label: "Adj", align: "right" as const, format: fmtQty },
          { key: "net", label: "Net", align: "right" as const, format: fmtQty },
        ]
      : groupBy === "facility"
      ? [
          { key: "name", label: "Facility" },
          { key: "inQty", label: "In", align: "right" as const, format: fmtQty },
          { key: "outQty", label: "Out", align: "right" as const, format: fmtQty },
          { key: "adjustQty", label: "Adj", align: "right" as const, format: fmtQty },
          { key: "net", label: "Net", align: "right" as const, format: fmtQty },
        ]
      : groupBy === "day"
      ? [
          { key: "day", label: "Day" },
          { key: "inQty", label: "In", align: "right" as const, format: fmtQty },
          { key: "outQty", label: "Out", align: "right" as const, format: fmtQty },
          { key: "adjustQty", label: "Adj", align: "right" as const, format: fmtQty },
        ]
      : [
          { key: "type", label: "Type" },
          { key: "qty", label: "Qty", align: "right" as const, format: fmtQty },
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
