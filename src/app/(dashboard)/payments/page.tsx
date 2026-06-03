"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { SideDrawer } from "@/components/ui/side-drawer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InvoiceDetailModal } from "@/components/invoices/invoice-detail-modal";
import { SimpleSelect } from "@/components/ui/simple-select";

interface Customer { id: string; name: string; }
interface Vendor { id: string; name: string; }
interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  gstPercent: number;
  gstAmount: number;
  amount: number;
}
interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate?: string | null;
  totalAmount: number;
  paidAmount: number;
  subtotal?: number;
  taxAmount?: number;
  status: string;
  notes?: string | null;
  customerId?: string | null;
  vendorId?: string | null;
  customer?: { name: string; gstin?: string | null; phone?: string | null; billingAddress?: string | null; city?: string | null } | null;
  vendor?: { name: string; gstin?: string | null; phone?: string | null; address?: string | null; city?: string | null } | null;
  facility?: { name: string; address?: string | null } | null;
  items?: InvoiceItem[];
}
interface PaymentAllocation { invoiceId: string; amount: number; }
interface Payment {
  id: string; paymentNumber: string; date: string; amount: number;
  method: string; type: string; reference: string | null;
  customerId?: string | null; vendorId?: string | null;
  customer?: { name: string } | null; vendor?: { name: string } | null;
  allocations?: PaymentAllocation[];
}
interface AdvanceInfo { paymentId: string; paymentNumber: string; availableBalance: number; }
type AdvanceSummary = { totalAvailable: number; advances: AdvanceInfo[] };

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [tab, setTab] = useState<"RECEIVED" | "MADE">("RECEIVED");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterPartyId, setFilterPartyId] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Form state
  const [paymentType, setPaymentType] = useState<"RECEIVED" | "MADE">("RECEIVED");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<"CASH" | "BANK" | "UPI" | "CHEQUE">("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [allocations, setAllocations] = useState<{ invoiceId: string; amount: number }[]>([]);
  const [paymentMode, setPaymentMode] = useState<"BILLS" | "ADVANCE">("BILLS");
  const [useAdvancePayments, setUseAdvancePayments] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [advanceSummary, setAdvanceSummary] = useState<AdvanceSummary>({ totalAvailable: 0, advances: [] });
  const [advanceUsage, setAdvanceUsage] = useState<Record<string, number>>({});

  const allocatedTotal = allocations.reduce((sum, a) => sum + a.amount, 0);
  const isAdvanceMode = paymentMode === "ADVANCE";
  const isPureAdvance = isAdvanceMode;

  const autoAdvanceUsage = useMemo(() => {
    if (!useAdvancePayments || isAdvanceMode || allocatedTotal <= 0 || advanceSummary.advances.length === 0) {
      return {} as Record<string, number>;
    }

    const result: Record<string, number> = {};
    const sorted = [...advanceSummary.advances].sort((a, b) => a.availableBalance - b.availableBalance);
    let remaining = allocatedTotal;

    for (const adv of sorted) {
      if (remaining <= 0.005) break;
      const useFromThis = Math.min(adv.availableBalance, remaining);
      if (useFromThis > 0) {
        result[adv.paymentId] = Math.round(useFromThis * 100) / 100;
        remaining -= useFromThis;
      }
    }

    return result;
  }, [allocatedTotal, advanceSummary.advances, isAdvanceMode, useAdvancePayments]);

  const effectiveAdvanceUsage = useMemo(() => {
    if (!useAdvancePayments || isAdvanceMode) {
      return {} as Record<string, number>;
    }

    const merged: Record<string, number> = {};
    for (const adv of advanceSummary.advances) {
      const override = advanceUsage[adv.paymentId];
      const auto = autoAdvanceUsage[adv.paymentId] ?? 0;
      const chosen = Number.isFinite(override)
        ? Math.max(0, Math.min(override ?? 0, adv.availableBalance))
        : auto;
      if (chosen > 0) {
        merged[adv.paymentId] = Math.round(chosen * 100) / 100;
      }
    }
    return merged;
  }, [advanceUsage, advanceSummary.advances, autoAdvanceUsage, isAdvanceMode, useAdvancePayments]);

  const selectedAdvanceTotal = useMemo(
    () =>
      Object.values(effectiveAdvanceUsage).reduce((sum, amount) => sum + amount, 0),
    [effectiveAdvanceUsage]
  );
  const cashToPay = Math.max(0, allocatedTotal - selectedAdvanceTotal);
  const effectiveAmount = isPureAdvance ? advanceAmount : cashToPay;
  const advanceAllocations = useMemo(() => {
    if (!useAdvancePayments || isAdvanceMode || allocatedTotal <= 0 || selectedAdvanceTotal <= 0) {
      return [] as { paymentId: string; invoiceId: string; amount: number }[];
    }

    const advAllocations: { paymentId: string; invoiceId: string; amount: number }[] = [];
    let remainingAdvance = selectedAdvanceTotal;
    const sortedAdvances = [...advanceSummary.advances].sort((a, b) => a.availableBalance - b.availableBalance);

    for (const adv of sortedAdvances) {
      if (remainingAdvance <= 0.005) break;

      const requested = Math.min(Math.max(0, effectiveAdvanceUsage[adv.paymentId] || 0), adv.availableBalance);
      const useFromThis = Math.min(requested, remainingAdvance);
      let advRemaining = useFromThis;

      for (const alloc of allocations) {
        if (advRemaining <= 0.005) break;
        if (alloc.amount <= 0) continue;

        const alreadyCovered = advAllocations
          .filter((aa) => aa.invoiceId === alloc.invoiceId)
          .reduce((s, aa) => s + aa.amount, 0);
        const billRemaining = alloc.amount - alreadyCovered;
        if (billRemaining <= 0.005) continue;

        const cover = Math.round(Math.min(advRemaining, billRemaining) * 100) / 100;
        advAllocations.push({ paymentId: adv.paymentId, invoiceId: alloc.invoiceId, amount: cover });
        advRemaining -= cover;
      }

      remainingAdvance -= useFromThis - advRemaining;
    }

    return advAllocations;
  }, [advanceSummary.advances, allocatedTotal, allocations, effectiveAdvanceUsage, isAdvanceMode, selectedAdvanceTotal, useAdvancePayments]);

  const advanceError = paymentMode === "BILLS" && useAdvancePayments && selectedAdvanceTotal > allocatedTotal + 0.01
    ? "Advance used cannot exceed the bill total."
    : null;

  async function loadPayments(nextPage = page) {
    setListLoading(true);
    const params = new URLSearchParams({
      type: tab,
      page: String(nextPage),
      pageSize: String(pageSize),
    });
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    if (filterMethod) params.set("method", filterMethod);
    if (filterPartyId) {
      params.set(tab === "RECEIVED" ? "customerId" : "vendorId", filterPartyId);
    }
    if (minAmount) params.set("minAmount", minAmount);
    if (maxAmount) params.set("maxAmount", maxAmount);

    const payRes = await fetch(`/api/payments?${params.toString()}`);
    const payData = await payRes.json();
    if (Array.isArray(payData)) {
      setPayments(payData);
      setTotal(payData.length);
    } else {
      setPayments(payData.data ?? []);
      setTotal(payData.pagination?.total ?? 0);
    }
    setListLoading(false);
  }

  async function loadReferenceData() {
    const [custRes, vendRes] = await Promise.all([
      fetch("/api/customers"),
      fetch("/api/vendors"),
    ]);
    const [custData, vendData] = await Promise.all([custRes.json(), vendRes.json()]);
    if (Array.isArray(custData)) setCustomers(custData);
    if (Array.isArray(vendData)) setVendors(vendData);
  }

  async function load() {
    await Promise.all([loadPayments(), loadReferenceData()]);
  }

  useEffect(() => {
    let cancelled = false;

    async function initializePayments() {
      const [custRes, vendRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/vendors"),
      ]);
      const [custData, vendData] = await Promise.all([
        custRes.json(),
        vendRes.json(),
      ]);

      if (cancelled) {
        return;
      }
      if (Array.isArray(custData)) setCustomers(custData);
      if (Array.isArray(vendData)) setVendors(vendData);
    }

    void initializePayments();

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
    setFilterPartyId("");
  }, [tab]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterFrom, filterTo, filterMethod, filterPartyId, minAmount, maxAmount, pageSize]);

  useEffect(() => {
    void loadPayments(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, pageSize, debouncedSearch, filterFrom, filterTo, filterMethod, filterPartyId, minAmount, maxAmount]);

  async function loadUnpaidInvoices(partyId: string, invoiceType: "SALES" | "PURCHASE") {
    const payType = invoiceType === "SALES" ? "RECEIVED" : "MADE";
    const [invRes, payRes] = await Promise.all([
      fetch(`/api/invoices?type=${invoiceType}`),
      fetch(`/api/payments?type=${payType}`),
    ]);
    const [invData, payData] = await Promise.all([invRes.json(), payRes.json()]);

    if (Array.isArray(invData)) {
      const partyField = invoiceType === "SALES" ? "customerId" : "vendorId";
      const unpaid = invData.filter(
        (i: Invoice) => (i.status === "UNPAID" || i.status === "PARTIAL") && i[partyField] === partyId
      );
      setUnpaidInvoices(unpaid);

      // For PURCHASE (PM), auto-fill full due amount for every bill when we are in bill mode.
      if (invoiceType === "PURCHASE" && paymentMode === "BILLS") {
        setAllocations(unpaid.map((inv: Invoice) => ({
          invoiceId: inv.id,
          amount: inv.totalAmount - inv.paidAmount,
        })));
      } else {
        setAllocations([]);
      }
    }

    // Find advances (payments with unallocated balance) for this party — only for PM
    if (invoiceType === "PURCHASE" && Array.isArray(payData)) {
      const advances: AdvanceInfo[] = [];
      for (const p of payData as Payment[]) {
        if (p.vendorId !== partyId) continue;
        const allocSum = (p.allocations || []).reduce((s: number, a: PaymentAllocation) => s + a.amount, 0);
        const unallocated = p.amount - allocSum;
        if (unallocated > 0.01) {
          advances.push({ paymentId: p.id, paymentNumber: p.paymentNumber, availableBalance: unallocated });
        }
      }
      const totalAvailable = advances.reduce((s, a) => s + a.availableBalance, 0);
      setAdvanceSummary({ totalAvailable, advances });
      setAdvanceUsage({});
      setUseAdvancePayments(false);
    } else {
      setAdvanceSummary({ totalAvailable: 0, advances: [] });
      setAdvanceUsage({});
      setUseAdvancePayments(false);
    }

  }

  function resetForm() {
    setShowForm(false);
    setAllocations([]);
    setAdvanceSummary({ totalAvailable: 0, advances: [] });
    setAdvanceUsage({});
    setUseAdvancePayments(false);
    setAdvanceAmount(0);
    setPaymentMode("BILLS");
    setReference("");
    setNotes("");
    setCustomerId("");
    setVendorId("");
    setUnpaidInvoices([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPureAdvance && advanceAmount <= 0) return;
    if (!isPureAdvance && allocatedTotal <= 0) return;

    setLoading(true);

    const payload: Record<string, unknown> = {
      type: paymentType, date, amount: effectiveAmount, method, reference, notes,
      customerId: paymentType === "RECEIVED" ? customerId : undefined,
      vendorId: paymentType === "MADE" ? vendorId : undefined,
      allocations: isPureAdvance ? [] : allocations.filter((a) => a.amount > 0),
    };
    if (advanceAllocations.length > 0) {
      payload.advanceAllocations = advanceAllocations;
    }
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (res.ok) {
      resetForm();
      load();
    }
  }

  const fmt = (n: number) => n.toLocaleString("en-IN", { style: "currency", currency: "INR" });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Payments</h2>
        <Button onClick={() => { setPaymentType(tab); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Record Payment
        </Button>
      </div>

      <div className="flex gap-2 mb-4">
        <Button variant={tab === "RECEIVED" ? "default" : "outline"} onClick={() => setTab("RECEIVED")}>Received</Button>
        <Button variant={tab === "MADE" ? "default" : "outline"} onClick={() => setTab("MADE")}>Made</Button>
      </div>

      <SideDrawer
        open={showForm}
        title={`Record ${paymentType === "RECEIVED" ? "Payment Received" : "Payment Made"}`}
        onClose={resetForm}
        closeOnOverlayClick={false}
        widthClassName="w-[880px] max-w-[100vw]"
      >
        <form onSubmit={handleSubmit} className="min-h-full flex flex-col justify-between gap-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-0 gap-x-4">
            {paymentType === "RECEIVED" ? (
              <div>
                <Label>Customer *</Label>
                <SimpleSelect
                  value={customerId}
                  onChange={(v) => { setCustomerId(v); if (v) loadUnpaidInvoices(v, "SALES"); else { setUnpaidInvoices([]); setAllocations([]); } }}
                  placeholder="Select customer"
                  options={[{ value: "", label: "Select customer" }, ...customers.map((c) => ({ value: c.id, label: c.name }))]}
                />
              </div>
            ) : (
              <div>
                <Label>Vendor *</Label>
                <SimpleSelect
                  value={vendorId}
                  onChange={(v) => { setVendorId(v); if (v) loadUnpaidInvoices(v, "PURCHASE"); else { setUnpaidInvoices([]); setAllocations([]); } }}
                  placeholder="Select vendor"
                  options={[{ value: "", label: "Select vendor" }, ...vendors.map((v) => ({ value: v.id, label: v.name }))]}
                />
              </div>
            )}
            <div><Label>Date *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
            <div className="mt-2">
              <Label>Method</Label>
              <SimpleSelect
                value={method}
                onChange={(v) => setMethod(v as typeof method)}
                options={[
                  { value: "CASH", label: "Cash" },
                  { value: "BANK", label: "Bank Transfer" },
                  { value: "UPI", label: "UPI" },
                  { value: "CHEQUE", label: "Cheque" },
                ]}
              />
            </div>
            {paymentType === "MADE" && (
              <div className="w-full mt-2">
                <Label >Payment For</Label>
                <div className="grid grid-cols-2 w-full rounded-md border border-input bg-white p-0.5 shadow-sm">
                  <button
                    type="button"
                    className={`h-[30px] w-full rounded-md px-3 text-sm font-medium transition ${paymentMode === "BILLS"
                      ? "bg-rubick-primary text-white"
                      : "text-slate-700 hover:bg-slate-100"
                      }`}
                    onClick={() => {
                      setPaymentMode("BILLS");
                      setAdvanceAmount(0);
                      setAdvanceUsage({});
                      setUseAdvancePayments(false);
                      if (unpaidInvoices.length > 0) {
                        setAllocations(unpaidInvoices.map((inv) => ({
                          invoiceId: inv.id,
                          amount: inv.totalAmount - inv.paidAmount,
                        })));
                      }
                    }}
                  >
                    Pay Bills
                  </button>
                  <button
                    type="button"
                    className={`h-[30px]  w-full rounded-md px-3 text-sm font-medium transition ${paymentMode === "ADVANCE"
                      ? "bg-rubick-primary text-white"
                      : "text-slate-700 hover:bg-slate-100"
                      }`}
                    onClick={() => {
                      setPaymentMode("ADVANCE");
                      setAdvanceAmount(0);
                      setAdvanceUsage({});
                      setUseAdvancePayments(false);
                      setAllocations([]);
                    }}
                  >
                    Advance Payment
                  </button>
                </div>
              </div>
            )}
            <div className="mt-2">
              <Label>Reference (Cheque No / UPI Ref)</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <div className="mt-2">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>


          </div>


          {/* ── PAYMENT MADE: bills + advance side-by-side ── */}
          {paymentType === "MADE" && (
            <>
              {paymentMode === "ADVANCE" ? (
                <div className="max-w-xs">
                  <Label>Advance Amount *</Label>
                  <Input
                    type="number"
                    value={advanceAmount || ""}
                    onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                    min={0.01}
                    step={0.01}
                    required
                  />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Record a new advance payment without showing payable bills.
                  </p>
                </div>
              ) : unpaidInvoices.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* LEFT: Bills */}
                  <div className="lg:col-span-2">
                    <Label className="mb-2 block">Bills</Label>
                    <div className="space-y-2">
                      {unpaidInvoices.map((inv) => {
                        const balance = inv.totalAmount - inv.paidAmount;
                        const existing = allocations.find((a) => a.invoiceId === inv.id);
                        return (
                          <div key={inv.id} className="flex items-center gap-3 text-sm">
                            <span className="w-32 font-medium truncate">{inv.invoiceNumber}</span>
                            <span className="w-30 text-muted-foreground flex">Total: <span>{fmt(inv.totalAmount)}</span></span>
                            <span className="w-30 font-medium text-red-600 flex">Due: <span>{fmt(balance)}</span></span>
                            <Input
                              type="number"
                              className="w-28"
                              value={existing?.amount || ""}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setAllocations((prev) => {
                                  const without = prev.filter((a) => a.invoiceId !== inv.id);
                                  return val > 0 ? [...without, { invoiceId: inv.id, amount: val }] : without;
                                });
                              }}
                              max={balance}
                              min={0}
                              step={0.01}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setAllocations((prev) => {
                                  const without = prev.filter((a) => a.invoiceId !== inv.id);
                                  return [...without, { invoiceId: inv.id, amount: balance }];
                                });
                              }}
                            >
                              Full
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewInvoice(inv)}
                              title="View invoice"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* RIGHT: Advance Payments List */}
                  <div className="rubick-panel-muted">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={useAdvancePayments}
                          onChange={(e) => {
                            setUseAdvancePayments(e.target.checked);
                            if (!e.target.checked) {
                              setAdvanceUsage({});
                            }
                          }}
                        />
                        <span>Use Advance Payment</span>
                      </label>
                      {advanceSummary.totalAvailable > 0 && (
                        <div className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          {fmt(advanceSummary.totalAvailable)} available
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-800">Advance Payments</div>

                    {advanceSummary.advances.length > 0 ? (
                      <div className="mt-3 rubick-list">
                        {advanceSummary.advances.map((adv) => (
                          <div key={adv.paymentId} className="rubick-list-item">
                            <div className="flex-1">
                              <div className="font-medium text-slate-800 text-sm">{adv.paymentNumber}</div>
                              <div className="text-xs text-slate-500">
                                Available: {fmt(adv.availableBalance)}
                              </div>
                            </div>
                            {useAdvancePayments ? (
                              <div className="w-32 text-right">
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  max={Math.max(0, Math.min(
                                    adv.availableBalance,
                                    allocatedTotal - (selectedAdvanceTotal - (effectiveAdvanceUsage[adv.paymentId] || 0))
                                  ))}
                                  value={effectiveAdvanceUsage[adv.paymentId] ?? ""}
                                  onChange={(e) => {
                                    const next = Number(e.target.value);
                                    const current = effectiveAdvanceUsage[adv.paymentId] || 0;
                                    const otherSelected = selectedAdvanceTotal - current;
                                    const maxForRow = Math.max(
                                      0,
                                      Math.min(adv.availableBalance, allocatedTotal - otherSelected)
                                    );
                                    const clamped = Number.isFinite(next)
                                      ? Math.max(0, Math.min(next, maxForRow))
                                      : 0;
                                    setAdvanceUsage((prev) => ({
                                      ...prev,
                                      [adv.paymentId]: clamped,
                                    }));
                                  }}
                                  placeholder="Use"
                                  disabled={allocatedTotal <= 0}
                                />
                              </div>
                            ) : (
                              <div className="text-right text-sm font-semibold text-emerald-700">
                                {fmt(adv.availableBalance)}
                              </div>
                            )}
                          </div>
                        ))}
                        <div className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800">
                          <span>Selected Advance</span>
                          <span>{fmt(selectedAdvanceTotal)}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">
                          <span>Advance Applied</span>
                          <span>{fmt(selectedAdvanceTotal)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
                        No advance balance for this vendor.
                      </div>
                    )}

                    {useAdvancePayments && advanceAllocations.length > 0 && (
                      <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                        <div className="text-sm font-medium text-emerald-800">Advance Deduction</div>
                        {advanceSummary.advances.map((adv) => {
                          const used = advanceAllocations
                            .filter((a) => a.paymentId === adv.paymentId)
                            .reduce((sum, a) => sum + a.amount, 0);
                          if (used <= 0) return null;
                          return (
                            <div key={adv.paymentId} className="flex justify-between text-sm">
                              <span className="text-slate-700">{adv.paymentNumber}</span>
                              <span className="font-medium text-emerald-700">&minus;{fmt(used)}</span>
                            </div>
                          );
                        })}
                        <div className="flex justify-between text-sm font-semibold border-t border-emerald-200 pt-2">
                          <span>Total Deducted</span>
                          <span className="text-emerald-700">{fmt(selectedAdvanceTotal)}</span>
                        </div>
                      </div>
                    )}
                    {advanceError && (
                      <p className="mt-2 text-sm text-red-600">{advanceError}</p>
                    )}
                  </div>
                </div>
              ) : vendorId ? (
                <p className="text-sm text-muted-foreground">No outstanding bills. Switch to &quot;Advance Payment&quot; to record a new advance.</p>
              ) : null}
            </>
          )}

          {/* ── PAYMENT RECEIVED: simple allocation (no advance) ── */}
          {paymentType === "RECEIVED" && (
            <>
              {unpaidInvoices.length > 0 && (
                <div>
                  <Label className="mb-2 block">Allocate Against Invoices</Label>
                  <div className="space-y-2">
                    {unpaidInvoices.map((inv) => {
                      const balance = inv.totalAmount - inv.paidAmount;
                      const existing = allocations.find((a) => a.invoiceId === inv.id);
                      return (
                        <div key={inv.id} className="flex items-center justify-between gap-4 text-sm w-full">
                          <span className="w-full border border-slate-200 p-2 rounded font-medium">{inv.invoiceNumber}</span>
                          <span className="w-full border border-slate-200 p-2 rounded text-muted-foreground whitespace-nowrap">Total: {fmt(inv.totalAmount)}</span>
                          <span className="w-full border border-slate-200 p-2 rounded text-muted-foreground whitespace-nowrap">Paid: {fmt(inv.paidAmount)}</span>
                          <span className="w-full border border-slate-200 p-2 rounded font-medium text-red-600 whitespace-nowrap">Due: {fmt(balance)}</span>
                          <Input
                            type="number"
                            className="w-32"
                            placeholder="Allocate"
                            value={existing?.amount || ""}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setAllocations((prev) => {
                                const without = prev.filter((a) => a.invoiceId !== inv.id);
                                return val > 0 ? [...without, { invoiceId: inv.id, amount: val }] : without;
                              });
                            }}
                            max={balance}
                            min={0}
                            step={0.01}
                          />
                          <Button type="button" variant="outline" size="sm" onClick={() => {
                            setAllocations((prev) => {
                              const without = prev.filter((a) => a.invoiceId !== inv.id);
                              return [...without, { invoiceId: inv.id, amount: balance }];
                            });
                          }}>Full</Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {unpaidInvoices.length === 0 && customerId && (
                <p className="text-sm text-muted-foreground">No outstanding invoices for this customer.</p>
              )}
            </>
          )}

          <div className="sticky bottom-0 -mx-4 -mb-4 border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 flex items-center justify-between gap-2">
            <div>
              {!isPureAdvance && allocatedTotal > 0 && (
                <div className="text-sm text-muted-foreground mb-1">
                  Bill Total: {fmt(allocatedTotal)}
                  {selectedAdvanceTotal > 0 && <> &minus; Advance: {fmt(selectedAdvanceTotal)}</>}
                </div>
              )}
              <div className="text-lg font-bold">
                {isPureAdvance ? "Advance" : "Cash to Pay"}: {fmt(effectiveAmount)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              <Button
                type="submit"
                disabled={
                  loading ||
                  (isPureAdvance ? advanceAmount <= 0 : allocatedTotal <= 0) ||
                  !!advanceError
                }
              >
                {loading ? "Saving..." : "Record Payment"}
              </Button>
            </div>
          </div>
        </form>
      </SideDrawer>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-8">
            <div className="xl:col-span-2">
              <Label>Search</Label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Payment #, party, GSTIN, phone, reference"
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
              <Label>Method</Label>
              <SimpleSelect
                value={filterMethod}
                onChange={setFilterMethod}
                placeholder="All"
                options={[
                  { value: "", label: "All" },
                  { value: "CASH", label: "Cash" },
                  { value: "BANK", label: "Bank" },
                  { value: "UPI", label: "UPI" },
                  { value: "CHEQUE", label: "Cheque" },
                ]}
              />
            </div>
            <div>
              <Label>{tab === "RECEIVED" ? "Customer" : "Vendor"}</Label>
              <SimpleSelect
                value={filterPartyId}
                onChange={setFilterPartyId}
                placeholder="All"
                options={[{ value: "", label: "All" }, ...((tab === "RECEIVED" ? customers : vendors).map((p) => ({ value: p.id, label: p.name })))]}
              />
            </div>
            <div>
              <Label>Min amount</Label>
              <Input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
            </div>
            <div>
              <Label>Max amount</Label>
              <Input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
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
                setFilterMethod("");
                setFilterPartyId("");
                setMinAmount("");
                setMaxAmount("");
                setPage(1);
              }}
            >
              Reset filters
            </Button>
            <div className="text-sm text-[var(--muted-foreground)]">
              {listLoading ? "Loading…" : `Showing ${payments.length === 0 ? 0 : (page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="hidden md:block">
            <Table className="min-w-full table-fixed">
            <colgroup>
              <col className="w-[10rem]" />
              <col className="w-[8rem]" />
              <col />
              <col className="w-[10rem]" />
              <col className="w-[8rem]" />
              <col className="w-[12rem]" />
            </colgroup>
            <TableHead>
              <TableRow>
                <TableHeader className="rounded-l-md bg-rubick-primary text-white">
                  Payment #
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-white">
                  Date
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-white">
                  {tab === "RECEIVED" ? "Customer" : "Vendor"}
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-right text-white">
                  Amount
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-white">
                  Method
                </TableHeader>
                <TableHeader className="rounded-r-md bg-rubick-primary text-white">
                  Reference
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="align-middle font-medium">
                    {p.paymentNumber}
                  </TableCell>
                  <TableCell className="whitespace-nowrap align-middle">
                    {new Date(p.date).toLocaleDateString("en-IN")}
                  </TableCell>
                  <TableCell className="align-middle">
                    {p.customer?.name || p.vendor?.name || "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap align-middle text-right font-medium">
                    {fmt(p.amount)}
                  </TableCell>
                  <TableCell className="align-middle">
                    <Badge variant="secondary">{p.method}</Badge>
                  </TableCell>
                  <TableCell className="align-middle text-slate-500">
                    {p.reference || "-"}
                  </TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-slate-400">
                    No payments yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
          </div>

          <div className="md:hidden p-2 space-y-2">
            {payments.map((p) => (
              <details key={p.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
                <summary className="list-none cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{p.paymentNumber}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{new Date(p.date).toLocaleDateString("en-IN")}</div>
                      <div className="text-sm text-slate-700 truncate">{p.customer?.name || p.vendor?.name || "-"}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold">{fmt(p.amount)}</div>
                      <div className="mt-1"><Badge variant="secondary">{p.method}</Badge></div>
                    </div>
                  </div>
                </summary>
                <div className="mt-3 text-sm">
                  <div className="text-[var(--muted-foreground)]">Reference</div>
                  <div className="font-medium text-[var(--foreground)]">{p.reference || "-"}</div>
                </div>
              </details>
            ))}
            {payments.length === 0 && (
              <div className="py-6 text-center text-slate-400">No payments yet</div>
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
        <InvoiceDetailModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
      )}
    </div>
  );
}
