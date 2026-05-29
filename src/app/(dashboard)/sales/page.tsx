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
import { Plus, X, Trash2, Eye, MapPin, Receipt, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AddressPickerModal,
  formatAddressSnapshot,
  type CustomerAddress,
} from "@/components/customers/address-picker-modal";
import {
  AdditionalChargesModal,
  type AdditionalCharge,
} from "@/components/invoices/additional-charges-modal";
import { SearchSelect } from "@/components/ui/search-select";

interface Customer {
  id: string;
  name: string;
  addresses?: CustomerAddress[];
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
  facilityStock?: {
    facilityId: string;
    facilityName: string;
    currentStock: number;
  }[];
}
interface Facility { id: string; name: string; code: string | null; }
interface InvoiceItem { description: string; productId?: string; quantity: number; rate: number; gstPercent: number; batchNo: string; slNo: string; expiryDate: string; }
interface ProductAvailability {
  productId: string;
  facilityId: string;
  trackingMode: "NONE" | "BATCH" | "SERIAL";
  unit: string;
  currentStock: number;
  batches: { batchNo: string; availableQty: number; expiryDate: string | null }[];
  serials: { serialNo: string; batchNo: string | null; expiryDate: string | null }[];
  serialCount: number;
  updatedAt: string | null;
}
interface Invoice {
  id: string; invoiceNumber: string; date: string; dueDate?: string | null;
  subtotal: number; taxAmount: number; discountPercent?: number; discountAmount?: number; totalAmount: number;
  paidAmount: number; status: string; notes?: string | null;
  deliveryEnabled?: boolean;
  deliveryMode?: string | null;
  deliveryReference?: string | null;
  customer?: { name: string; gstin?: string | null; phone?: string | null; billingAddress?: string | null; city?: string | null } | null;
  billingAddressSnapshot?: string | null;
  shippingAddressSnapshot?: string | null;
  items: { description: string; quantity: number; rate: number; amount: number; gstPercent: number; gstAmount: number; }[];
  additionalCharges?: { name: string; hsnSac?: string | null; amount: number; discountAmount: number; gstPercent: number; gstAmount: number; }[];
}

const emptyItem: InvoiceItem = { description: "", productId: "", quantity: 1, rate: 0, gstPercent: 0, batchNo: "", slNo: "", expiryDate: "" };

function splitCsv(value: string) {
  return value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseBatchSelections(value: string) {
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

export default function SalesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [facilitiesList, setFacilitiesList] = useState<Facility[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState("");
  const [deliveryReference, setDeliveryReference] = useState("");
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountPercent, setDiscountPercent] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [items, setItems] = useState<InvoiceItem[]>([{ ...emptyItem }]);
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([]);
  const [showChargesModal, setShowChargesModal] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [billingAddr, setBillingAddr] = useState<CustomerAddress | null>(null);
  const [shippingAddr, setShippingAddr] = useState<CustomerAddress | null>(null);
  const [shipSameAsBilling, setShipSameAsBilling] = useState(true);
  const [pickerOpen, setPickerOpen] = useState<null | "billing" | "shipping" | "manage">(null);
  const [availabilityByKey, setAvailabilityByKey] = useState<Record<string, ProductAvailability>>({});
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
  const [filterCustomerId, setFilterCustomerId] = useState("");
  const [filterCustomerDisplay, setFilterCustomerDisplay] = useState("");
  const [filterFacilityId, setFilterFacilityId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;

  async function loadInvoices(nextPage = page) {
    setListLoading(true);
    const params = new URLSearchParams({
      type: "SALES",
      page: String(nextPage),
      pageSize: String(pageSize),
    });
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    if (filterStatus) params.set("status", filterStatus);
    if (filterCustomerId) params.set("customerId", filterCustomerId);
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
    const [custRes, prodRes, facRes] = await Promise.all([
      fetch("/api/customers"),
      fetch("/api/products"),
      fetch("/api/facilities"),
    ]);
    const [custData, prodData, facData] = await Promise.all([custRes.json(), prodRes.json(), facRes.json()]);
    if (Array.isArray(custData)) setCustomers(custData);
    if (Array.isArray(prodData)) setProductsList(prodData);
    if (Array.isArray(facData)) setFacilitiesList(facData);
  }

  async function load() {
    await Promise.all([loadInvoices(), loadReferenceData()]);
  }

  useEffect(() => {
    let cancelled = false;

    async function initializeSales() {
      const [custRes, prodRes, facRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/products"),
        fetch("/api/facilities"),
      ]);
      const [custData, prodData, facData] = await Promise.all([custRes.json(), prodRes.json(), facRes.json()]);

      if (cancelled) {
        return;
      }
      if (Array.isArray(custData)) setCustomers(custData);
      if (Array.isArray(prodData)) setProductsList(prodData);
      if (Array.isArray(facData)) setFacilitiesList(facData);
    }

    void initializeSales();

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
  }, [debouncedSearch, filterFrom, filterTo, filterStatus, filterCustomerId, filterFacilityId, pageSize]);

  useEffect(() => {
    void loadInvoices(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch, filterFrom, filterTo, filterStatus, filterCustomerId, filterFacilityId]);

  function handleCustomerChange(nextCustomerId: string) {
    setCustomerId(nextCustomerId);

    if (!nextCustomerId) {
      setBillingAddr(null);
      setShippingAddr(null);
      setShipSameAsBilling(true);
      return;
    }

    const cust = customers.find((c) => c.id === nextCustomerId);
    const defaultAddr =
      cust?.addresses?.find((a) => a.isDefault) ?? cust?.addresses?.[0] ?? null;
    setBillingAddr(defaultAddr);
    setShippingAddr(null);
    setShipSameAsBilling(true);
  }

  function updateItem(idx: number, field: keyof InvoiceItem, value: string | number) {
    const updated = [...items];
    const currentItem = updated[idx];
    const nextItem = { ...currentItem, [field]: value };

    if (field === "quantity" && getTrackingMode(currentItem?.productId) === "BATCH") {
      const allocations = parseBatchSelections(currentItem.batchNo);
      if (allocations.length === 1) {
        nextItem.batchNo = `${allocations[0].batchNo}:${formatDecimal(Number(value) || 0)}`;
      }
    }

    updated[idx] = nextItem;
    setItems(updated);
  }

  function setItemPatch(idx: number, patch: Partial<InvoiceItem>) {
    setItems((current) =>
      current.map((entry, entryIdx) =>
        entryIdx === idx ? { ...entry, ...patch } : entry
      )
    );
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

    const maxCount = Math.max(1, Math.round(item.quantity || 1));
    if (existing.length >= maxCount) {
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

  function addBatchTag(idx: number, batchNoArg?: string, quantityArg?: number) {
    const draft = batchDraftByRow[idx] ?? { batchNo: "", quantity: "" };
    const batchNo = (batchNoArg ?? draft.batchNo).trim();
    const quantity = quantityArg ?? Number(draft.quantity);
    if (!batchNo || quantity <= 0) return;

    const item = items[idx];
    if (!item) return;

    const existing = parseBatchSelections(item.batchNo);
    const match = existing.find((entry) => entry.batchNo === batchNo);
    const next = match
      ? existing.map((entry) =>
          entry.batchNo === batchNo
            ? { ...entry, quantity: entry.quantity + quantity }
            : entry
        )
      : [...existing, { batchNo, quantity }];

    setItemPatch(idx, {
      batchNo: next.map((entry) => `${entry.batchNo}:${formatDecimal(entry.quantity)}`).join(", "),
    });
    setBatchDraft(idx, { batchNo: "", quantity: "" });
  }

  function removeBatchTag(idx: number, batchNo: string) {
    const item = items[idx];
    if (!item) return;

    const next = parseBatchSelections(item.batchNo).filter(
      (entry) => entry.batchNo !== batchNo
    );
    setItemPatch(idx, {
      batchNo: next.map((entry) => `${entry.batchNo}:${formatDecimal(entry.quantity)}`).join(", "),
    });
  }

  function selectProduct(idx: number, productId: string) {
    const product = productsList.find((p) => p.id === productId);
    const updated = [...items];
    if (product) {
      updated[idx] = {
        ...updated[idx],
        productId: product.id,
        description: product.name + (product.hsn ? ` (HSN: ${product.hsn})` : ""),
        rate: product.sellingRate,
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

  function getTrackingMode(productId?: string) {
    return productsList.find((p) => p.id === productId)?.trackingMode ?? "NONE";
  }

  function getFacilityStock(productId?: string) {
    if (!productId || !facilityId) return null;

    const cacheKey = `${facilityId}:${productId}`;
    if (availabilityByKey[cacheKey]) {
      return availabilityByKey[cacheKey];
    }

    const product = productsList.find((entry) => entry.id === productId);
    if (!product) return null;

    return {
      productId,
      facilityId,
      trackingMode: product.trackingMode,
      unit: product.unit,
      currentStock:
        product.facilityStock?.find((row) => row.facilityId === facilityId)?.currentStock ?? 0,
      batches: [],
      serials: [],
      serialCount: 0,
      updatedAt: null,
    } satisfies ProductAvailability;
  }

  function getStockColumnValue(item: InvoiceItem) {
    const availability = getFacilityStock(item.productId);
    if (!facilityId || !item.productId || !availability) {
      return "—";
    }

    if (availability.trackingMode === "SERIAL") {
      return `${availability.serialCount} ${availability.unit}`;
    }

    return `${formatDecimal(availability.currentStock)} ${availability.unit}`;
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
      a.download = `sales-invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to download PDF");
    }
  }

  function addSuggestedSerial(idx: number, serialNo: string) {
    addSerialTag(idx, serialNo);
  }

  function autoFillSerials(idx: number) {
    const item = items[idx];
    const availability = getFacilityStock(item.productId);
    if (!item || !availability || availability.trackingMode !== "SERIAL") return;

    const selected = splitCsv(item.slNo);
    const maxCount = Math.max(1, Math.round(item.quantity || 1));
    const suggestions = availability.serials
      .map((serial) => serial.serialNo)
      .filter((serialNo) => !selected.includes(serialNo))
      .slice(0, Math.max(maxCount - selected.length, 0));

    if (suggestions.length === 0) return;

    const nextSerials = [...selected, ...suggestions];
    setItemPatch(idx, {
      slNo: nextSerials.join(", "),
      quantity: Math.max(item.quantity, nextSerials.length),
    });
  }

  function addSuggestedBatch(idx: number, batchNo: string) {
    const item = items[idx];
    const availability = getFacilityStock(item.productId);
    if (!item || !availability || availability.trackingMode !== "BATCH") return;

    const requestedQty = Math.max(item.quantity || 0, 0);
    const existing = parseBatchSelections(item.batchNo);
    const allocatedQty = existing.reduce((sum, entry) => sum + entry.quantity, 0);
    const remainingQty = Math.max(requestedQty - allocatedQty, 0);
    if (remainingQty <= 0) return;

    const batch = availability.batches.find((entry) => entry.batchNo === batchNo);
    if (!batch) return;

    const existingEntry = existing.find((entry) => entry.batchNo === batchNo);
    const alreadyAllocatedForBatch = existingEntry?.quantity ?? 0;
    const freeInBatch = Math.max(batch.availableQty - alreadyAllocatedForBatch, 0);
    const takeQty = Math.min(remainingQty, freeInBatch);
    if (takeQty <= 0) return;

    addBatchTag(idx, batchNo, takeQty);
    setItemPatch(idx, {
      expiryDate: batch.expiryDate ? batch.expiryDate.slice(0, 10) : item.expiryDate,
    });
  }

  function autoFillBatches(idx: number) {
    const item = items[idx];
    const availability = getFacilityStock(item.productId);
    if (!item || !availability || availability.trackingMode !== "BATCH") return;

    let selections = parseBatchSelections(item.batchNo);
    let allocatedQty = selections.reduce((sum, entry) => sum + entry.quantity, 0);
    let remainingQty = Math.max(item.quantity - allocatedQty, 0);
    if (remainingQty <= 0) return;

    for (const batch of availability.batches) {
      if (remainingQty <= 0) break;

      const existingEntry = selections.find((entry) => entry.batchNo === batch.batchNo);
      const allocatedForBatch = existingEntry?.quantity ?? 0;
      const freeInBatch = Math.max(batch.availableQty - allocatedForBatch, 0);
      const takeQty = Math.min(remainingQty, freeInBatch);
      if (takeQty <= 0) continue;

      if (existingEntry) {
        existingEntry.quantity += takeQty;
      } else {
        selections = [...selections, { batchNo: batch.batchNo, quantity: takeQty }];
      }

      allocatedQty += takeQty;
      remainingQty = Math.max(item.quantity - allocatedQty, 0);
    }

    setItemPatch(idx, {
      batchNo: selections
        .map((entry) => `${entry.batchNo}:${formatDecimal(entry.quantity)}`)
        .join(", "),
    });
  }

  useEffect(() => {
    if (!facilityId) {
      return;
    }

    const productIds = Array.from(
      new Set(items.map((item) => item.productId).filter((id): id is string => Boolean(id)))
    );

    if (productIds.length === 0) {
      return;
    }

    let cancelled = false;

    async function loadAvailability() {
      const pendingIds = productIds.filter(
        (productId) => !availabilityByKey[`${facilityId}:${productId}`]
      );

      if (pendingIds.length === 0) {
        return;
      }

      const results = await Promise.all(
        pendingIds.map(async (productId) => {
          const res = await fetch(
            `/api/products/${productId}/availability?facilityId=${encodeURIComponent(facilityId)}`
          );
          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error || "Failed to load stock availability");
          }

          return {
            cacheKey: `${facilityId}:${productId}`,
            data: data as ProductAvailability,
          };
        })
      );

      if (cancelled || results.length === 0) {
        return;
      }

      setAvailabilityByKey((current) => {
        const next = { ...current };
        for (const result of results) {
          next[result.cacheKey] = result.data;
        }
        return next;
      });
    }

    void loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [facilityId, items, availabilityByKey]);

  function calcTotal() {
    const itemsTotal = items.reduce((sum, item) => {
      const amount = item.quantity * item.rate;
      const gst = (amount * item.gstPercent) / 100;
      return sum + amount + gst;
    }, 0);
    const chargesTotal = additionalCharges.reduce((sum, c) => {
      const taxable = Math.max(c.amount - (c.discountAmount ?? 0), 0);
      return sum + taxable + (taxable * c.gstPercent) / 100;
    }, 0);
    return itemsTotal + chargesTotal;
  }

  function formatDecimal(value: number) {
    return Number.isFinite(value) ? value.toFixed(2).replace(/\.00$/, "") : "0";
  }

  function sanitizeNumberInput(value: string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const grossTotal = calcTotal();
  const normalizedDiscountAmount = discountEnabled
    ? Math.min(Math.max(sanitizeNumberInput(discountAmount), 0), grossTotal)
    : 0;
  const normalizedDiscountPercent =
    discountEnabled && grossTotal > 0
      ? Math.min(Math.max((normalizedDiscountAmount / grossTotal) * 100, 0), 100)
      : 0;
  const finalTotal = grossTotal - normalizedDiscountAmount;

  function handleDiscountEnabledChange(enabled: boolean) {
    setDiscountEnabled(enabled);
    if (!enabled) {
      setDiscountPercent("0");
      setDiscountAmount("0");
    }
  }

  function handleDiscountPercentChange(value: string) {
    setDiscountPercent(value);
    const percent = Math.min(Math.max(sanitizeNumberInput(value), 0), 100);
    const amount = grossTotal > 0 ? (grossTotal * percent) / 100 : 0;
    setDiscountAmount(formatDecimal(amount));
  }

  function handleDiscountAmountChange(value: string) {
    setDiscountAmount(value);
    const amount = Math.min(Math.max(sanitizeNumberInput(value), 0), grossTotal);
    const percent = grossTotal > 0 ? (amount / grossTotal) * 100 : 0;
    setDiscountPercent(formatDecimal(percent));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const billingSnap = formatAddressSnapshot(billingAddr);
    const shippingSnap = shipSameAsBilling
      ? billingSnap
      : formatAddressSnapshot(shippingAddr);

    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "SALES",
        date,
        dueDate,
        customerId,
        facilityId,
        items,
        additionalCharges,
        notes,
        deliveryEnabled,
        deliveryMode,
        deliveryReference,
        discountEnabled,
        discountPercent: normalizedDiscountPercent,
        discountAmount: normalizedDiscountAmount,
        billingAddressSnapshot: billingSnap || undefined,
        shippingAddressSnapshot: shippingSnap || undefined,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setShowForm(false);
      setItems([{ ...emptyItem }]);
      setAdditionalCharges([]);
      setCustomerId("");
      setFacilityId("");
      setAvailabilityByKey({});
      setSerialDraftByRow({});
      setBatchDraftByRow({});
      setNotes("");
      setDeliveryEnabled(false);
      setDeliveryMode("");
      setDeliveryReference("");
      setDiscountEnabled(false);
      setDiscountPercent("0");
      setDiscountAmount("0");
      setBillingAddr(null);
      setShippingAddr(null);
      setShipSameAsBilling(true);
      load();
    }
  }

  const fmt = (n: number) => n.toLocaleString("en-IN", { style: "currency", currency: "INR" });
  const chargeLineTotal = (charge: {
    amount: number;
    discountAmount?: number;
    gstPercent: number;
    gstAmount?: number;
  }) => {
    const taxable = Math.max(charge.amount - (charge.discountAmount ?? 0), 0);
    const gstAmount =
      typeof charge.gstAmount === "number"
        ? charge.gstAmount
        : (taxable * charge.gstPercent) / 100;
    return taxable + gstAmount;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Sales Invoices</h2>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" /> New Invoice</Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>New Sales Invoice</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label>Customer *</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={customerId} onChange={(e) => handleCustomerChange(e.target.value)} required>
                    <option value="">Select customer</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Facility *</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={facilityId}
                    onChange={(e) => {
                      const nextFacilityId = e.target.value;
                      setFacilityId(nextFacilityId);
                      setAvailabilityByKey({});
                      setSerialDraftByRow({});
                      setBatchDraftByRow({});
                      setItems((current) =>
                        current.map((item) => ({
                          ...item,
                          batchNo: "",
                          slNo: "",
                          expiryDate: nextFacilityId ? item.expiryDate : "",
                        }))
                      );
                    }}
                    required
                  >
                    <option value="">Select facility</option>
                    {facilitiesList.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div><Label>Date *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
                <div><Label>Due Date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
                <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              </div>

              <div className="rounded-lg border border-[var(--border)] p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[var(--muted-foreground)]" />
                    Billing Address
                  </Label>
                  {customerId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPickerOpen("billing")}
                    >
                      {billingAddr ? "Change" : "Select address"}
                    </Button>
                  )}
                </div>
                <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm min-h-[2.5rem]">
                  {!customerId ? (
                    <span className="text-[var(--muted-foreground)]">Select a customer first</span>
                  ) : billingAddr ? (
                    <span>{formatAddressSnapshot(billingAddr)}</span>
                  ) : (
                    <span className="text-[var(--muted-foreground)]">No address selected</span>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <input
                    id="ship-same-as-billing"
                    type="checkbox"
                    checked={shipSameAsBilling}
                    onChange={(e) => setShipSameAsBilling(e.target.checked)}
                    className="h-4 w-4 rounded border border-input"
                  />
                  <Label htmlFor="ship-same-as-billing" className="cursor-pointer">
                    Shipping same as billing
                  </Label>
                </div>

                {!shipSameAsBilling && (
                  <>
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-[var(--muted-foreground)]" />
                        Shipping Address
                      </Label>
                      {customerId && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPickerOpen("shipping")}
                        >
                          {shippingAddr ? "Change" : "Select address"}
                        </Button>
                      )}
                    </div>
                    <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm min-h-[2.5rem]">
                      {!customerId ? (
                        <span className="text-[var(--muted-foreground)]">Select a customer first</span>
                      ) : shippingAddr ? (
                        <span>{formatAddressSnapshot(shippingAddr)}</span>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">No address selected</span>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="rounded-lg border border-[var(--border)] p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    id="sales-delivery-enabled"
                    type="checkbox"
                    checked={deliveryEnabled}
                    onChange={(e) => {
                      setDeliveryEnabled(e.target.checked);
                      if (!e.target.checked) {
                        setDeliveryMode("");
                        setDeliveryReference("");
                      }
                    }}
                    className="h-4 w-4 rounded border border-input"
                  />
                  <Label htmlFor="sales-delivery-enabled" className="cursor-pointer">
                    Add delivery details
                  </Label>
                </div>

                {deliveryEnabled && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label>Delivery Mode *</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                        value={deliveryMode}
                        onChange={(e) => setDeliveryMode(e.target.value)}
                        required={deliveryEnabled}
                      >
                        <option value="">Select mode</option>
                        <option value="Courier">Courier</option>
                        <option value="Transport">Transport</option>
                        <option value="Hand Delivery">Hand Delivery</option>
                        <option value="Post">Post</option>
                        <option value="Bus">Bus</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <Label>AWB / Reference No. *</Label>
                      <Input
                        value={deliveryReference}
                        onChange={(e) => setDeliveryReference(e.target.value)}
                        placeholder="AWB number or delivery reference"
                        required={deliveryEnabled}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-[var(--border)] p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    id="sales-discount-enabled"
                    type="checkbox"
                    checked={discountEnabled}
                    onChange={(e) => handleDiscountEnabledChange(e.target.checked)}
                    className="h-4 w-4 rounded border border-input"
                  />
                  <Label htmlFor="sales-discount-enabled" className="cursor-pointer">
                    Apply discount
                  </Label>
                </div>

                {discountEnabled && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <Label>Discount %</Label>
                      <Input
                        type="number"
                        value={discountPercent}
                        onChange={(e) => handleDiscountPercentChange(e.target.value)}
                        min={0}
                        max={100}
                        step={0.01}
                      />
                    </div>
                    <div>
                      <Label>Discount Value</Label>
                      <Input
                        type="number"
                        value={discountAmount}
                        onChange={(e) => handleDiscountAmountChange(e.target.value)}
                        min={0}
                        max={grossTotal}
                        step={0.01}
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <div className="rounded-md bg-[var(--muted)] px-3 py-2 text-sm">
                        Discount Applied: <span className="font-semibold">{fmt(normalizedDiscountAmount)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Label>Items</Label>
                    {additionalCharges.length > 0 && (
                      <span className="inline-flex items-center rounded-full bg-rubick-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rubick-primary">
                        {additionalCharges.length} extra charge
                        {additionalCharges.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowChargesModal(true)}
                    >
                      <Receipt className="h-3 w-3 mr-1" />
                      {additionalCharges.length > 0
                        ? "Edit Charges"
                        : "Add Additional Charges"}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { ...emptyItem }])} disabled={!facilityId}>
                      <Plus className="h-3 w-3 mr-1" /> Add Item
                    </Button>
                  </div>
                </div>
                {!facilityId && (
                  <div className="rounded-md border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Select a facility before adding or choosing line items.
                  </div>
                )}
                <div className="space-y-2 overflow-x-auto">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid min-w-[1460px] grid-cols-[minmax(240px,1.55fr)_120px_minmax(240px,1.35fr)_minmax(240px,1.35fr)_120px_80px_90px_70px_100px_40px] items-start gap-2"
                    >
                      {(() => {
                        const trackingMode = getTrackingMode(item.productId);
                        const isBatch = trackingMode === "BATCH";
                        const isSerial = trackingMode === "SERIAL";
                        return (
                          <>
                      <div className="min-w-0">
{idx === 0 && <Label className="text-xs">Product</Label>}
                        <SearchSelect
                          value={item.productId || ""}
                          displayValue={getProductDisplay(
                            productsList.find((p) => p.id === item.productId)
                          )}
                          endpoint="/api/products"
                          placeholder={facilityId ? "Search product" : "Select facility first"}
                          disabled={!facilityId}
                          mapResult={(row) => {
                            const product = row as unknown as Product;
                            return {
                              id: product.id,
                              label: getProductDisplay(product),
                              hint: `${product.currentStock} ${product.unit}`,
                            };
                          }}
                          onChange={(opt) => selectProduct(idx, opt?.id ?? "")}
                        />
                      </div>
                      <div className="min-w-0">
                        {idx === 0 && <Label className="text-xs">Current Stock</Label>}
                        <div className="flex h-9 items-center rounded-md border border-input bg-[var(--muted)] px-3 text-sm font-medium">
                          {getStockColumnValue(item)}
                        </div>
                      </div>
                      <div className="min-w-0">
                        {idx === 0 && <Label className="text-xs">Batch No{isBatch ? " *" : ""}</Label>}
                        {isBatch ? (
                          <>
                            <div className="flex gap-2">
                              <select
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                value=""
                                onChange={(e) => {
                                  const nextBatchNo = e.target.value;
                                  if (!nextBatchNo) return;
                                  addSuggestedBatch(idx, nextBatchNo);
                                }}
                                disabled={!facilityId}
                              >
                                <option value="">Select available batch</option>
                                {(getFacilityStock(item.productId)?.batches ?? [])
                                  .filter((batch) => batch.availableQty > 0)
                                  .map((batch) => (
                                    <option key={batch.batchNo} value={batch.batchNo}>
                                      {batch.batchNo} ({formatDecimal(batch.availableQty)})
                                    </option>
                                  ))}
                              </select>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {parseBatchSelections(item.batchNo).map((entry) => (
                                <button
                                  key={entry.batchNo}
                                  type="button"
                                  className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-2 py-1 text-[10px] font-medium"
                                  onClick={() => removeBatchTag(idx, entry.batchNo)}
                                >
                                  {entry.batchNo}:{formatDecimal(entry.quantity)} ×
                                </button>
                              ))}
                            </div>
                          </>
                        ) : (
                          <Input
                            value={item.batchNo}
                            onChange={(e) => updateItem(idx, "batchNo", e.target.value)}
                            placeholder={isSerial ? "Optional shared batch" : "N/A"}
                            disabled={!facilityId || trackingMode === "NONE"}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        {idx === 0 && <Label className="text-xs">SL No{isSerial ? " *" : ""}</Label>}
                        {isSerial ? (
                          <>
                            <div className="flex gap-2">
                              <select
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                value=""
                                onChange={(e) => {
                                  const nextSerial = e.target.value;
                                  if (!nextSerial) return;
                                  addSuggestedSerial(idx, nextSerial);
                                }}
                                disabled={!facilityId}
                              >
                                <option value="">Select available serial</option>
                                {(getFacilityStock(item.productId)?.serials ?? [])
                                  .filter((serial) => !splitCsv(item.slNo).includes(serial.serialNo))
                                  .map((serial) => (
                                    <option key={serial.serialNo} value={serial.serialNo}>
                                      {serial.batchNo
                                        ? `${serial.serialNo} [${serial.batchNo}]`
                                        : serial.serialNo}
                                    </option>
                                  ))}
                              </select>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {splitCsv(item.slNo).map((serial) => (
                                <button
                                  key={serial}
                                  type="button"
                                  className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-2 py-1 text-[10px] font-medium"
                                  onClick={() => removeSerialTag(idx, serial)}
                                >
                                  {serial} ×
                                </button>
                              ))}
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
                      <div className="min-w-0">{idx === 0 && <Label className="text-xs">Expiry</Label>}<Input type="date" value={item.expiryDate} onChange={(e) => updateItem(idx, "expiryDate", e.target.value)} /></div>
                      <div className="min-w-0">{idx === 0 && <Label className="text-xs">Qty</Label>}<Input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", isSerial ? Math.max(1, Math.round(Number(e.target.value) || 1)) : Number(e.target.value))} min={isSerial ? 1 : 0.01} step={isSerial ? 1 : 0.01} /></div>
                      <div className="min-w-0">{idx === 0 && <Label className="text-xs">Rate</Label>}<Input type="number" value={item.rate} onChange={(e) => updateItem(idx, "rate", Number(e.target.value))} min={0} /></div>
                      <div className="min-w-0">{idx === 0 && <Label className="text-xs">GST %</Label>}<Input type="number" value={item.gstPercent} onChange={(e) => updateItem(idx, "gstPercent", Number(e.target.value))} min={0} max={28} /></div>
                      <div className="min-w-0 pt-1 text-right text-sm font-medium">{fmt(item.quantity * item.rate * (1 + item.gstPercent / 100))}</div>
                      <div className="min-w-0">{items.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4 text-red-500" /></Button>}</div>
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>
                {additionalCharges.length > 0 && (
                  <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted)]/40 p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Selected Additional Charges
                    </p>
                    <div className="space-y-2">
                      {additionalCharges.map((charge, idx) => (
                        <div
                          key={`${charge.name}-${idx}`}
                          className="flex items-center justify-between gap-3 rounded-md bg-[var(--card)] px-3 py-2 text-sm"
                        >
                          <div>
                            <div className="font-medium">{charge.name}</div>
                            <div className="text-xs text-[var(--muted-foreground)]">
                              {charge.hsnSac ? `HSN/SAC ${charge.hsnSac} · ` : ""}
                              GST {formatDecimal(charge.gstPercent)}%
                              {(charge.discountAmount ?? 0) > 0
                                ? ` · Disc ${fmt(charge.discountAmount ?? 0)}`
                                : ""}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {fmt(chargeLineTotal(charge))}
                            </div>
                            <div className="text-xs text-[var(--muted-foreground)]">
                              Base {fmt(charge.amount)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="space-y-1 text-right">
                  <div className="text-sm text-[var(--muted-foreground)]">Gross Total: {fmt(grossTotal)}</div>
                  {discountEnabled && normalizedDiscountAmount > 0 && (
                    <div className="text-sm text-green-700">
                      Discount: -{fmt(normalizedDiscountAmount)} ({formatDecimal(normalizedDiscountPercent)}%)
                    </div>
                  )}
                  <div className="text-lg font-bold">Total: {fmt(finalTotal)}</div>
                </div>
                <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Invoice"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-7">
            <div className="xl:col-span-2">
              <Label>Search</Label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Invoice #, customer, GSTIN, phone"
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
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PARTIAL">Partial</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
            <div>
              <Label>Customer</Label>
              <SearchSelect
                value={filterCustomerId}
                displayValue={filterCustomerDisplay}
                endpoint="/api/customers"
                placeholder="All customers"
                mapResult={(r: { id: string; name: string; gstin?: string | null }) => ({
                  id: r.id,
                  label: r.name,
                  hint: r.gstin ?? undefined,
                })}
                onChange={(opt) => {
                  setFilterCustomerId(opt?.id ?? "");
                  setFilterCustomerDisplay(opt?.label ?? "");
                }}
              />
            </div>
            <div>
              <Label>Facility</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={filterFacilityId}
                onChange={(e) => setFilterFacilityId(e.target.value)}
              >
                <option value="">All facilities</option>
                {facilitiesList.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name}
                  </option>
                ))}
              </select>
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
                setFilterCustomerId("");
                setFilterCustomerDisplay("");
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
                  Invoice #
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-white">
                  Date
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-white">
                  Customer
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-right text-white">
                  Amount
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-right text-white">
                  Paid
                </TableHeader>
                <TableHeader className="bg-rubick-primary !text-center text-white">
                  Status
                </TableHeader>
                <TableHeader className="rounded-r-md bg-rubick-primary text-center text-white w-[6rem]">
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
                  <TableCell className="align-middle">
                    {inv.customer?.name || "-"}
                  </TableCell>
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
                    No sales invoices yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span>Rows per page</span>
          <select
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
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

      {/* Invoice Detail Popup */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setViewInvoice(null)}>
          <div className="bg-[var(--card)] text-[var(--card-foreground)] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
              <div>
                <h3 className="text-lg font-bold">{viewInvoice.invoiceNumber}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {new Date(viewInvoice.date).toLocaleDateString("en-IN")}
                  {viewInvoice.dueDate && <> &middot; Due: {new Date(viewInvoice.dueDate).toLocaleDateString("en-IN")}</>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={viewInvoice.status === "PAID" ? "paid" : viewInvoice.status === "PARTIAL" ? "partial" : "unpaid"}>
                  {viewInvoice.status}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadPdf(viewInvoice.id, viewInvoice.invoiceNumber)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setViewInvoice(null)}><X className="h-4 w-4" /></Button>
              </div>
            </div>

            {viewInvoice.customer && (
              <div className="px-6 pt-4 space-y-2">
                <div>
                  <p className="text-sm font-medium text-[var(--muted-foreground)]">Customer</p>
                  <p className="font-semibold">{viewInvoice.customer.name}</p>
                  {viewInvoice.customer.gstin && <p className="text-xs text-[var(--muted-foreground)]">GSTIN: {viewInvoice.customer.gstin}</p>}
                  {viewInvoice.customer.phone && <p className="text-xs text-[var(--muted-foreground)]">Phone: {viewInvoice.customer.phone}</p>}
                </div>
                {viewInvoice.billingAddressSnapshot && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Bill To</p>
                    <p className="text-sm">{viewInvoice.billingAddressSnapshot}</p>
                  </div>
                )}
                {viewInvoice.shippingAddressSnapshot &&
                  viewInvoice.shippingAddressSnapshot !== viewInvoice.billingAddressSnapshot && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Ship To</p>
                      <p className="text-sm">{viewInvoice.shippingAddressSnapshot}</p>
                    </div>
                  )}
                {viewInvoice.deliveryEnabled && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                      Delivery
                    </p>
                    <p className="text-sm">
                      {viewInvoice.deliveryMode || "-"}
                      {viewInvoice.deliveryReference
                        ? ` · ${viewInvoice.deliveryReference}`
                        : ""}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="p-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                    <th className="text-left py-2 font-medium">#</th>
                    <th className="text-left py-2 font-medium">Description</th>
                    <th className="text-right py-2 font-medium">Qty</th>
                    <th className="text-right py-2 font-medium">Rate</th>
                    <th className="text-right py-2 font-medium">GST %</th>
                    <th className="text-right py-2 font-medium">GST Amt</th>
                    <th className="text-right py-2 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {viewInvoice.items.map((item, i) => (
                    <tr key={i} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-2 text-[var(--muted-foreground)]">{i + 1}</td>
                      <td className="py-2">{item.description}</td>
                      <td className="py-2 text-right">{item.quantity}</td>
                      <td className="py-2 text-right">{fmt(item.rate)}</td>
                      <td className="py-2 text-right">{item.gstPercent}%</td>
                      <td className="py-2 text-right">{fmt(item.gstAmount)}</td>
                      <td className="py-2 text-right font-medium">{fmt(item.amount + item.gstAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {viewInvoice.additionalCharges && viewInvoice.additionalCharges.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Other Charges
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                        <th className="text-left py-2 font-medium">#</th>
                        <th className="text-left py-2 font-medium">Particulars</th>
                        <th className="text-left py-2 font-medium">HSN/SAC</th>
                        <th className="text-right py-2 font-medium">Amount</th>
                        <th className="text-right py-2 font-medium">Disc</th>
                        <th className="text-right py-2 font-medium">GST %</th>
                        <th className="text-right py-2 font-medium">GST Amt</th>
                        <th className="text-right py-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewInvoice.additionalCharges.map((c, i) => {
                        const disc = c.discountAmount ?? 0;
                        const taxable = Math.max(c.amount - disc, 0);
                        return (
                          <tr key={i} className="border-b border-[var(--border)] last:border-0">
                            <td className="py-2 text-[var(--muted-foreground)]">{i + 1}</td>
                            <td className="py-2">{c.name}</td>
                            <td className="py-2">{c.hsnSac || "—"}</td>
                            <td className="py-2 text-right">{fmt(c.amount)}</td>
                            <td className="py-2 text-right">{disc > 0 ? `-${fmt(disc)}` : "—"}</td>
                            <td className="py-2 text-right">{c.gstPercent}%</td>
                            <td className="py-2 text-right">{fmt(c.gstAmount)}</td>
                            <td className="py-2 text-right font-medium">{fmt(taxable + c.gstAmount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 pb-6 space-y-1 border-t border-[var(--border)] pt-4">
              <div className="flex justify-between text-sm"><span className="text-[var(--muted-foreground)]">Subtotal</span><span>{fmt(viewInvoice.subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[var(--muted-foreground)]">Tax (GST)</span><span>{fmt(viewInvoice.taxAmount)}</span></div>
              {(viewInvoice.discountAmount ?? 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted-foreground)]">
                    Discount{(viewInvoice.discountPercent ?? 0) > 0 ? ` (${(viewInvoice.discountPercent ?? 0).toFixed(2).replace(/\.00$/, "")}%)` : ""}
                  </span>
                  <span className="text-green-700">-{fmt(viewInvoice.discountAmount ?? 0)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-[var(--border)] pt-2 mt-2"><span>Total</span><span>{fmt(viewInvoice.totalAmount)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[var(--muted-foreground)]">Paid</span><span className="text-green-600">{fmt(viewInvoice.paidAmount)}</span></div>
              {viewInvoice.totalAmount - viewInvoice.paidAmount > 0 && (
                <div className="flex justify-between text-sm font-medium"><span className="text-[var(--muted-foreground)]">Balance Due</span><span className="text-red-600">{fmt(viewInvoice.totalAmount - viewInvoice.paidAmount)}</span></div>
              )}
              {viewInvoice.notes && <p className="text-xs text-[var(--muted-foreground)] pt-2">Notes: {viewInvoice.notes}</p>}
            </div>
          </div>
        </div>
      )}

      {pickerOpen && customerId && selectedCustomer && (
        <AddressPickerModal
          customerId={customerId}
          customerName={selectedCustomer.name}
          selectedAddressId={
            pickerOpen === "billing"
              ? billingAddr?.id ?? null
              : shippingAddr?.id ?? null
          }
          onSelect={(addr) => {
            if (pickerOpen === "billing") setBillingAddr(addr);
            else if (pickerOpen === "shipping") setShippingAddr(addr);
          }}
          onClose={() => {
            setPickerOpen(null);
            // Refresh customers so newly created/edited addresses propagate.
            load();
          }}
        />
      )}

      {showChargesModal && (
        <AdditionalChargesModal
          initial={additionalCharges}
          onSave={(charges) => setAdditionalCharges(charges)}
          onClose={() => setShowChargesModal(false)}
        />
      )}
    </div>
  );
}
