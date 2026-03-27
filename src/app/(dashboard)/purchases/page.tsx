"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, Trash2 } from "lucide-react";

interface Vendor { id: string; name: string; }
interface InvoiceItem { description: string; quantity: number; rate: number; gstPercent: number; }
interface Invoice {
  id: string; invoiceNumber: string; date: string; totalAmount: number;
  paidAmount: number; status: string; vendor?: { name: string } | null;
}

const emptyItem: InvoiceItem = { description: "", quantity: 1, rate: 0, gstPercent: 0 };

export default function PurchasesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vendorId, setVendorId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([{ ...emptyItem }]);

  async function load() {
    const [invRes, vendRes] = await Promise.all([
      fetch("/api/invoices?type=PURCHASE"),
      fetch("/api/vendors"),
    ]);
    const [invData, vendData] = await Promise.all([invRes.json(), vendRes.json()]);
    if (Array.isArray(invData)) setInvoices(invData);
    if (Array.isArray(vendData)) setVendors(vendData);
  }

  useEffect(() => { load(); }, []);

  function updateItem(idx: number, field: keyof InvoiceItem, value: string | number) {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  }

  function calcTotal() {
    return items.reduce((sum, item) => {
      const amount = item.quantity * item.rate;
      return sum + amount + (amount * item.gstPercent) / 100;
    }, 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "PURCHASE", date, dueDate, vendorId, items, notes }),
    });
    setLoading(false);
    if (res.ok) { setShowForm(false); setItems([{ ...emptyItem }]); setVendorId(""); setNotes(""); load(); }
  }

  const fmt = (n: number) => n.toLocaleString("en-IN", { style: "currency", currency: "INR" });
  const statusColor = (s: string) => s === "PAID" ? "text-green-600 bg-green-50" : s === "PARTIAL" ? "text-yellow-600 bg-yellow-50" : "text-red-600 bg-red-50";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Purchase Bills</h2>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" /> New Purchase</Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>New Purchase Bill</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Vendor *</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={vendorId} onChange={(e) => setVendorId(e.target.value)} required>
                    <option value="">Select vendor</option>
                    {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div><Label>Date *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
                <div><Label>Due Date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
                <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { ...emptyItem }])}><Plus className="h-3 w-3 mr-1" /> Add Item</Button>
                </div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        {idx === 0 && <Label className="text-xs">Description</Label>}
                        <Input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} required />
                      </div>
                      <div className="col-span-2">{idx === 0 && <Label className="text-xs">Qty</Label>}<Input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} min={0.01} step={0.01} /></div>
                      <div className="col-span-2">{idx === 0 && <Label className="text-xs">Rate</Label>}<Input type="number" value={item.rate} onChange={(e) => updateItem(idx, "rate", Number(e.target.value))} min={0} /></div>
                      <div className="col-span-2">{idx === 0 && <Label className="text-xs">GST %</Label>}<Input type="number" value={item.gstPercent} onChange={(e) => updateItem(idx, "gstPercent", Number(e.target.value))} min={0} max={28} /></div>
                      <div className="col-span-1 text-right text-sm font-medium pt-1">{fmt(item.quantity * item.rate * (1 + item.gstPercent / 100))}</div>
                      <div className="col-span-1">{items.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4 text-red-500" /></Button>}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-lg font-bold">Total: {fmt(calcTotal())}</div>
                <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Bill"}</Button>
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
                  <th className="text-left p-3 font-medium">Bill #</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Vendor</th>
                  <th className="text-right p-3 font-medium">Amount</th>
                  <th className="text-right p-3 font-medium">Paid</th>
                  <th className="text-center p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{inv.invoiceNumber}</td>
                    <td className="p-3">{new Date(inv.date).toLocaleDateString("en-IN")}</td>
                    <td className="p-3">{inv.vendor?.name || "-"}</td>
                    <td className="p-3 text-right font-medium">{fmt(inv.totalAmount)}</td>
                    <td className="p-3 text-right">{fmt(inv.paidAmount)}</td>
                    <td className="p-3 text-center"><span className={`text-xs px-2 py-1 rounded ${statusColor(inv.status)}`}>{inv.status}</span></td>
                  </tr>
                ))}
                {invoices.length === 0 && (<tr><td colSpan={6} className="p-6 text-center text-gray-500">No purchase bills yet</td></tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
