"use client";

import { Fragment, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { SimpleSelect } from "@/components/ui/simple-select";
import { SideDrawer } from "@/components/ui/side-drawer";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Trash2, Edit2, ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";

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
  const [listLoading, setListLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterIsActive, setFilterIsActive] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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

  async function fetchCategories(nextPage = page) {
    setListLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (filterIsActive) params.set("isActive", filterIsActive);
      params.set("page", String(nextPage));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/products/categories?${params}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data.data) {
          setCategories(data.data);
          setTotal(data.pagination?.total || 0);
        } else if (Array.isArray(data)) {
          setCategories(data);
          setTotal(data.length);
        }
      } else {
        console.error("Failed to load categories", data);
        setCategories([]);
        setTotal(0);
      }
    } finally {
      setListLoading(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterIsActive, pageSize]);

  useEffect(() => {
    fetchCategories(page);
  }, [page, pageSize, debouncedSearch, filterIsActive]);

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

  function resetFilters() {
    setSearch("");
    setFilterIsActive("");
  }

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
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            value={filterIsActive}
            onChange={(e) => setFilterIsActive(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <Button variant="outline" size="sm" onClick={resetFilters}>
            Reset
          </Button>
        </div>
        <div className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
          {total} total
        </div>
      </div>

      <SideDrawer
        open={showCatForm}
        title={editingCat ? "Edit Category" : "New Category"}
        onClose={() => setShowCatForm(false)}
        widthClassName="w-[600px] max-w-[100vw]"
      >
        <div className="space-y-4">
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
          <div className="sticky bottom-0 -mx-4 -mb-4 border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowCatForm(false)}>Cancel</Button>
            <Button onClick={saveCat} disabled={!catName.trim()}>Save</Button>
          </div>
        </div>
      </SideDrawer>

      <SideDrawer
        open={!!showSubForm}
        title={editingSub ? "Edit Subcategory" : "New Subcategory"}
        onClose={() => setShowSubForm(null)}
        widthClassName="w-[600px] max-w-[100vw]"
      >
        <div className="space-y-4">
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
          <div className="sticky bottom-0 -mx-4 -mb-4 border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowSubForm(null)}>Cancel</Button>
            <Button onClick={saveSub} disabled={!subName.trim()}>Save</Button>
          </div>
        </div>
      </SideDrawer>

      {/* Categories Table */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading categories...
          </CardContent>
        </Card>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {listLoading ? "Loading..." : "No categories found. Create one to get started."}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="hidden md:block">
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
                {categories.map((cat) => {
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
            </div>

            <div className="md:hidden p-2 space-y-2">
              {categories.map((cat) => (
                <details key={cat.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
                  <summary className="list-none cursor-pointer">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{cat.name}</div>
                        <div className="text-xs text-slate-500">{cat.subcategories.length} sub • {cat.productCount} products</div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant={cat.isActive ? "default" : "secondary"}>{cat.isActive ? "Active" : "Inactive"}</Badge>
                      </div>
                    </div>
                  </summary>
                  <div className="mt-3 text-sm">
                    {cat.description && (
                      <div className="mb-3 text-slate-700">{cat.description}</div>
                    )}
                    {cat.subcategories.length > 0 ? (
                      <div className="space-y-2">
                        {cat.subcategories.map((sub) => (
                          <div key={sub.id} className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2">
                            <div className="min-w-0">
                              <div className="font-medium">{sub.name}</div>
                              {sub.description && <div className="text-xs text-slate-500 truncate">{sub.description}</div>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant={sub.isActive ? "default" : "secondary"} className="text-[10px]">{sub.isActive ? "Active" : "Inactive"}</Badge>
                              <span className="text-xs text-slate-600">{sub.productCount}</span>
                              <Button variant="ghost" size="icon" onClick={() => openSubForm(cat.id, sub)} title="Edit subcategory">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteSub(sub.id)} title="Delete subcategory">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-500">No subcategories</div>
                    )}
                    <div className="mt-3 flex items-center justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => openSubForm(cat.id)}>
                        <Plus className="h-3 w-3 mr-1" /> Add Subcategory
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openCatForm(cat)} title="Edit category">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteCat(cat.id)} title="Delete category">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {categories.length > 0 && (
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
      )}
    </div>
  );
}
