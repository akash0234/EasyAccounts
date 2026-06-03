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
import { Plus, X, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface Facility {
  id: string;
  code: string | null;
  name: string;
  address: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    isDefault: false,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function loadFacilities(nextPage = page) {
    setListLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    params.set("page", String(nextPage));
    params.set("pageSize", String(pageSize));

    const res = await fetch(`/api/facilities?${params}`);
    const data = await res.json();
    if (data.data) {
      setFacilities(data.data);
      setTotal(data.pagination?.total || 0);
    } else if (Array.isArray(data)) {
      setFacilities(data);
      setTotal(data.length);
    }
    setListLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const res = await fetch("/api/facilities");
      const data = await res.json();
      if (!cancelled && Array.isArray(data)) setFacilities(data);
    }
    void init();
    return () => { cancelled = true; };
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
    loadFacilities(page);
  }, [page, pageSize, debouncedSearch]);

  function resetForm() {
    setFormData({ name: "", address: "", isDefault: false });
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/facilities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    setLoading(false);
    if (res.ok) { resetForm(); loadFacilities(); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Facilities</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showForm ? "Cancel" : "Add Facility"}
        </Button>
      </div>

      <SideDrawer
        open={showForm}
        title="New Facility"
        onClose={resetForm}
        widthClassName="w-[640px] max-w-[100vw]"
      >
        <form onSubmit={handleSubmit} className="min-h-full flex flex-col gap-4 justify-between">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.isDefault} onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })} />
                <span className="text-sm">Default facility</span>
              </label>
            </div>
          </div>
          <div className="sticky bottom-0 -mx-4 -mb-4 border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Facility"}</Button>
          </div>
        </form>
      </SideDrawer>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input className="pl-9" placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="hidden md:block">
          <Table>
            <colgroup>
              <col className="w-[8rem]" />
              <col />
              <col />
              <col className="w-[6rem]" />
              <col className="w-[6rem]" />
            </colgroup>
            <TableHead>
              <TableRow>
                <TableHeader className="rounded-l-md bg-rubick-primary text-white">Code</TableHeader>
                <TableHeader className="bg-rubick-primary text-white">Name</TableHeader>
                <TableHeader className="bg-rubick-primary text-white">Address</TableHeader>
                <TableHeader className="bg-rubick-primary text-center text-white">Default</TableHeader>
                <TableHeader className="rounded-r-md bg-rubick-primary text-center text-white">Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {facilities.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{listLoading ? "Loading..." : "No facilities yet. Add your first warehouse or godown."}</TableCell></TableRow>
              ) : (
                facilities.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="align-middle font-mono text-xs">{f.code}</TableCell>
                    <TableCell className="align-middle font-medium">{f.name}</TableCell>
                    <TableCell className="align-middle">{f.address || "—"}</TableCell>
                    <TableCell className="align-middle text-center">{f.isDefault ? "Yes" : "No"}</TableCell>
                    <TableCell className="align-middle text-center">{f.isActive ? "Active" : "Inactive"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

          <div className="md:hidden p-2 space-y-2">
            {facilities.map((f) => (
              <details key={f.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
                <summary className="list-none cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs text-slate-500">{f.code || "-"}</div>
                      <div className="text-sm text-slate-700 truncate">{f.address || "—"}</div>
                    </div>
                    <div className="text-right shrink-0 text-xs text-slate-600">
                      <div>Default: <span className="font-medium">{f.isDefault ? "Yes" : "No"}</span></div>
                      <div>Status: <span className="font-medium">{f.isActive ? "Active" : "Inactive"}</span></div>
                    </div>
                  </div>
                </summary>
              </details>
            ))}
            {facilities.length === 0 && (
              <div className="py-6 text-center text-slate-400">{listLoading ? "Loading..." : "No facilities yet. Add your first warehouse or godown."}</div>
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
