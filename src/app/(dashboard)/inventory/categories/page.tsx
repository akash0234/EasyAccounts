"use client";

import { Fragment, useEffect, useState } from "react";
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
import { Plus, Search, Trash2, Edit2, ChevronDown, ChevronRight } from "lucide-react";

interface Subcategory {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  productCount: number;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  productCount: number;
  subcategories: Subcategory[];
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Category form
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");

  // Subcategory form
  const [showSubForm, setShowSubForm] = useState<string | null>(null); // categoryId
  const [editingSub, setEditingSub] = useState<Subcategory | null>(null);
  const [subName, setSubName] = useState("");
  const [subDesc, setSubDesc] = useState("");

  async function fetchCategories() {
    try {
      const res = await fetch("/api/products/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Category CRUD ──
  function openCatForm(cat?: Category) {
    if (cat) {
      setEditingCat(cat);
      setCatName(cat.name);
      setCatDesc(cat.description || "");
    } else {
      setEditingCat(null);
      setCatName("");
      setCatDesc("");
    }
    setShowCatForm(true);
  }

  async function saveCat() {
    const body = { name: catName, description: catDesc || null };
    const url = editingCat
      ? `/api/products/categories/${editingCat.id}`
      : "/api/products/categories";
    const method = editingCat ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      setShowCatForm(false);
      fetchCategories();
    }
  }

  async function deleteCat(id: string) {
    if (!confirm("Delete this category and all its subcategories?")) return;
    const res = await fetch(`/api/products/categories/${id}`, { method: "DELETE" });
    if (res.ok) fetchCategories();
  }

  // ── Subcategory CRUD ──
  function openSubForm(categoryId: string, sub?: Subcategory) {
    if (sub) {
      setEditingSub(sub);
      setSubName(sub.name);
      setSubDesc(sub.description || "");
    } else {
      setEditingSub(null);
      setSubName("");
      setSubDesc("");
    }
    setShowSubForm(categoryId);
  }

  async function saveSub() {
    if (!showSubForm) return;
    const body = { name: subName, description: subDesc || null, categoryId: showSubForm };
    const url = editingSub
      ? `/api/products/categories/subcategories/${editingSub.id}`
      : "/api/products/categories/subcategories";
    const method = editingSub ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      setShowSubForm(null);
      fetchCategories();
    }
  }

  async function deleteSub(id: string) {
    if (!confirm("Delete this subcategory?")) return;
    const res = await fetch(`/api/products/categories/subcategories/${id}`, { method: "DELETE" });
    if (res.ok) fetchCategories();
  }

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.subcategories.some((s) => s.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="rubick-panel flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500">Manage product categories and subcategories.</p>
        </div>
        <Button onClick={() => openCatForm()}>
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      <div className="rubick-panel-muted flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
          {filtered.length} total
        </div>
      </div>

      {/* Category Form Modal */}
      {showCatForm && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">{editingCat ? "Edit Category" : "New Category"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Name</Label>
                <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Oral Dosage Forms" />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={catDesc} onChange={(e) => setCatDesc(e.target.value)} placeholder="Optional description" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveCat} disabled={!catName.trim()}>Save</Button>
              <Button variant="outline" onClick={() => setShowCatForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subcategory Form Modal */}
      {showSubForm && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">{editingSub ? "Edit Subcategory" : "New Subcategory"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Name</Label>
                <Input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="e.g. Tablets" />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={subDesc} onChange={(e) => setSubDesc(e.target.value)} placeholder="Optional description" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveSub} disabled={!subName.trim()}>Save</Button>
              <Button variant="outline" onClick={() => setShowSubForm(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories Table */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading categories...
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No categories found. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Table className="min-w-full table-fixed">
              <colgroup>
                <col className="w-[4rem]" />
                <col className="w-[18rem]" />
                <col />
                <col className="w-[9rem]" />
                <col className="w-[9rem]" />
                <col className="w-[9rem]" />
                <col className="w-[7.5rem]" />
              </colgroup>
              <TableHead>
                <TableRow>
                  <TableHeader className="rounded-l-md bg-rubick-primary text-white" />
                  <TableHeader className="bg-rubick-primary text-white">Category</TableHeader>
                  <TableHeader className="bg-rubick-primary text-white">Description</TableHeader>
                  <TableHeader className="bg-rubick-primary text-center text-white">Subcategories</TableHeader>
                  <TableHeader className="bg-rubick-primary text-center text-white">Products</TableHeader>
                  <TableHeader className="bg-rubick-primary text-center text-white">Status</TableHeader>
                  <TableHeader className="rounded-r-md bg-rubick-primary text-center text-white">Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((cat) => {
                  const expanded = expandedIds.has(cat.id);
                  return (
                    <Fragment key={cat.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => toggleExpand(cat.id)}
                      >
                        <TableCell className="align-middle">
                          <div className="flex items-center justify-center">
                            {cat.subcategories.length > 0 ? (
                              expanded ? (
                                <ChevronDown className="h-4 w-4 text-slate-500" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-500" />
                              )
                            ) : (
                              <span className="inline-block h-4 w-4" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-middle font-medium text-slate-900">
                          {cat.name}
                        </TableCell>
                        <TableCell className="align-middle text-slate-500">
                          {cat.description || "-"}
                        </TableCell>
                        <TableCell className="align-middle text-center text-slate-700">
                          {cat.subcategories.length}
                        </TableCell>
                        <TableCell className="align-middle text-center text-slate-700">
                          {cat.productCount}
                        </TableCell>
                        <TableCell className="align-middle text-center">
                          <Badge variant={cat.isActive ? "default" : "secondary"}>
                            {cat.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-middle">
                          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" onClick={() => openSubForm(cat.id)} title="Add subcategory">
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openCatForm(cat)} title="Edit category">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteCat(cat.id)} title="Delete category">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expanded &&
                        cat.subcategories.map((sub) => (
                          <TableRow key={sub.id} className="bg-slate-50/80 dark:bg-white/5">
                            <TableCell />
                            <TableCell className="align-middle pl-10 text-sm font-medium text-slate-800">
                              {sub.name}
                            </TableCell>
                            <TableCell className="align-middle text-sm text-slate-500">
                              {sub.description || "-"}
                            </TableCell>
                            <TableCell />
                            <TableCell className="align-middle text-center text-sm text-slate-700">
                              {sub.productCount}
                            </TableCell>
                            <TableCell className="align-middle text-center">
                              <Badge variant={sub.isActive ? "default" : "secondary"} className="text-xs">
                                {sub.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="align-middle">
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openSubForm(cat.id, sub)} title="Edit subcategory">
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => deleteSub(sub.id)} title="Delete subcategory">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
