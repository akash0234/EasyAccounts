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
import { Plus, X, Trash2, Eye, Download, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { SideDrawer } from "@/components/ui/side-drawer";
import { Badge } from "@/components/ui/badge";
import { InvoiceDetailModal } from "@/components/invoices/invoice-detail-modal";
import { SearchSelect } from "@/components/ui/search-select";
import { SimpleSelect } from "@/components/ui/simple-select";

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
  vendorId?: string | null;
  facilityId?: string | null;
  vendor?: {
    name: string;
    gstin?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
  } | null;
  facility?: { id: string; name: string; address?: string | null } | null;
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
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
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
  const [listLoading, setListLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterVendorId, setFilterVendorId] = useState("");
  const [filterVendorDisplay, setFilterVendorDisplay] = useState("");
  const [filterFacilityId, setFilterFacilityId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function loadInvoices(nextPage = page) {
    setListLoading(true);
    const params = new URLSearchParams({
      type: "PURCHASE",
      page: String(nextPage),
      pageSize: String(pageSize),
    });
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    if (filterStatus) params.set("status", filterStatus);
    if (filterVendorId) params.set("vendorId", filterVendorId);
    if (filterFacilityId) params.set("facilityId", filterFacilityId);

    const invRes = await fetch(`/api/invoices?${params.toString()}`);
    const invData = await invRes.json();
    if (Array.isArray(invData)) {
      setInvoices(invData);
      setTotal(invData.length);
    } else {
      setInvoices(invData.data ?? []);
      setTotal(invData.pagination?.total ?? 0);
    }
    setListLoading(false);
  }

  async function loadReferenceData() {
    const [vendRes, prodRes, facRes] = await Promise.all([
      fetch("/api/vendors"),
      fetch("/api/products"),
      fetch("/api/facilities"),
    ]);
    const [vendData, prodData, facData] = await Promise.all([
      vendRes.json(),
      prodRes.json(),
      facRes.json(),
    ]);
    if (Array.isArray(vendData)) setVendors(vendData);
    if (Array.isArray(prodData)) setProductsList(prodData);
    if (Array.isArray(facData)) setFacilitiesList(facData);
  }

  async function load() {
    await Promise.all([loadInvoices(), loadReferenceData()]);
  }

  useEffect(() => {
    let cancelled = false;

    async function initializePurchases() {
      const [vendRes, prodRes, facRes] = await Promise.all([
        fetch("/api/vendors"),
        fetch("/api/products"),
        fetch("/api/facilities"),
      ]);
      const [vendData, prodData, facData] = await Promise.all([
        vendRes.json(),
        prodRes.json(),
        facRes.json(),
      ]);

      if (cancelled) return;
      if (Array.isArray(vendData)) setVendors(vendData);
      if (Array.isArray(prodData)) setProductsList(prodData);
      if (Array.isArray(facData)) setFacilitiesList(facData);
    }

    void initializePurchases();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterFrom, filterTo, filterStatus, filterVendorId, filterFacilityId, pageSize]);

  useEffect(() => {
    void loadInvoices(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch, filterFrom, filterTo, filterStatus, filterVendorId, filterFacilityId]);

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

  async function saveDraft() {
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
      setEditingInvoice(null);
      setItems([{ ...emptyItem }]);
      setSerialDraftByRow({});
      setBatchDraftByRow({});
      setVendorId("");
      setFacilityId("");
      setNotes("");
      load();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to save draft");
    }
  }

  async function saveDraftEdit() {
    if (!editingInvoice) return;
    const firstInvalid = items.find((item) => getItemValidation(item));
    if (firstInvalid) {
      alert(getItemValidation(firstInvalid));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/invoices?id=${editingInvoice.id}&action=edit`, {
        method: "PATCH",
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save draft");
      }

      setShowForm(false);
      setEditingInvoice(null);
      setItems([{ ...emptyItem }]);
      setSerialDraftByRow({});
      setBatchDraftByRow({});
      setVendorId("");
      setFacilityId("");
      setNotes("");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setLoading(false);
    }
  }

  function openCreatePurchase() {
    setEditingInvoice(null);
    setVendorId("");
    setFacilityId("");
    setDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setNotes("");
    setItems([{ ...emptyItem }]);
    setSerialDraftByRow({});
    setBatchDraftByRow({});
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const firstInvalid = items.find((item) => getItemValidation(item));
    if (firstInvalid) {
      alert(getItemValidation(firstInvalid));
      return;
    }

    setLoading(true);
    const isEdit = !!editingInvoice;
    const url = isEdit ? `/api/invoices?id=${editingInvoice.id}&action=edit` : "/api/invoices";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save invoice");
      }

      const saved = await res.json();
      const invoiceId = isEdit ? editingInvoice!.id : saved.id;

      // Finalize: move from DRAFT to UNPAID
      const finalize = await fetch(`/api/invoices?id=${invoiceId}&action=status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "UNPAID" }),
      });
      if (!finalize.ok) {
        const data = await finalize.json().catch(() => ({}));
        throw new Error(data.error || "Failed to mark invoice as UNPAID (draft saved)");
      }

      setShowForm(false);
      setEditingInvoice(null);
      setItems([{ ...emptyItem }]);
      setSerialDraftByRow({});
      setBatchDraftByRow({});
      setVendorId("");
      setFacilityId("");
      setNotes("");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save invoice");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteInvoice(invoiceId: string, invoiceNumber: string) {
    if (!confirm(`Are you sure you want to delete invoice ${invoiceNumber}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/invoices?id=${invoiceId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete invoice");
      }
      await loadInvoices();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete invoice");
    }
  }

  async function handleEditInvoice(invoice: Invoice) {
    if (!(invoice.status === "DRAFT" || invoice.status === "UNPAID")) {
      alert("Only DRAFT and UNPAID invoices can be edited");
      return;
    }

    setEditingInvoice(invoice);
    setVendorId(invoice.vendorId || "");
    setFacilityId(invoice.facilityId || invoice.facility?.id || "");
    setDate(invoice.date.split("T")[0]);
    setDueDate(invoice.dueDate?.split("T")[0] || "");
    setNotes(invoice.notes || "");

    // Load invoice items
    const itemsRes = await fetch(`/api/invoices/${invoice.id}`);
    const itemsData = await itemsRes.json();
    if (itemsData.items) {
      const formattedItems = itemsData.items.map((item: any) => ({
        description: item.description,
        productId: item.productId || "",
        quantity: item.quantity,
        rate: item.rate,
        gstPercent: item.gstPercent,
        batchNo: item.batchNo || "",
        slNo: item.slNo || "",
        expiryDate: item.expiryDate?.split("T")[0] || "",
      }));
      setItems(formattedItems.length > 0 ? formattedItems : [{ ...emptyItem }]);
    }

    setShowForm(true);
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
        <Button onClick={openCreatePurchase}>
          <Plus className="mr-2 h-4 w-4" /> New Purchase
        </Button>
      </div>

      <SideDrawer
        open={showForm}
        title={editingInvoice ? "Edit Purchase Bill" : "New Purchase Bill"}
        onClose={() => { setShowForm(false); setEditingInvoice(null); }}
        widthClassName="w-[880px] max-w-[100vw]"
      >
        <form onSubmit={handleSubmit} className="min-h-full flex flex-col gap-4 justify-between">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Vendor *</Label>
              <SimpleSelect
                value={vendorId}
                onChange={setVendorId}
                placeholder="Select vendor"
                options={[{ value: "", label: "Select vendor" }, ...vendors.map((v) => ({ value: v.id, label: v.name }))]}
              />
            </div>
            <div>
              <Label>Facility *</Label>
              <SearchSelect
                value={facilityId}
                displayValue={facilitiesList.find((f) => f.id === facilityId)?.name || ""}
                endpoint="/api/facilities"
                placeholder="Select facility"
                mapResult={(r: { id: string; name: string }) => ({ id: r.id, label: r.name })}
                onChange={(opt) => setFacilityId(opt?.id ?? "")}
              />
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

          <div className="mt-4 pt-4 border-t border-[var(--border)]">
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
            <div className="space-y-3">
              {items.map((item, idx) => {
                const trackingMode = getTrackingMode(item.productId);
                const isBatch = trackingMode === "BATCH";
                const isSerial = trackingMode === "SERIAL";
                const serialTags = splitCsv(item.slNo);
                const batchTags = parseBatchAllocations(item.batchNo);
                const validationMessage = getItemValidation(item);

                return (
                  <div key={idx} className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
                    <div className="flex">
                      <div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 items-start">
                          <div className="min-w-0">
                            <Label className="text-xs">Product</Label>
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
                            <Label className="text-xs">Batch No{isBatch ? " *" : ""}</Label>
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
                            <Label className="text-xs">SL No{isSerial ? " *" : ""}</Label>
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
                        </div>

                        <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
                          <div className="min-w-0">
                            <Label className="text-xs">Expiry</Label>
                            <Input
                              type="date"
                              value={item.expiryDate}
                              onChange={(e) => updateItem(idx, "expiryDate", e.target.value)}
                            />
                          </div>
                          <div className="min-w-0">
                            <Label className="text-xs">Qty</Label>
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
                            <Label className="text-xs">Rate</Label>
                            <Input
                              type="number"
                              value={item.rate}
                              onChange={(e) => updateItem(idx, "rate", Number(e.target.value))}
                              min={0}
                            />
                          </div>
                          <div className="min-w-0">
                            <Label className="text-xs">GST %</Label>
                            <Input
                              type="number"
                              value={item.gstPercent}
                              onChange={(e) => updateItem(idx, "gstPercent", Number(e.target.value))}
                              min={0}
                              max={28}
                            />
                          </div>
                          <div className="min-w-0">
                            <Label className="text-xs">Line Total</Label>
                            <Input
                              value={fmt(item.quantity * item.rate * (1 + item.gstPercent / 100))}
                              readOnly
                              className="text-right font-medium"
                            />
                          </div>

                        </div>


                      </div>
                      {items.length > 1 && (
                        <div style={{margin:"-12px -11px -12px 6px"}} className="w-[10px] flex justify-center items-center h-auto  mt-2  rounded-md border border-input bg-red-500 px-3 py-1 text-sm">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(idx)}
                            aria-label="Remove item"
                            className="mt-[-8px]"
                          >
                            <Trash2 className="h-4 w-4 text-white text-sm" />
                          </Button>
                        </div>

                      )}
                    </div>



                  </div>
                );
              })}
            </div>
          </div>

          <div className="sticky bottom-0 -mx-4 -mb-4 border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 flex items-center justify-between gap-2">
            <div className="text-lg font-bold">Total: {fmt(calcTotal())}</div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingInvoice(null); }}>Cancel</Button>
              {!editingInvoice && (
                <Button type="button" variant="outline" disabled={loading} onClick={saveDraft}>
                  {loading ? "Saving..." : "Save as Draft"}
                </Button>
              )}
              {editingInvoice && editingInvoice.status === "DRAFT" && (
                <Button type="button" variant="outline" disabled={loading} onClick={saveDraftEdit}>
                  {loading ? "Saving..." : "Save Draft"}
                </Button>
              )}
              <Button type="submit" disabled={loading}>
                {loading
                  ? editingInvoice
                    ? "Saving..."
                    : "Creating..."
                  : editingInvoice
                    ? (editingInvoice.status === "DRAFT" ? "Save as Unpaid" : "Save Bill")
                    : "Create Bill"}
              </Button>
            </div>
          </div>
        </form>
      </SideDrawer>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-7">
            <div className="xl:col-span-2">
              <Label>Search</Label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Bill #, vendor, GSTIN, phone"
              />
            </div>
            <div>
              <Label>From</Label>
              <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <SimpleSelect
                value={filterStatus}
                onChange={setFilterStatus}
                placeholder="All"
                options={[
                  { value: "", label: "All" },
                  { value: "DRAFT", label: "Draft" },
                  { value: "UNPAID", label: "Unpaid" },
                  { value: "PARTIAL", label: "Partial" },
                  { value: "PAID", label: "Paid" },
                ]}
              />
            </div>
            <div>
              <Label>Vendor</Label>
              <SearchSelect
                value={filterVendorId}
                displayValue={filterVendorDisplay}
                endpoint="/api/vendors"
                placeholder="All vendors"
                mapResult={(r: { id: string; name: string; gstin?: string | null }) => ({
                  id: r.id,
                  label: r.name,
                  hint: r.gstin ?? undefined,
                })}
                onChange={(opt) => {
                  setFilterVendorId(opt?.id ?? "");
                  setFilterVendorDisplay(opt?.label ?? "");
                }}
              />
            </div>
            <div>
              <Label>Facility</Label>
              <SearchSelect
                value={filterFacilityId}
                displayValue={facilitiesList.find((f) => f.id === filterFacilityId)?.name || ""}
                endpoint="/api/facilities"
                placeholder="All facilities"
                mapResult={(r: { id: string; name: string }) => ({ id: r.id, label: r.name })}
                onChange={(opt) => setFilterFacilityId(opt?.id ?? "")}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
                setFilterFrom("");
                setFilterTo("");
                setFilterStatus("");
                setFilterVendorId("");
                setFilterVendorDisplay("");
                setFilterFacilityId("");
                setPage(1);
              }}
            >
              Reset filters
            </Button>
            <div className="text-sm text-[var(--muted-foreground)]">
              {listLoading ? "Loading…" : `Showing ${invoices.length === 0 ? 0 : (page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="hidden md:block">
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
                        title="Edit"
                        onClick={() => handleEditInvoice(inv)}
                        disabled={!(inv.status === "DRAFT" || inv.status === "UNPAID")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                        disabled={inv.status === "PARTIAL" || inv.status === "PAID"}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
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
          </div>

          <div className="md:hidden p-2 space-y-2">
            {invoices.map((inv) => (
              <details key={inv.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
                <summary className="list-none cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{inv.invoiceNumber}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{new Date(inv.date).toLocaleDateString("en-IN")}</div>
                      <div className="text-sm text-slate-700 truncate">{inv.vendor?.name || "-"}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold">{fmt(inv.totalAmount)}</div>
                      <div className="mt-1">
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
                      </div>
                    </div>
                  </div>
                </summary>
                <div className="mt-3 text-sm">
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="text-[var(--muted-foreground)]">Paid<br /><span className="font-medium text-[var(--foreground)]">{fmt(inv.paidAmount)}</span></div>
                    <div className="text-[var(--muted-foreground)] text-right">Balance<br /><span className="font-medium text-[var(--foreground)]">{fmt(inv.totalAmount - inv.paidAmount)}</span></div>
                  </div>
                  <div className="flex items-center justify-end gap-1">
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
                      title="Edit"
                      onClick={() => handleEditInvoice(inv)}
                      disabled={!(inv.status === "DRAFT" || inv.status === "UNPAID")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete"
                      onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                      disabled={inv.status === "PARTIAL" || inv.status === "PAID"}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
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
                </div>
              </details>
            ))}
            {invoices.length === 0 && (
              <div className="py-6 text-center text-slate-400">No purchase bills yet</div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span>Rows per page</span>
          <div className="w-[96px]">
            <SimpleSelect
              value={String(pageSize)}
              onChange={(v) => setPageSize(Number(v))}
              options={[5, 10, 25, 50, 100].map((n) => ({ value: String(n), label: String(n) }))}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || listLoading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-[var(--muted-foreground)]">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || listLoading}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

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
