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
import { Plus, Search, Trash2, Edit2, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { AddressPickerModal } from "@/components/customers/address-picker-modal";

interface Customer {
  id: string;
  code: string | null;
  name: string;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  creditLimit: number;
  openingBalance: number;
  ledgerAccount?: { balance: number } | null;
  addresses?: { id: string; isDefault: boolean }[];
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "", gstin: "", phone: "", email: "",
    creditLimit: 0, openingBalance: 0,
  });
  const [manageAddrsFor, setManageAddrsFor] = useState<{ id: string; name: string } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function loadCustomers(nextPage = page) {
    setListLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    params.set("page", String(nextPage));
    params.set("pageSize", String(pageSize));

    const res = await fetch(`/api/customers?${params}`);
    const data = await res.json();
    if (data.data) {
      setCustomers(data.data);
      setTotal(data.pagination?.total || 0);
    } else if (Array.isArray(data)) {
      setCustomers(data);
      setTotal(data.length);
    }
    setListLoading(false);
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
    loadCustomers(page);
  }, [page, pageSize, debouncedSearch]);

  function resetForm() {
    setFormData({ name: "", gstin: "", phone: "", email: "", creditLimit: 0, openingBalance: 0 });
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
      creditLimit: c.creditLimit, openingBalance: c.openingBalance,
    });
    setEditingId(c.id);
    setShowForm(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Customers</h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Customer
        </Button>
      </div>

      <SideDrawer
        open={showForm}
        title={editingId ? "Edit Customer" : "New Customer"}
        onClose={resetForm}
        widthClassName="w-[720px] max-w-[100vw]"
      >
        <form onSubmit={handleSubmit} className="min-h-full flex flex-col gap-4 justify-between">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label>Credit Limit</Label>
              <Input type="number" value={formData.creditLimit} onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Opening Balance</Label>
              <Input type="number" value={formData.openingBalance} onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value) })} />
            </div>
          </div>
          <div className="sticky bottom-0 -mx-4 -mb-4 border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : editingId ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </SideDrawer>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input className="pl-9" placeholder="Search by name, phone or GSTIN..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="hidden md:block">
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
                  <TableHeader className="bg-rubick-primary text-white w-[10rem]">
                    Addresses
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
                {customers.map((c) => (
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setManageAddrsFor({ id: c.id, name: c.name })}
                      >
                        <MapPin className="h-3.5 w-3.5 mr-1" />
                        {c.addresses?.length ?? 0} address
                        {(c.addresses?.length ?? 0) === 1 ? "" : "es"}
                      </Button>
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
                {customers.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-6 text-center text-slate-400"
                    >
                      {listLoading ? "Loading..." : "No customers found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden p-2 space-y-2">
            {customers.map((c) => (
              <details key={c.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
                <summary className="list-none cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.code || "-"}</div>
                      <div className="text-sm text-slate-700 truncate">{c.phone || "-"}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold">
                        {(c.ledgerAccount?.balance ?? c.openingBalance).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                      </div>
                    </div>
                  </div>
                </summary>
                <div className="mt-3 text-sm">
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <div className="text-[var(--muted-foreground)]">GSTIN</div>
                      <div className="font-medium text-[var(--foreground)]">{c.gstin || "-"}</div>
                    </div>
                    <div className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setManageAddrsFor({ id: c.id, name: c.name })}
                      >
                        <MapPin className="h-3.5 w-3.5 mr-1" />
                        {c.addresses?.length ?? 0} addr{(c.addresses?.length ?? 0) === 1 ? "" : "s"}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-4 w-4 text-rubick-danger" />
                    </Button>
                  </div>
                </div>
              </details>
            ))}
            {customers.length === 0 && (
              <div className="py-6 text-center text-slate-400">{listLoading ? "Loading..." : "No customers found"}</div>
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

      {manageAddrsFor && (
        <AddressPickerModal
          customerId={manageAddrsFor.id}
          customerName={manageAddrsFor.name}
          onClose={() => {
            setManageAddrsFor(null);
            loadCustomers();
          }}
        />
      )}
    </div>
  );
}
