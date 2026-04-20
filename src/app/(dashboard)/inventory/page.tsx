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
import { Plus, Search, Trash2, Edit2, X, Upload } from "lucide-react";

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
  category: string | null;
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
  category: "", gstPercent: 0, purchaseRate: 0, sellingRate: 0,
  openingStock: 0, reorderLevel: 0, imageUrl: "",
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...defaultForm });

  async function loadProducts() {
    const res = await fetch("/api/products");
    const data = await res.json();
    if (Array.isArray(data)) setProducts(data);
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

  function resetForm() {
    setFormData({ ...defaultForm });
    setEditingId(null);
    setShowForm(false);
    setImagePreview(null);
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
      sku: p.sku || "", unit: p.unit, category: p.category || "",
      gstPercent: p.gstPercent, purchaseRate: p.purchaseRate,
      sellingRate: p.sellingRate, openingStock: p.openingStock,
      reorderLevel: p.reorderLevel, imageUrl: p.imageUrl || "",
    });
    setImagePreview(p.imageUrl);
    setEditingId(p.id);
    setShowForm(true);
  }

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.code && p.code.toLowerCase().includes(search.toLowerCase())) ||
    (p.hsn && p.hsn.includes(search)) ||
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const fmt = (n: number) => n.toLocaleString("en-IN", { style: "currency", currency: "INR" });

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
                  <Label>Category</Label>
                  <Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
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
                  <Input type="number" value={formData.openingStock} onChange={(e) => setFormData({ ...formData, openingStock: Number(e.target.value) })} min={0} />
                </div>
                <div>
                  <Label>Reorder Level</Label>
                  <Input type="number" value={formData.reorderLevel} onChange={(e) => setFormData({ ...formData, reorderLevel: Number(e.target.value) })} min={0} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
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
              {filtered.map((p) => (
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
                    {p.category ? (
                      <span className="ml-2 text-xs text-slate-400">
                        {p.category}
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
                    <button type="button" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} className="cursor-pointer">
                      <Badge
                        variant={p.currentStock <= p.reorderLevel ? "unpaid" : "paid"}
                      >
                        {p.currentStock} {p.unit}
                      </Badge>
                    </button>
                    {expandedId === p.id && p.facilityStock && p.facilityStock.length > 0 && (
                      <div className="mt-1 text-xs text-left space-y-0.5">
                        {p.facilityStock.map((fs) => (
                          <div key={fs.facilityId} className="flex justify-between gap-2">
                            <span className="text-muted-foreground">{fs.facilityName}</span>
                            <span className="font-medium">{fs.currentStock} {p.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {expandedId === p.id && (!p.facilityStock || p.facilityStock.length === 0) && (
                      <div className="mt-1 text-xs text-muted-foreground">No facility stock</div>
                    )}
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
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-6 text-center text-slate-400">
                    No products found
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
