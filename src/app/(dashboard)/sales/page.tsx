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
import { Plus, X, Trash2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Customer { id: string; name: string; }
interface Product { id: string; name: string; hsn?: string | null; unit: string; gstPercent: number; purchaseRate: number; sellingRate: number; currentStock: number; }
interface Facility { id: string; name: string; code: string | null; }
interface InvoiceItem { description: string; productId?: string; quantity: number; rate: number; gstPercent: number; batchNo: string; slNo: string; expiryDate: string; }
interface Invoice {
  id: string; invoiceNumber: string; date: string; dueDate?: string | null;
  subtotal: number; taxAmount: number; totalAmount: number;
  paidAmount: number; status: string; notes?: string | null;
  customer?: { name: string; gstin?: string | null; phone?: string | null; billingAddress?: string | null; city?: string | null } | null;
  items: { description: string; quantity: number; rate: number; amount: number; gstPercent: number; gstAmount: number; }[];
}

const emptyItem: InvoiceItem = { description: "", productId: "", quantity: 1, rate: 0, gstPercent: 0, batchNo: "", slNo: "", expiryDate: "" };

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
  const [items, setItems] = useState<InvoiceItem[]>([{ ...emptyItem }]);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  async function load() {
    const [invRes, custRes, prodRes, facRes] = await Promise.all([
      fetch("/api/invoices?type=SALES"),
      fetch("/api/customers"),
      fetch("/api/products"),
      fetch("/api/facilities"),
    ]);
    const [invData, custData, prodData, facData] = await Promise.all([invRes.json(), custRes.json(), prodRes.json(), facRes.json()]);
    if (Array.isArray(invData)) setInvoices(invData);
    if (Array.isArray(custData)) setCustomers(custData);
    if (Array.isArray(prodData)) setProductsList(prodData);
    if (Array.isArray(facData)) setFacilitiesList(facData);
  }

  useEffect(() => {
    let cancelled = false;

    async function initializeSales() {
      const [invRes, custRes, prodRes, facRes] = await Promise.all([
        fetch("/api/invoices?type=SALES"),
        fetch("/api/customers"),
        fetch("/api/products"),
        fetch("/api/facilities"),
      ]);
      const [invData, custData, prodData, facData] = await Promise.all([invRes.json(), custRes.json(), prodRes.json(), facRes.json()]);

      if (cancelled) {
        return;
      }
      if (Array.isArray(invData)) setInvoices(invData);
      if (Array.isArray(custData)) setCustomers(custData);
      if (Array.isArray(prodData)) setProductsList(prodData);
      if (Array.isArray(facData)) setFacilitiesList(facData);
    }

    void initializeSales();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateItem(idx: number, field: keyof InvoiceItem, value: string | number) {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
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
      };
    } else {
      updated[idx] = { ...updated[idx], productId: "", description: "", rate: 0, gstPercent: 0 };
    }
    setItems(updated);
  }

  function calcTotal() {
    return items.reduce((sum, item) => {
      const amount = item.quantity * item.rate;
      const gst = (amount * item.gstPercent) / 100;
      return sum + amount + gst;
    }, 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "SALES", date, dueDate, customerId, facilityId, items, notes }),
    });
    setLoading(false);
    if (res.ok) {
      setShowForm(false);
      setItems([{ ...emptyItem }]);
      setCustomerId("");
      setFacilityId("");
      setNotes("");
      load();
    }
  }

  const fmt = (n: number) => n.toLocaleString("en-IN", { style: "currency", currency: "INR" });

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
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                    <option value="">Select customer</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Facility *</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={facilityId} onChange={(e) => setFacilityId(e.target.value)} required>
                    <option value="">Select facility</option>
                    {facilitiesList.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div><Label>Date *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
                <div><Label>Due Date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
                <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { ...emptyItem }])}>
                    <Plus className="h-3 w-3 mr-1" /> Add Item
                  </Button>
                </div>
                <div className="space-y-2 overflow-x-auto">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-end min-w-[900px]">
                      <div className="w-[200px] shrink-0">
                        {idx === 0 && <Label className="text-xs">Product</Label>}
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                          value={item.productId || ""}
                          onChange={(e) => selectProduct(idx, e.target.value)}
                          required
                        >
                          <option value="">Select product</option>
                          {productsList.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}{p.hsn ? ` (${p.hsn})` : ""} — Stock: {p.currentStock} {p.unit}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-[100px] shrink-0">{idx === 0 && <Label className="text-xs">Batch No</Label>}<Input value={item.batchNo} onChange={(e) => updateItem(idx, "batchNo", e.target.value)} placeholder="Batch" /></div>
                      <div className="w-[90px] shrink-0">{idx === 0 && <Label className="text-xs">SL No</Label>}<Input value={item.slNo} onChange={(e) => updateItem(idx, "slNo", e.target.value)} placeholder="Serial" /></div>
                      <div className="w-[120px] shrink-0">{idx === 0 && <Label className="text-xs">Expiry</Label>}<Input type="date" value={item.expiryDate} onChange={(e) => updateItem(idx, "expiryDate", e.target.value)} /></div>
                      <div className="w-[80px] shrink-0">{idx === 0 && <Label className="text-xs">Qty</Label>}<Input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} min={0.01} step={0.01} /></div>
                      <div className="w-[90px] shrink-0">{idx === 0 && <Label className="text-xs">Rate</Label>}<Input type="number" value={item.rate} onChange={(e) => updateItem(idx, "rate", Number(e.target.value))} min={0} /></div>
                      <div className="w-[70px] shrink-0">{idx === 0 && <Label className="text-xs">GST %</Label>}<Input type="number" value={item.gstPercent} onChange={(e) => updateItem(idx, "gstPercent", Number(e.target.value))} min={0} max={28} /></div>
                      <div className="w-[80px] shrink-0 text-right text-sm font-medium pt-1">{fmt(item.quantity * item.rate * (1 + item.gstPercent / 100))}</div>
                      <div className="w-[40px] shrink-0">{items.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4 text-red-500" /></Button>}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-lg font-bold">Total: {fmt(calcTotal())}</div>
                <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Invoice"}</Button>
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
                <TableHeader className="rounded-r-md bg-rubick-primary text-center text-white w-[5rem]">
                  View
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
                    <Button variant="ghost" size="icon" onClick={() => setViewInvoice(inv)}>
                      <Eye className="h-4 w-4" />
                    </Button>
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
                <Button variant="ghost" size="icon" onClick={() => setViewInvoice(null)}><X className="h-4 w-4" /></Button>
              </div>
            </div>

            {viewInvoice.customer && (
              <div className="px-6 pt-4">
                <p className="text-sm font-medium text-[var(--muted-foreground)]">Customer</p>
                <p className="font-semibold">{viewInvoice.customer.name}</p>
                {viewInvoice.customer.gstin && <p className="text-xs text-[var(--muted-foreground)]">GSTIN: {viewInvoice.customer.gstin}</p>}
                {viewInvoice.customer.phone && <p className="text-xs text-[var(--muted-foreground)]">Phone: {viewInvoice.customer.phone}</p>}
                {viewInvoice.customer.billingAddress && <p className="text-xs text-[var(--muted-foreground)]">{viewInvoice.customer.billingAddress}{viewInvoice.customer.city ? `, ${viewInvoice.customer.city}` : ""}</p>}
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
            </div>

            <div className="px-6 pb-6 space-y-1 border-t border-[var(--border)] pt-4">
              <div className="flex justify-between text-sm"><span className="text-[var(--muted-foreground)]">Subtotal</span><span>{fmt(viewInvoice.subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[var(--muted-foreground)]">Tax (GST)</span><span>{fmt(viewInvoice.taxAmount)}</span></div>
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
    </div>
  );
}
