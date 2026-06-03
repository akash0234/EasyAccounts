"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
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
import { Plus, Search, Trash2, Edit2, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "", gstin: "", phone: "", email: "",
    address: "", city: "", state: "", pincode: "", openingBalance: 0,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function loadVendors(nextPage = page) {
    setListLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    params.set("page", String(nextPage));
    params.set("pageSize", String(pageSize));

    const res = await fetch(`/api/vendors?${params}`);
    const data = await res.json();
    if (data.data) {
      setVendors(data.data);
      setTotal(data.pagination?.total || 0);
    } else if (Array.isArray(data)) {
      setVendors(data);
      setTotal(data.length);
    }
    setListLoading(false);
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  useEffect(() => {
    loadVendors(page);
  }, [page, pageSize, debouncedSearch]);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Vendors</h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Vendor
        </Button>
      </div>

      <SideDrawer
        open={showForm}
        title={editingId ? "Edit Vendor" : "New Vendor"}
        onClose={resetForm}
        widthClassName="w-[720px] max-w-[100vw]"
      >
        <form onSubmit={handleSubmit} className="min-h-full flex flex-col gap-4 justify-between">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Name *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
            <div><Label>GSTIN</Label><Input value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })} /></div>
            <div><Label>Phone</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
            <div><Label>City</Label><Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} /></div>
            <div><Label>State</Label><Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} /></div>
            <div><Label>Opening Balance</Label><Input type="number" value={formData.openingBalance} onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value) })} /></div>
          </div>
          <div className="sticky bottom-0 -mx-4 -mb-4 border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : editingId ? "Update" : "Create"}</Button>
          </div>
        </form>
      </SideDrawer>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input className="pl-9" placeholder="Search by name, phone, or GSTIN..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="hidden md:block">
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
              {vendors.map((v) => (
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
              {vendors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-slate-400">
                    {listLoading ? "Loading..." : "No vendors found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>

          <div className="md:hidden p-2 space-y-2">
            {vendors.map((v) => (
              <details key={v.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
                <summary className="list-none cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{v.name}</div>
                      <div className="text-xs text-slate-500">{v.code || "-"}</div>
                      <div className="text-sm text-slate-700 truncate">{v.phone || "-"}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold">
                        {(v.ledgerAccount?.balance ?? v.openingBalance).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                      </div>
                    </div>
                  </div>
                </summary>
                <div className="mt-3 text-sm">
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <div className="text-[var(--muted-foreground)]">GSTIN</div>
                      <div className="font-medium text-[var(--foreground)]">{v.gstin || "-"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[var(--muted-foreground)]">City</div>
                      <div className="font-medium text-[var(--foreground)]">{v.city || "-"}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(v)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)}>
                      <Trash2 className="h-4 w-4 text-rubick-danger" />
                    </Button>
                  </div>
                </div>
              </details>
            ))}
            {vendors.length === 0 && (
              <div className="py-6 text-center text-slate-400">{listLoading ? "Loading..." : "No vendors found"}</div>
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
              options={[5,10,25,50,100].map((n) => ({ value: String(n), label: String(n) }))}
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
    </div>
  );
}
