"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X } from "lucide-react";

interface Customer { id: string; name: string; }
interface Vendor { id: string; name: string; }
interface Invoice { id: string; invoiceNumber: string; totalAmount: number; paidAmount: number; status: string; }
interface Payment {
  id: string; paymentNumber: string; date: string; amount: number;
  method: string; type: string; reference: string | null;
  customer?: { name: string } | null; vendor?: { name: string } | null;
}

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
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<"CASH" | "BANK" | "UPI" | "CHEQUE">("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [allocations, setAllocations] = useState<{ invoiceId: string; amount: number }[]>([]);

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

  useEffect(() => { load(); }, [tab]);

  async function loadUnpaidInvoices(partyId: string, type: "SALES" | "PURCHASE") {
    const res = await fetch(`/api/invoices?type=${type}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      setUnpaidInvoices(data.filter((i: Invoice) => i.status !== "PAID"));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: paymentType, date, amount, method, reference, notes,
        customerId: paymentType === "RECEIVED" ? customerId : undefined,
        vendorId: paymentType === "MADE" ? vendorId : undefined,
        allocations: allocations.filter((a) => a.amount > 0),
      }),
    });
    setLoading(false);
    if (res.ok) {
      setShowForm(false);
      setAllocations([]);
      setAmount(0);
      setReference("");
      setNotes("");
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
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {paymentType === "RECEIVED" ? (
                  <div>
                    <Label>Customer *</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={customerId} onChange={(e) => { setCustomerId(e.target.value); if (e.target.value) loadUnpaidInvoices(e.target.value, "SALES"); }} required>
                      <option value="">Select customer</option>
                      {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <Label>Vendor *</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={vendorId} onChange={(e) => { setVendorId(e.target.value); if (e.target.value) loadUnpaidInvoices(e.target.value, "PURCHASE"); }} required>
                      <option value="">Select vendor</option>
                      {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                )}
                <div><Label>Date *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
                <div><Label>Amount *</Label><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} min={0.01} step={0.01} required /></div>
                <div>
                  <Label>Method</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Reference (Cheque No / UPI Ref)</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} /></div>
                <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              </div>

              {unpaidInvoices.length > 0 && (
                <div>
                  <Label className="mb-2 block">Adjust Against Invoices (optional)</Label>
                  <div className="space-y-2">
                    {unpaidInvoices.map((inv) => {
                      const existing = allocations.find((a) => a.invoiceId === inv.id);
                      return (
                        <div key={inv.id} className="flex items-center gap-4 text-sm">
                          <span className="w-32">{inv.invoiceNumber}</span>
                          <span className="w-32">Due: {fmt(inv.totalAmount - inv.paidAmount)}</span>
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
                            max={inv.totalAmount - inv.paidAmount}
                            min={0}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Record Payment"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium">Payment #</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">{tab === "RECEIVED" ? "Customer" : "Vendor"}</th>
                  <th className="text-right p-3 font-medium">Amount</th>
                  <th className="text-left p-3 font-medium">Method</th>
                  <th className="text-left p-3 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{p.paymentNumber}</td>
                    <td className="p-3">{new Date(p.date).toLocaleDateString("en-IN")}</td>
                    <td className="p-3">{p.customer?.name || p.vendor?.name || "-"}</td>
                    <td className="p-3 text-right font-medium">{fmt(p.amount)}</td>
                    <td className="p-3"><span className="text-xs bg-gray-100 px-2 py-1 rounded">{p.method}</span></td>
                    <td className="p-3 text-gray-600">{p.reference || "-"}</td>
                  </tr>
                ))}
                {payments.length === 0 && (<tr><td colSpan={6} className="p-6 text-center text-gray-500">No payments yet</td></tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
