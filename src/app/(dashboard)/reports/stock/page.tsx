"use client";

import { FormEvent, useEffect, useState } from "react";
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
import { SearchSelect } from "@/components/ui/search-select";

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
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());

  const [productId, setProductId] = useState("");
  const [productDisplay, setProductDisplay] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryDisplay, setCategoryDisplay] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [subcategoryDisplay, setSubcategoryDisplay] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [facilityDisplay, setFacilityDisplay] = useState("");

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
    runReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setProductId(""); setProductDisplay("");
    setCategoryId(""); setCategoryDisplay("");
    setSubcategoryId(""); setSubcategoryDisplay("");
    setFacilityId(""); setFacilityDisplay("");
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
            <Table className="min-w-[64rem] table-fixed">
              <colgroup>
                <col className="w-[7rem]" />
                <col className="w-[6rem]" />
                <col />
                <col className="w-[8rem]" />
                <col className="w-[6rem]" />
                <col className="w-[7rem]" />
                <col className="w-[7rem]" />
                <col className="w-[14rem]" />
              </colgroup>
              <TableHead>
                <TableRow>
                  <TableHeader className="rounded-l-md bg-rubick-primary text-white">Date</TableHeader>
                  <TableHeader className="bg-rubick-primary text-white">Type</TableHeader>
                  <TableHeader className="bg-rubick-primary text-white">Product</TableHeader>
                  <TableHeader className="bg-rubick-primary text-white">Facility</TableHeader>
                  <TableHeader className="bg-rubick-primary text-white">Batch</TableHeader>
                  <TableHeader className="bg-rubick-primary text-white">Reference</TableHeader>
                  <TableHeader className="bg-rubick-primary text-right text-white">Qty</TableHeader>
                  <TableHeader className="rounded-r-md bg-rubick-primary text-white">Notes</TableHeader>
                </TableRow>
              </TableHead>
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
                      <TableCell className="whitespace-nowrap align-middle">{formatDate(r.createdAt)}</TableCell>
                      <TableCell className="align-middle">
                        <TypeBadge type={r.type} />
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="font-medium">{r.product?.name ?? "—"}</div>
                        {r.product?.hsn && (
                          <div className="text-xs text-slate-500">HSN {r.product.hsn}</div>
                        )}
                      </TableCell>
                      <TableCell className="align-middle">{r.facility?.name ?? "—"}</TableCell>
                      <TableCell className="align-middle">{r.batchNo ?? "—"}</TableCell>
                      <TableCell className="align-middle">{r.referenceType ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap align-middle text-right font-semibold">
                        {fmtQty(r.quantity)} {r.product?.unit ?? ""}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate align-middle text-xs text-slate-500">
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
