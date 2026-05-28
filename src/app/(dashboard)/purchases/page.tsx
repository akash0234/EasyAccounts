"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, X, Trash2, Eye, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InvoiceDetailModal } from "@/components/invoices/invoice-detail-modal";
import { SearchSelect } from "@/components/ui/search-select";

interface Vendor {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  hsn?: string | null;
  unit: string;
  gstPercent: number;
  purchaseRate: number;
  sellingRate: number;
  currentStock: number;
  trackingMode: "NONE" | "BATCH" | "SERIAL";
}

interface Facility {
  id: string;
  name: string;
  code: string | null;
}

interface InvoiceItem {
  description: string;
  productId?: string;
  quantity: number;
  rate: number;
  gstPercent: number;
  batchNo: string;
  slNo: string;
  expiryDate: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate?: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  notes?: string | null;
  vendor?: {
    name: string;
    gstin?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
  } | null;
  facility?: { name: string; address?: string | null } | null;
  items: {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
    gstPercent: number;
    gstAmount: number;
  }[];
}

const emptyItem: InvoiceItem = {
  description: "",
  productId: "",
  quantity: 1,
  rate: 0,
  gstPercent: 0,
  batchNo: "",
  slNo: "",
  expiryDate: "",
};

function splitCsv(value: string) {
  return value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseBatchAllocations(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [batchNo, quantity] = entry.split(":").map((part) => part.trim());
      return {
        batchNo,
        quantity: Number(quantity || "0"),
      };
    })
    .filter((entry) => entry.batchNo && entry.quantity > 0);
}

function getProductDisplay(product?: Product) {
  if (!product) return "";
  return `${product.name}${product.hsn ? ` (${product.hsn})` : ""}`;
}

export default function PurchasesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [facilitiesList, setFacilitiesList] = useState<Facility[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vendorId, setVendorId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([{ ...emptyItem }]);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [serialDraftByRow, setSerialDraftByRow] = useState<Record<number, string>>({});
  const [batchDraftByRow, setBatchDraftByRow] = useState<
    Record<number, { batchNo: string; quantity: string }>
  >({});

  async function load() {
    const [invRes, vendRes, prodRes, facRes] = await Promise.all([
      fetch("/api/invoices?type=PURCHASE"),
      fetch("/api/vendors"),
      fetch("/api/products"),
      fetch("/api/facilities"),
    ]);
    const [invData, vendData, prodData, facData] = await Promise.all([
      invRes.json(),
      vendRes.json(),
      prodRes.json(),
      facRes.json(),
    ]);
    if (Array.isArray(invData)) setInvoices(invData);
    if (Array.isArray(vendData)) setVendors(vendData);
    if (Array.isArray(prodData)) setProductsList(prodData);
    if (Array.isArray(facData)) setFacilitiesList(facData);
  }

  useEffect(() => {
    let cancelled = false;

    async function initializePurchases() {
      const [invRes, vendRes, prodRes, facRes] = await Promise.all([
        fetch("/api/invoices?type=PURCHASE"),
        fetch("/api/vendors"),
        fetch("/api/products"),
        fetch("/api/facilities"),
      ]);
      const [invData, vendData, prodData, facData] = await Promise.all([
        invRes.json(),
        vendRes.json(),
        prodRes.json(),
        facRes.json(),
      ]);

      if (cancelled) return;
      if (Array.isArray(invData)) setInvoices(invData);
      if (Array.isArray(vendData)) setVendors(vendData);
      if (Array.isArray(prodData)) setProductsList(prodData);
      if (Array.isArray(facData)) setFacilitiesList(facData);
    }

    void initializePurchases();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateItem(idx: number, field: keyof InvoiceItem, value: string | number) {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  }

  function setItemPatch(idx: number, patch: Partial<InvoiceItem>) {
    setItems((current) =>
      current.map((item, itemIdx) => (itemIdx === idx ? { ...item, ...patch } : item))
    );
  }

  function getTrackingMode(productId?: string) {
    return productsList.find((p) => p.id === productId)?.trackingMode ?? "NONE";
  }

  function setSerialDraft(idx: number, value: string) {
    setSerialDraftByRow((current) => ({ ...current, [idx]: value }));
  }

  function setBatchDraft(idx: number, patch: Partial<{ batchNo: string; quantity: string }>) {
    setBatchDraftByRow((current) => ({
      ...current,
      [idx]: {
        batchNo: current[idx]?.batchNo ?? "",
        quantity: current[idx]?.quantity ?? "",
        ...patch,
      },
    }));
  }

  function addSerialTag(idx: number, serial?: string) {
    const nextSerial = (serial ?? serialDraftByRow[idx] ?? "").trim();
    if (!nextSerial) return;

    const item = items[idx];
    if (!item) return;

    const existing = splitCsv(item.slNo);
    if (existing.includes(nextSerial)) {
      setSerialDraft(idx, "");
      return;
    }

    setItemPatch(idx, { slNo: [...existing, nextSerial].join(", ") });
    setSerialDraft(idx, "");
  }

  function removeSerialTag(idx: number, serial: string) {
    const item = items[idx];
    if (!item) return;

    const next = splitCsv(item.slNo).filter((entry) => entry !== serial);
    setItemPatch(idx, { slNo: next.join(", ") });
  }

  function addBatchTag(idx: number) {
    const draft = batchDraftByRow[idx] ?? { batchNo: "", quantity: "" };
    const batchNo = draft.batchNo.trim();
    const quantity = Number(draft.quantity);
    if (!batchNo || quantity <= 0) return;

    const item = items[idx];
    if (!item) return;

    const existing = parseBatchAllocations(item.batchNo);
    const match = existing.find((entry) => entry.batchNo === batchNo);
    const next = match
      ? existing.map((entry) =>
          entry.batchNo === batchNo
            ? { ...entry, quantity: entry.quantity + quantity }
            : entry
        )
      : [...existing, { batchNo, quantity }];

    setItemPatch(idx, {
      batchNo: next.map((entry) => `${entry.batchNo}:${entry.quantity}`).join(", "),
    });
    setBatchDraft(idx, { batchNo: "", quantity: "" });
  }

  function removeBatchTag(idx: number, batchNo: string) {
    const item = items[idx];
    if (!item) return;

    const next = parseBatchAllocations(item.batchNo).filter(
      (entry) => entry.batchNo !== batchNo
    );
    setItemPatch(idx, {
      batchNo: next.map((entry) => `${entry.batchNo}:${entry.quantity}`).join(", "),
    });
  }

  function getItemValidation(item: InvoiceItem) {
    const trackingMode = getTrackingMode(item.productId);
    if (trackingMode === "NONE") return null;

    if (trackingMode === "SERIAL") {
      const serials = splitCsv(item.slNo);
      if (serials.length !== Math.round(item.quantity)) {
        return `Serial count must match qty (${Math.round(item.quantity)}).`;
      }
    }

    if (trackingMode === "BATCH") {
      const allocations = parseBatchAllocations(item.batchNo);
      const allocatedQty = allocations.reduce((sum, entry) => sum + entry.quantity, 0);
      if (allocations.length === 0 || Math.abs(allocatedQty - item.quantity) > 0.0001) {
        return `Batch allocations must total qty (${item.quantity}).`;
      }
    }

    return null;
  }

  function selectProduct(idx: number, productId: string) {
    const product = productsList.find((p) => p.id === productId);
    const updated = [...items];
    if (product) {
      updated[idx] = {
        ...updated[idx],
        productId: product.id,
        description: product.name + (product.hsn ? ` (HSN: ${product.hsn})` : ""),
        rate: product.purchaseRate,
        gstPercent: product.gstPercent,
        quantity: product.trackingMode === "SERIAL" ? 1 : updated[idx].quantity,
        batchNo: "",
        slNo: "",
        expiryDate: "",
      };
    } else {
      updated[idx] = {
        ...updated[idx],
        productId: "",
        description: "",
        rate: 0,
        gstPercent: 0,
        batchNo: "",
        slNo: "",
        expiryDate: "",
      };
    }
    setItems(updated);
    setSerialDraft(idx, "");
    setBatchDraft(idx, { batchNo: "", quantity: "" });
  }

  function calcTotal() {
    return items.reduce((sum, item) => {
      const amount = item.quantity * item.rate;
      return sum + amount + (amount * item.gstPercent) / 100;
    }, 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const firstInvalid = items.find((item) => getItemValidation(item));
    if (firstInvalid) {
      alert(getItemValidation(firstInvalid));
      return;
    }

    setLoading(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "PURCHASE",
        date,
        dueDate,
        vendorId,
        facilityId,
        items,
        notes,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setShowForm(false);
      setItems([{ ...emptyItem }]);
      setSerialDraftByRow({});
      setBatchDraftByRow({});
      setVendorId("");
      setFacilityId("");
      setNotes("");
      load();
    }
  }

  const fmt = (n: number) =>
    n.toLocaleString("en-IN", { style: "currency", currency: "INR" });

  function removeItem(idx: number) {
    setItems((current) => current.filter((_, itemIdx) => itemIdx !== idx));
    setSerialDraftByRow((current) => {
      const next = { ...current };
      delete next[idx];
      return next;
    });
    setBatchDraftByRow((current) => {
      const next = { ...current };
      delete next[idx];
      return next;
    });
  }

  async function downloadPdf(invoiceId: string, invoiceNumber: string) {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pdf`);
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Failed to generate PDF (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `purchase-invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to download PDF");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Purchase Bills</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Purchase
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>New Purchase Bill</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                <div>
                  <Label>Vendor *</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    required
                  >
                    <option value="">Select vendor</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Facility *</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={facilityId}
                    onChange={(e) => setFacilityId(e.target.value)}
                    required
                  >
                    <option value="">Select facility</option>
                    {facilitiesList.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setItems([...items, { ...emptyItem }])}
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add Item
                  </Button>
                </div>
                <div className="space-y-2 overflow-x-auto">
                  {items.map((item, idx) => {
                    const trackingMode = getTrackingMode(item.productId);
                    const isBatch = trackingMode === "BATCH";
                    const isSerial = trackingMode === "SERIAL";
                    const serialTags = splitCsv(item.slNo);
                    const batchTags = parseBatchAllocations(item.batchNo);
                    const validationMessage = getItemValidation(item);

                    return (
                      <div
                        key={idx}
                        className="grid min-w-[1280px] grid-cols-[minmax(220px,1.45fr)_minmax(220px,1.45fr)_minmax(220px,1.45fr)_120px_80px_90px_70px_100px_40px] items-start gap-2"
                      >
                        <div className="min-w-0">
                          {idx === 0 && <Label className="text-xs">Product</Label>}
                          <SearchSelect
                            value={item.productId || ""}
                            displayValue={getProductDisplay(
                              productsList.find((p) => p.id === item.productId)
                            )}
                            endpoint="/api/products"
                            placeholder="Search product"
                            mapResult={(row) => {
                              const product = row as unknown as Product;
                              return {
                                id: product.id,
                                label: getProductDisplay(product),
                                hint: `${product.trackingMode} • ${product.currentStock} ${product.unit}`,
                              };
                            }}
                            onChange={(opt) => selectProduct(idx, opt?.id ?? "")}
                          />
                        </div>
                        <div className="min-w-0">
                          {idx === 0 && (
                            <Label className="text-xs">Batch No{isBatch ? " *" : ""}</Label>
                          )}
                          {isBatch ? (
                            <>
                              <div className="flex gap-2">
                                <Input
                                  value={batchDraftByRow[idx]?.batchNo ?? ""}
                                  onChange={(e) => setBatchDraft(idx, { batchNo: e.target.value })}
                                  placeholder="Batch no"
                                />
                                <Input
                                  type="number"
                                  value={batchDraftByRow[idx]?.quantity ?? ""}
                                  onChange={(e) => setBatchDraft(idx, { quantity: e.target.value })}
                                  placeholder="Qty"
                                  min={0.01}
                                  step={0.01}
                                  className="w-[78px] shrink-0"
                                />
                                <Button type="button" variant="outline" size="sm" className="h-9 px-3" onClick={() => addBatchTag(idx)}>
                                  Add
                                </Button>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {batchTags.length === 0 ? (
                                  <span className="text-xs text-[var(--muted-foreground)]">
                                    Add one or more batches until total matches qty.
                                  </span>
                                ) : (
                                  batchTags.map((entry) => (
                                    <button
                                      key={entry.batchNo}
                                      type="button"
                                      className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-2 py-1 text-xs"
                                      onClick={() => removeBatchTag(idx, entry.batchNo)}
                                    >
                                      {entry.batchNo}:{entry.quantity} ×
                                    </button>
                                  ))
                                )}
                              </div>
                            </>
                          ) : (
                            <Input
                              value={item.batchNo}
                              onChange={(e) => updateItem(idx, "batchNo", e.target.value)}
                              placeholder={isSerial ? "Optional shared batch" : "N/A"}
                              disabled={trackingMode === "NONE"}
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          {idx === 0 && (
                            <Label className="text-xs">SL No{isSerial ? " *" : ""}</Label>
                          )}
                          {isSerial ? (
                            <>
                              <div className="flex gap-2">
                                <Input
                                  value={serialDraftByRow[idx] ?? ""}
                                  onChange={(e) => setSerialDraft(idx, e.target.value)}
                                  placeholder="Enter serial no"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === ",") {
                                      e.preventDefault();
                                      addSerialTag(idx);
                                    }
                                  }}
                                />
                                <Button type="button" variant="outline" size="sm" className="h-9 px-3" onClick={() => addSerialTag(idx)}>
                                  Add
                                </Button>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {serialTags.length === 0 ? (
                                  <span className="text-xs text-[var(--muted-foreground)]">
                                    Add serial tags until count matches qty.
                                  </span>
                                ) : (
                                  serialTags.map((serial) => (
                                    <button
                                      key={serial}
                                      type="button"
                                      className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-2 py-1 text-xs"
                                      onClick={() => removeSerialTag(idx, serial)}
                                    >
                                      {serial} ×
                                    </button>
                                  ))
                                )}
                              </div>
                            </>
                          ) : (
                            <Input
                              value={item.slNo}
                              onChange={(e) => updateItem(idx, "slNo", e.target.value)}
                              placeholder="N/A"
                              disabled
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          {idx === 0 && <Label className="text-xs">Expiry</Label>}
                          <Input
                            type="date"
                            value={item.expiryDate}
                            onChange={(e) => updateItem(idx, "expiryDate", e.target.value)}
                          />
                        </div>
                        <div className="min-w-0">
                          {idx === 0 && <Label className="text-xs">Qty</Label>}
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(
                                idx,
                                "quantity",
                                isSerial
                                  ? Math.max(1, Math.round(Number(e.target.value) || 1))
                                  : Number(e.target.value)
                              )
                            }
                            min={isSerial ? 1 : 0.01}
                            step={isSerial ? 1 : 0.01}
                          />
                          {validationMessage && (
                            <p className="mt-1 text-xs text-red-600">{validationMessage}</p>
                          )}
                        </div>
                        <div className="min-w-0">
                          {idx === 0 && <Label className="text-xs">Rate</Label>}
                          <Input
                            type="number"
                            value={item.rate}
                            onChange={(e) => updateItem(idx, "rate", Number(e.target.value))}
                            min={0}
                          />
                        </div>
                        <div className="min-w-0">
                          {idx === 0 && <Label className="text-xs">GST %</Label>}
                          <Input
                            type="number"
                            value={item.gstPercent}
                            onChange={(e) => updateItem(idx, "gstPercent", Number(e.target.value))}
                            min={0}
                            max={28}
                          />
                        </div>
                        <div className="min-w-0 pt-1 text-right text-sm font-medium">
                          {fmt(item.quantity * item.rate * (1 + item.gstPercent / 100))}
                        </div>
                        <div className="min-w-0">
                          {items.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(idx)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div className="text-lg font-bold">Total: {fmt(calcTotal())}</div>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Bill"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table className="min-w-full table-fixed">
            <colgroup>
              <col className="w-[11rem]" />
              <col className="w-[8rem]" />
              <col />
              <col className="w-[10rem]" />
              <col className="w-[10rem]" />
              <col className="w-[8rem]" />
            </colgroup>
            <TableHead>
              <TableRow>
                <TableHeader className="rounded-l-md bg-rubick-primary text-white">
                  Bill #
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-white">Date</TableHeader>
                <TableHeader className="bg-rubick-primary text-white">Vendor</TableHeader>
                <TableHeader className="bg-rubick-primary text-right text-white">
                  Amount
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-right text-white">
                  Paid
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-center text-white">
                  Status
                </TableHeader>
                <TableHeader className="rounded-r-md bg-rubick-primary text-center text-white w-[8rem]">
                  Actions
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="align-middle font-medium">
                    {inv.invoiceNumber}
                  </TableCell>
                  <TableCell className="whitespace-nowrap align-middle">
                    {new Date(inv.date).toLocaleDateString("en-IN")}
                  </TableCell>
                  <TableCell className="align-middle">{inv.vendor?.name || "-"}</TableCell>
                  <TableCell className="whitespace-nowrap align-middle text-right font-medium">
                    {fmt(inv.totalAmount)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap align-middle text-right">
                    {fmt(inv.paidAmount)}
                  </TableCell>
                  <TableCell className="align-middle text-center">
                    <Badge
                      variant={
                        inv.status === "PAID"
                          ? "paid"
                          : inv.status === "PARTIAL"
                            ? "partial"
                            : "unpaid"
                      }
                    >
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-middle text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="View"
                        onClick={() => setViewInvoice(inv)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Download PDF"
                        onClick={() => downloadPdf(inv.id, inv.invoiceNumber)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-slate-400">
                    No purchase bills yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {viewInvoice && (
        <InvoiceDetailModal
          invoice={viewInvoice}
          onClose={() => setViewInvoice(null)}
          onDownloadPdf={() => downloadPdf(viewInvoice.id, viewInvoice.invoiceNumber)}
        />
      )}
    </div>
  );
}
