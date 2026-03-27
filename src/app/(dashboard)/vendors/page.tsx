"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Trash2, Edit2, X } from "lucide-react";

interface Vendor {
  id: string;
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

  useEffect(() => { loadVendors(); }, []);

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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Phone</th>
                  <th className="text-left p-3 font-medium">GSTIN</th>
                  <th className="text-left p-3 font-medium">City</th>
                  <th className="text-right p-3 font-medium">Balance</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{v.name}</td>
                    <td className="p-3 text-gray-600">{v.phone || "-"}</td>
                    <td className="p-3 text-gray-600 text-xs">{v.gstin || "-"}</td>
                    <td className="p-3 text-gray-600">{v.city || "-"}</td>
                    <td className="p-3 text-right font-medium">
                      {(v.ledgerAccount?.balance ?? v.openingBalance).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(v)}><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-gray-500">No vendors found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
