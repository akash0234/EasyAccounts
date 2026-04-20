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
import { Plus, Search, Trash2, Edit2, X } from "lucide-react";

interface Customer {
  id: string;
  code: string | null;
  name: string;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  creditLimit: number;
  openingBalance: number;
  ledgerAccount?: { balance: number } | null;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "", gstin: "", phone: "", email: "",
    billingAddress: "", shippingAddress: "", city: "", state: "", pincode: "",
    creditLimit: 0, openingBalance: 0,
  });

  async function loadCustomers() {
    const res = await fetch("/api/customers");
    const data = await res.json();
    if (Array.isArray(data)) setCustomers(data);
  }

  useEffect(() => {
    let cancelled = false;

    async function initializeCustomers() {
      const res = await fetch("/api/customers");
      const data = await res.json();
      if (!cancelled && Array.isArray(data)) {
        setCustomers(data);
      }
    }

    void initializeCustomers();

    return () => {
      cancelled = true;
    };
  }, []);

  function resetForm() {
    setFormData({ name: "", gstin: "", phone: "", email: "", billingAddress: "", shippingAddress: "", city: "", state: "", pincode: "", creditLimit: 0, openingBalance: 0 });
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const url = editingId ? `/api/customers/${editingId}` : "/api/customers";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    setLoading(false);
    if (res.ok) {
      resetForm();
      loadCustomers();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this customer?")) return;
    await fetch(`/api/customers/${id}`, { method: "DELETE" });
    loadCustomers();
  }

  function handleEdit(c: Customer) {
    setFormData({
      name: c.name, gstin: c.gstin || "", phone: c.phone || "", email: c.email || "",
      billingAddress: "", shippingAddress: "", city: c.city || "", state: "", pincode: "",
      creditLimit: c.creditLimit, openingBalance: c.openingBalance,
    });
    setEditingId(c.id);
    setShowForm(true);
  }

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search)) ||
    (c.gstin && c.gstin.includes(search.toUpperCase()))
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Customers</h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Customer
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editingId ? "Edit Customer" : "New Customer"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={resetForm}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <Label>GSTIN</Label>
                <Input value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div>
                <Label>City</Label>
                <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
              </div>
              <div>
                <Label>State</Label>
                <Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
              </div>
              <div>
                <Label>Credit Limit</Label>
                <Input type="number" value={formData.creditLimit} onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Opening Balance</Label>
                <Input type="number" value={formData.openingBalance} onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value) })} />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : editingId ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input className="pl-9" placeholder="Search by name, phone or GSTIN..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table className="min-w-full table-fixed">
           
            <TableHead>
              <TableRow>
                <TableHeader className="rounded-l-md bg-rubick-primary text-white w-[7.5rem]">
                  Code
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-white w-[9rem]">
                  Name
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-white w-[11rem]">
                  Phone
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-white w-[8rem]">
                  GSTIN
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-white w-[8rem]">
                  City
                </TableHeader>
                <TableHeader className="bg-rubick-primary !text-right text-white w-[8rem]">
                  Balance
                </TableHeader>
                <TableHeader className="rounded-r-md bg-rubick-primary !text-right text-white w-[7.5rem]">
                  Actions
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-nowrap align-middle font-mono text-xs text-slate-500">
                    {c.code || "-"}
                  </TableCell>
                  <TableCell className="align-middle font-medium">
                    {c.name}
                  </TableCell>
                  <TableCell className="align-middle text-slate-500">
                    {c.phone || "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap align-middle text-xs text-slate-500">
                    {c.gstin || "-"}
                  </TableCell>
                  <TableCell className="align-middle text-slate-500">
                    {c.city || "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap align-middle  !text-right font-medium">
                    {(c.ledgerAccount?.balance ?? c.openingBalance).toLocaleString(
                      "en-IN",
                      { style: "currency", currency: "INR" }
                    )}
                  </TableCell>
                  <TableCell className="align-middle text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(c)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(c.id)}
                      >
                        <Trash2 className="h-4 w-4 text-rubick-danger" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-6 text-center text-slate-400"
                  >
                    No customers found
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
