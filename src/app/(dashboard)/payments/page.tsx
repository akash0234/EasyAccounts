"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Customer { id: string; name: string; }
interface Vendor { id: string; name: string; }
interface Invoice { id: string; invoiceNumber: string; totalAmount: number; paidAmount: number; status: string; customerId?: string | null; vendorId?: string | null; }
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
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"RECEIVED" | "MADE">("RECEIVED");

  // Form state
  const [paymentType, setPaymentType] = useState<"RECEIVED" | "MADE">("RECEIVED");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<"CASH" | "BANK" | "UPI" | "CHEQUE">("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [allocations, setAllocations] = useState<{ invoiceId: string; amount: number }[]>([]);
  const [isAdvance, setIsAdvance] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [advanceSummary, setAdvanceSummary] = useState<AdvanceSummary>({ totalAvailable: 0, advances: [] });

  const allocatedTotal = allocations.reduce((sum, a) => sum + a.amount, 0);
  const isPureAdvance = isAdvance && unpaidInvoices.length === 0;

  // Greedy smallest-first advance deduction
  const computedAdvance = useMemo(() => {
    if (!isAdvance || allocatedTotal <= 0 || advanceSummary.advances.length === 0) {
      return { advanceAllocations: [] as { paymentId: string; invoiceId: string; amount: number }[], totalAdvanceUsed: 0, advanceUsage: [] as { paymentId: string; paymentNumber: string; availableBalance: number; used: number }[] };
    }

    const sorted = [...advanceSummary.advances].sort((a, b) => a.availableBalance - b.availableBalance);
    const advAllocations: { paymentId: string; invoiceId: string; amount: number }[] = [];
    const advUsage: { paymentId: string; paymentNumber: string; availableBalance: number; used: number }[] = [];
    let remaining = allocatedTotal;

    for (const adv of sorted) {
      if (remaining <= 0) break;
      const useFromThis = Math.min(adv.availableBalance, remaining);
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

      const used = useFromThis - advRemaining;
      if (used > 0) {
        advUsage.push({ ...adv, used });
      }
      remaining -= used;
    }

    return {
      advanceAllocations: advAllocations,
      totalAdvanceUsed: advAllocations.reduce((s, a) => s + a.amount, 0),
      advanceUsage: advUsage,
    };
  }, [isAdvance, allocatedTotal, allocations, advanceSummary.advances]);

  const advanceCovered = computedAdvance.totalAdvanceUsed;
  const cashToPay = Math.max(0, allocatedTotal - advanceCovered);
  const effectiveAmount = isPureAdvance ? advanceAmount : cashToPay;

  async function load() {
    const [payRes, custRes, vendRes] = await Promise.all([
      fetch(`/api/payments?type=${tab}`),
      fetch("/api/customers"),
      fetch("/api/vendors"),
    ]);
    const [payData, custData, vendData] = await Promise.all([payRes.json(), custRes.json(), vendRes.json()]);
    if (Array.isArray(payData)) setPayments(payData);
    if (Array.isArray(custData)) setCustomers(custData);
    if (Array.isArray(vendData)) setVendors(vendData);
  }

  useEffect(() => {
    let cancelled = false;

    async function initializePayments() {
      const [payRes, custRes, vendRes] = await Promise.all([
        fetch(`/api/payments?type=${tab}`),
        fetch("/api/customers"),
        fetch("/api/vendors"),
      ]);
      const [payData, custData, vendData] = await Promise.all([
        payRes.json(),
        custRes.json(),
        vendRes.json(),
      ]);

      if (cancelled) {
        return;
      }
      if (Array.isArray(payData)) setPayments(payData);
      if (Array.isArray(custData)) setCustomers(custData);
      if (Array.isArray(vendData)) setVendors(vendData);
    }

    void initializePayments();

    return () => {
      cancelled = true;
    };
  }, [tab]);

  async function loadUnpaidInvoices(partyId: string, invoiceType: "SALES" | "PURCHASE") {
    const payType = invoiceType === "SALES" ? "RECEIVED" : "MADE";
    const [invRes, payRes] = await Promise.all([
      fetch(`/api/invoices?type=${invoiceType}`),
      fetch(`/api/payments?type=${payType}`),
    ]);
    const [invData, payData] = await Promise.all([invRes.json(), payRes.json()]);

    if (Array.isArray(invData)) {
      const partyField = invoiceType === "SALES" ? "customerId" : "vendorId";
      const unpaid = invData.filter((i: Invoice) => i.status !== "PAID" && i[partyField] === partyId);
      setUnpaidInvoices(unpaid);

      // For PURCHASE (PM), auto-fill full due amount for every bill
      if (invoiceType === "PURCHASE") {
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
    } else {
      setAdvanceSummary({ totalAvailable: 0, advances: [] });
    }

  }

  function resetForm() {
    setShowForm(false);
    setAllocations([]);
    setAdvanceSummary({ totalAvailable: 0, advances: [] });
    setAdvanceAmount(0);
    setIsAdvance(false);
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
    if (computedAdvance.advanceAllocations.length > 0) {
      payload.advanceAllocations = computedAdvance.advanceAllocations;
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

      {showForm && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Record {paymentType === "RECEIVED" ? "Payment Received" : "Payment Made"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={resetForm}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {paymentType === "RECEIVED" ? (
                  <div>
                    <Label>Customer *</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={customerId} onChange={(e) => { setCustomerId(e.target.value); if (e.target.value) loadUnpaidInvoices(e.target.value, "SALES"); else { setUnpaidInvoices([]); setAllocations([]); } }} required>
                      <option value="">Select customer</option>
                      {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <Label>Vendor *</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={vendorId} onChange={(e) => { setVendorId(e.target.value); if (e.target.value) loadUnpaidInvoices(e.target.value, "PURCHASE"); else { setUnpaidInvoices([]); setAllocations([]); } }} required>
                      <option value="">Select vendor</option>
                      {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                )}
                <div><Label>Date *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
                <div>
                  <Label>Method</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                {paymentType === "MADE" && (unpaidInvoices.length === 0 || advanceSummary.advances.length > 0) && (
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer h-9">
                      <input type="checkbox" checked={isAdvance} onChange={(e) => {
                        setIsAdvance(e.target.checked);
                        setAdvanceAmount(0);
                        // Re-fill allocations when toggling back
                        if (!e.target.checked && unpaidInvoices.length > 0) {
                          setAllocations(unpaidInvoices.map((inv) => ({
                            invoiceId: inv.id,
                            amount: inv.totalAmount - inv.paidAmount,
                          })));
                        }
                      }} />
                      <span className="text-sm font-medium">
                        {unpaidInvoices.length > 0 ? "Use Advance" : "Advance Payment"}
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Reference (Cheque No / UPI Ref)</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} /></div>
                <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              </div>

              {/* ── PAYMENT MADE: bills + advance side-by-side ── */}
              {paymentType === "MADE" && (
                <>
                  {isAdvance && unpaidInvoices.length === 0 ? (
                    /* Pure advance — no bills to pay */
                    <div className="max-w-xs">
                      <Label>Advance Amount *</Label>
                      <Input type="number" value={advanceAmount || ""} onChange={(e) => setAdvanceAmount(Number(e.target.value))} min={0.01} step={0.01} required />
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
                                <span className="w-24 text-muted-foreground">Total: {fmt(inv.totalAmount)}</span>
                                <span className="w-24 font-medium text-red-600">Due: {fmt(balance)}</span>
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
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* RIGHT: Advance Payments List */}
                      <div className="rubick-panel-muted">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-slate-800">Advance Payments</div>
                          {advanceSummary.totalAvailable > 0 && (
                            <div className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                              {fmt(advanceSummary.totalAvailable)} available
                            </div>
                          )}
                        </div>

                        {advanceSummary.advances.length > 0 ? (
                          <div className="mt-3 rubick-list">
                            {advanceSummary.advances.map((adv) => (
                              <div key={adv.paymentId} className="rubick-list-item">
                                <div className="flex-1">
                                  <div className="font-medium text-slate-800 text-sm">{adv.paymentNumber}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold text-emerald-700">{fmt(adv.availableBalance)}</div>
                                </div>
                              </div>
                            ))}
                            <div className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800">
                              <span>Total Available</span>
                              <span>{fmt(advanceSummary.totalAvailable)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
                            No advance balance for this vendor.
                          </div>
                        )}

                        {/* Auto-computed advance deduction — shown when checkbox is ON */}
                        {isAdvance && computedAdvance.advanceUsage.length > 0 && (
                          <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                            <div className="text-sm font-medium text-emerald-800">Advance Deduction</div>
                            {computedAdvance.advanceUsage.map((u) => (
                              <div key={u.paymentId} className="flex justify-between text-sm">
                                <span className="text-slate-700">{u.paymentNumber}</span>
                                <span className="font-medium text-emerald-700">&minus;{fmt(u.used)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-sm font-semibold border-t border-emerald-200 pt-2">
                              <span>Total Deducted</span>
                              <span className="text-emerald-700">{fmt(computedAdvance.totalAdvanceUsed)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : vendorId ? (
                    <p className="text-sm text-muted-foreground">No outstanding bills. Use &quot;Advance Payment&quot; to record without allocation.</p>
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
                            <div key={inv.id} className="flex items-center gap-4 text-sm">
                              <span className="w-36 font-medium">{inv.invoiceNumber}</span>
                              <span className="w-28 text-muted-foreground">Total: {fmt(inv.totalAmount)}</span>
                              <span className="w-28 text-muted-foreground">Paid: {fmt(inv.paidAmount)}</span>
                              <span className="w-28 font-medium text-red-600">Due: {fmt(balance)}</span>
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

              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  {!isPureAdvance && allocatedTotal > 0 && (
                    <div className="text-sm text-muted-foreground mb-1">
                      Bill Total: {fmt(allocatedTotal)}
                      {advanceCovered > 0 && <> &minus; Advance: {fmt(advanceCovered)}</>}
                    </div>
                  )}
                  <div className="text-lg font-bold">
                    {isPureAdvance ? "Advance" : "Cash to Pay"}: {fmt(effectiveAmount)}
                  </div>
                </div>
                <Button type="submit" disabled={loading || (isPureAdvance ? advanceAmount <= 0 : allocatedTotal <= 0)}>
                  {loading ? "Saving..." : "Record Payment"}
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
        </CardContent>
      </Card>
    </div>
  );
}
