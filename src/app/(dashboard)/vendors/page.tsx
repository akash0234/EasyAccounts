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

interface Vendor {
  id: string;
  code: string | null;
  name: string;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  openingBalance: number;
  ledgerAccount?: { balance: number } | null;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "", gstin: "", phone: "", email: "",
    address: "", city: "", state: "", pincode: "", openingBalance: 0,
  });

  async function loadVendors() {
    const res = await fetch("/api/vendors");
    const data = await res.json();
    if (Array.isArray(data)) setVendors(data);
  }

  useEffect(() => {
    let cancelled = false;

    async function initializeVendors() {
      const res = await fetch("/api/vendors");
      const data = await res.json();
      if (!cancelled && Array.isArray(data)) {
        setVendors(data);
      }
    }

    void initializeVendors();

    return () => {
      cancelled = true;
    };
  }, []);

  function resetForm() {
    setFormData({ name: "", gstin: "", phone: "", email: "", address: "", city: "", state: "", pincode: "", openingBalance: 0 });
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const url = editingId ? `/api/vendors/${editingId}` : "/api/vendors";
    const method = editingId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
    setLoading(false);
    if (res.ok) { resetForm(); loadVendors(); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this vendor?")) return;
    await fetch(`/api/vendors/${id}`, { method: "DELETE" });
    loadVendors();
  }

  function handleEdit(v: Vendor) {
    setFormData({
      name: v.name, gstin: v.gstin || "", phone: v.phone || "", email: v.email || "",
      address: "", city: v.city || "", state: "", pincode: "", openingBalance: v.openingBalance,
    });
    setEditingId(v.id);
    setShowForm(true);
  }

  const filtered = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.phone && v.phone.includes(search)) ||
    (v.gstin && v.gstin.includes(search.toUpperCase()))
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Vendors</h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Vendor
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editingId ? "Edit Vendor" : "New Vendor"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={resetForm}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Name *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
              <div><Label>GSTIN</Label><Input value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })} /></div>
              <div><Label>Phone</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
              <div><Label>City</Label><Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} /></div>
              <div><Label>State</Label><Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} /></div>
              <div><Label>Opening Balance</Label><Input type="number" value={formData.openingBalance} onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value) })} /></div>
              <div className="flex items-end">
                <Button type="submit" disabled={loading}>{loading ? "Saving..." : editingId ? "Update" : "Create"}</Button>
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
            <colgroup>
              <col className="w-[7.5rem]" />
              <col />
              <col className="w-[9rem]" />
              <col className="w-[11rem]" />
              <col className="w-[8rem]" />
              <col className="w-[11rem]" />
              <col className="w-[7.5rem]" />
            </colgroup>
            <TableHead>
              <TableRow>
                <TableHeader className="rounded-l-md bg-rubick-primary text-white">
                  Code
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-white">
                  Name
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-white">
                  Phone
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-white">
                  GSTIN
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-white">
                  City
                </TableHeader>
                <TableHeader className="bg-rubick-primary !text-right text-white">
                  Balance
                </TableHeader>
                <TableHeader className="rounded-r-md bg-rubick-primary text-right text-white">
                  Actions
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="whitespace-nowrap align-middle font-mono text-xs text-slate-500">
                    {v.code || "-"}
                  </TableCell>
                  <TableCell className="align-middle font-medium">
                    {v.name}
                  </TableCell>
                  <TableCell className="align-middle text-slate-500">
                    {v.phone || "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap align-middle text-xs text-slate-500">
                    {v.gstin || "-"}
                  </TableCell>
                  <TableCell className="align-middle text-slate-500">
                    {v.city || "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap align-middle text-right font-medium">
                    {(v.ledgerAccount?.balance ?? v.openingBalance).toLocaleString(
                      "en-IN",
                      { style: "currency", currency: "INR" }
                    )}
                  </TableCell>
                  <TableCell className="align-middle text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(v)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(v.id)}
                      >
                        <Trash2 className="h-4 w-4 text-rubick-danger" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-slate-400">
                    No vendors found
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
