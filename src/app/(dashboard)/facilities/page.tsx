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
import { Plus, X } from "lucide-react";

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
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    isDefault: false,
  });

  async function loadFacilities() {
    const res = await fetch("/api/facilities");
    const data = await res.json();
    if (Array.isArray(data)) setFacilities(data);
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

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Facility</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="md:col-span-3">
                <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Facility"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
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
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No facilities yet. Add your first warehouse or godown.</TableCell></TableRow>
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
        </CardContent>
      </Card>
    </div>
  );
}
