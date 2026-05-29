"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Trash2, Edit2, X, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import { FacilityStockModal, type InventoryStockProduct } from "@/components/inventory/facility-stock-modal";
import { SearchSelect } from "@/components/ui/search-select";

interface FacilityStockItem {
  facilityId: string;
  facilityName: string;
  currentStock: number;
}

interface Product {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  hsn: string | null;
  sku: string | null;
  unit: string;
  categoryId: string | null;
  subcategoryId: string | null;
  trackingMode: "NONE" | "BATCH" | "SERIAL";
  category?: { id: string; name: string } | null;
  subcategory?: { id: string; name: string; categoryId: string } | null;
  gstPercent: number;
  purchaseRate: number;
  sellingRate: number;
  openingStock: number;
  currentStock: number;
  reorderLevel: number;
  imageUrl: string | null;
  isActive: boolean;
  facilityStock?: FacilityStockItem[];
}

const UNITS = ["PCS", "KG", "LTR", "BOX", "MTR", "SET", "PAIR", "DOZEN", "STRIP", "BOTTLE", "TUBE", "VIAL"];

const defaultForm = {
  name: "", description: "", hsn: "", sku: "", unit: "PCS",
  trackingMode: "NONE" as "NONE" | "BATCH" | "SERIAL",
  categoryId: "", subcategoryId: "", gstPercent: 0, purchaseRate: 0, sellingRate: 0,
  openingStock: 0, reorderLevel: 0, imageUrl: "",
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterCategoryDisplay, setFilterCategoryDisplay] = useState("");
  const [filterSubcategoryId, setFilterSubcategoryId] = useState("");
  const [filterSubcategoryDisplay, setFilterSubcategoryDisplay] = useState("");
  const [filterIsActive, setFilterIsActive] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryStockProduct | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...defaultForm });
  const [subcategoryDisplay, setSubcategoryDisplay] = useState("");
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function loadProducts(nextPage = page) {
    setListLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (filterCategoryId) params.set("categoryId", filterCategoryId);
    if (filterSubcategoryId) params.set("subcategoryId", filterSubcategoryId);
    if (filterIsActive) params.set("isActive", filterIsActive);
    params.set("page", String(nextPage));
    params.set("pageSize", String(pageSize));

    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    if (data.data) {
      setProducts(data.data);
      setTotal(data.pagination?.total || 0);
    } else if (Array.isArray(data)) {
      setProducts(data);
      setTotal(data.length);
    }
    setListLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (!cancelled && Array.isArray(data)) setProducts(data);
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
  }, [debouncedSearch, filterCategoryId, filterSubcategoryId, filterIsActive, pageSize]);

  useEffect(() => {
    loadProducts(page);
  }, [page, pageSize, debouncedSearch, filterCategoryId, filterSubcategoryId, filterIsActive]);

  function resetForm() {
    setFormData({ ...defaultForm });
    setEditingId(null);
    setShowForm(false);
    setImagePreview(null);
    setSubcategoryDisplay("");
    setSelectedCategoryName("");
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) {
      const { url } = await res.json();
      setFormData((prev) => ({ ...prev, imageUrl: url }));
      setImagePreview(url);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const url = editingId ? `/api/products/${editingId}` : "/api/products";
    const method = editingId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    setLoading(false);
    if (res.ok) { resetForm(); loadProducts(); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    loadProducts();
  }

  function handleEdit(p: Product) {
    setFormData({
      name: p.name, description: p.description || "", hsn: p.hsn || "",
      sku: p.sku || "", unit: p.unit, categoryId: p.categoryId || "", subcategoryId: p.subcategoryId || "",
      trackingMode: p.trackingMode,
      gstPercent: p.gstPercent, purchaseRate: p.purchaseRate,
      sellingRate: p.sellingRate, openingStock: p.openingStock,
      reorderLevel: p.reorderLevel, imageUrl: p.imageUrl || "",
    });
    setImagePreview(p.imageUrl);
    setSubcategoryDisplay(p.subcategory?.name || "");
    setSelectedCategoryName(p.category?.name || "");
    setEditingId(p.id);
    setShowForm(true);
  }

  function resetFilters() {
    setSearch("");
    setFilterCategoryId("");
    setFilterCategoryDisplay("");
    setFilterSubcategoryId("");
    setFilterSubcategoryDisplay("");
    setFilterIsActive("");
  }

  const fmt = (n: number) => n.toLocaleString("en-IN", { style: "currency", currency: "INR" });
  const isTrackedProduct = formData.trackingMode !== "NONE";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Inventory</h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Product
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editingId ? "Edit Product" : "New Product"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={resetForm}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div>
                  <Label>HSN Code</Label>
                  <Input value={formData.hsn} onChange={(e) => setFormData({ ...formData, hsn: e.target.value })} placeholder="e.g. 3004" />
                </div>
                <div>
                  <Label>SKU</Label>
                  <Input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} />
                </div>
                <div>
                  <Label>Subcategory</Label>
                  <SearchSelect
                    value={formData.subcategoryId}
                    displayValue={subcategoryDisplay}
                    endpoint="/api/products/subcategories"
                    placeholder="Search subcategory"
                    mapResult={(row: { id: string; name: string; categoryId: string; categoryName: string }) => ({
                      id: row.id,
                      label: row.name,
                      hint: row.categoryName,
                      meta: { categoryId: row.categoryId, categoryName: row.categoryName },
                    })}
                    onChange={(opt) => {
                      if (!opt) {
                        setFormData({ ...formData, categoryId: "", subcategoryId: "" });
                        setSubcategoryDisplay("");
                        setSelectedCategoryName("");
                        return;
                      }
                      const meta = (opt as { meta?: { categoryId: string; categoryName: string } }).meta;
                      setFormData({
                        ...formData,
                        categoryId: meta?.categoryId || "",
                        subcategoryId: opt.id,
                      });
                      setSubcategoryDisplay(opt.label);
                      setSelectedCategoryName(meta?.categoryName || "");
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Unit</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Stock Tracking</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={formData.trackingMode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        trackingMode: e.target.value as "NONE" | "BATCH" | "SERIAL",
                        openingStock:
                          e.target.value === "NONE" ? formData.openingStock : 0,
                      })
                    }
                  >
                    <option value="NONE">Bulk / None</option>
                    <option value="BATCH">Batch</option>
                    <option value="SERIAL">Serial</option>
                  </select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Input
                    value={selectedCategoryName}
                    placeholder="Auto-filled from subcategory"
                    readOnly
                  />
                </div>
                <div>
                  <Label>GST %</Label>
                  <Input type="number" value={formData.gstPercent} onChange={(e) => setFormData({ ...formData, gstPercent: Number(e.target.value) })} min={0} max={28} />
                </div>
                <div>
                  <Label>Purchase Rate</Label>
                  <Input type="number" value={formData.purchaseRate} onChange={(e) => setFormData({ ...formData, purchaseRate: Number(e.target.value) })} min={0} step={0.01} />
                </div>
                <div>
                  <Label>Selling Rate</Label>
                  <Input type="number" value={formData.sellingRate} onChange={(e) => setFormData({ ...formData, sellingRate: Number(e.target.value) })} min={0} step={0.01} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Opening Stock</Label>
                  <Input
                    type="number"
                    value={formData.openingStock}
                    onChange={(e) =>
                      setFormData({ ...formData, openingStock: Number(e.target.value) })
                    }
                    min={0}
                    disabled={isTrackedProduct}
                  />
                  {isTrackedProduct && (
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      Batch and serial tracked products must start at zero and receive stock through purchase entries.
                    </p>
                  )}
                </div>
                <div>
                  <Label>Reorder Level</Label>
                  <Input type="number" value={formData.reorderLevel} onChange={(e) => setFormData({ ...formData, reorderLevel: Number(e.target.value) })} min={0} />
                </div>
                <div>
                  <Label>Product Image</Label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 cursor-pointer text-sm border rounded-md px-3 py-1.5 hover:bg-accent">
                      <Upload className="h-4 w-4" />
                      {uploading ? "Uploading..." : "Upload"}
                      <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                    {imagePreview && (
                      <img src={imagePreview} alt="Preview" className="h-9 w-9 rounded object-cover border" />
                    )}
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
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
        <Input className="pl-9" placeholder="Search by name, code, HSN, or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-[0.14em] text-slate-500">Category</Label>
              <SearchSelect
                value={filterCategoryId}
                displayValue={filterCategoryDisplay}
                endpoint="/api/products/categories"
                placeholder="All categories"
                mapResult={(r: { id: string; name: string }) => ({ id: r.id, label: r.name })}
                onChange={(opt) => {
                  setFilterCategoryId(opt?.id ?? "");
                  setFilterCategoryDisplay(opt?.label ?? "");
                  setFilterSubcategoryId("");
                  setFilterSubcategoryDisplay("");
                }}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-[0.14em] text-slate-500">Subcategory</Label>
              <SearchSelect
                value={filterSubcategoryId}
                displayValue={filterSubcategoryDisplay}
                endpoint="/api/products/subcategories"
                placeholder="All subcategories"
                mapResult={(r: { id: string; name: string }) => ({ id: r.id, label: r.name })}
                onChange={(opt) => {
                  setFilterSubcategoryId(opt?.id ?? "");
                  setFilterSubcategoryDisplay(opt?.label ?? "");
                }}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs uppercase tracking-[0.14em] text-slate-500">Status</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={filterIsActive}
                onChange={(e) => setFilterIsActive(e.target.value)}
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={resetFilters} className="w-full">
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table className="min-w-[70rem] table-fixed">
            <colgroup>
              <col className="w-[4rem]" />
              <col className="w-[7.5rem]" />
              <col />
              <col className="w-[7rem]" />
              <col className="w-[6rem]" />
              <col className="w-[9rem]" />
              <col className="w-[9rem]" />
              <col className="w-[8.5rem]" />
              <col className="w-[7.5rem]" />
            </colgroup>
            <TableHead>
              <TableRow>
                <TableHeader className="rounded-l-md bg-rubick-primary text-white" />
                <TableHeader className="bg-rubick-primary text-white">
                  Code
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-white">
                  Name
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-white">
                  HSN
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-white">
                  Unit
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-right text-white">
                  Purchase
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-right text-white">
                  Selling
                </TableHeader>
                <TableHeader className="bg-rubick-primary text-right text-white">
                  Stock
                </TableHeader>
                <TableHeader className="rounded-r-md bg-rubick-primary text-right text-white">
                  Actions
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="align-middle">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
                        --
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap align-middle font-mono text-xs text-slate-500">
                    {p.code || "-"}
                  </TableCell>
                  <TableCell className="align-middle font-medium">
                    {p.name}
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-slate-400">
                      {p.trackingMode === "NONE"
                        ? "bulk"
                        : p.trackingMode === "BATCH"
                          ? "batch"
                          : "serial"}
                    </span>
                    {(p.subcategory?.name || p.category?.name) ? (
                      <span className="ml-2 text-xs text-slate-400">
                        {p.subcategory?.name || p.category?.name}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap align-middle text-xs text-slate-500">
                    {p.hsn || "-"}
                  </TableCell>
                  <TableCell className="align-middle">{p.unit}</TableCell>
                  <TableCell className="whitespace-nowrap align-middle text-right">
                    {fmt(p.purchaseRate)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap align-middle text-right">
                    {fmt(p.sellingRate)}
                  </TableCell>
                  <TableCell className="align-middle text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(p)}
                      className="cursor-pointer"
                      title="View facility stock"
                    >
                      <Badge
                        variant={p.currentStock <= p.reorderLevel ? "unpaid" : "paid"}
                        className="bg-white/75"
                      >
                        {p.currentStock} {p.unit}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="align-middle text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(p)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="h-4 w-4 text-rubick-danger" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-6 text-center text-slate-400">
                    {listLoading ? "Loading..." : "No products found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span>Rows per page</span>
          <select
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
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

      {selectedProduct && (
        <FacilityStockModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
