"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Check, Pencil, Trash2, MapPin } from "lucide-react";

export interface CustomerAddress {
  id: string;
  label: string | null;
  line1: string;
  city: string | null;
  state: string | null;
  pincode: string | null;
  isDefault: boolean;
}

interface Props {
  customerId: string;
  customerName: string;
  selectedAddressId?: string | null;
  onSelect?: (addr: CustomerAddress) => void;
  onClose: () => void;
}

const emptyForm = {
  label: "",
  line1: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false,
};

export function AddressPickerModal({
  customerId,
  customerName,
  selectedAddressId,
  onSelect,
  onClose,
}: Props) {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/customers/${customerId}/addresses`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) setAddresses(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadAddresses() {
      setLoading(true);
      const res = await fetch(`/api/customers/${customerId}/addresses`);
      if (!cancelled && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setAddresses(data);
      }
      if (!cancelled) setLoading(false);
    }

    void loadAddresses();

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  function startNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function startEdit(addr: CustomerAddress) {
    setEditingId(addr.id);
    setForm({
      label: addr.label ?? "",
      line1: addr.line1,
      city: addr.city ?? "",
      state: addr.state ?? "",
      pincode: addr.pincode ?? "",
      isDefault: addr.isDefault,
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = editingId
      ? `/api/customers/${customerId}/addresses/${editingId}`
      : `/api/customers/${customerId}/addresses`;
    const method = editingId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await load();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this address?")) return;
    const res = await fetch(`/api/customers/${customerId}/addresses/${id}`, {
      method: "DELETE",
    });
    if (res.ok) await load();
  }

  function formatLine(addr: CustomerAddress) {
    return [addr.line1, addr.city, addr.state, addr.pincode]
      .filter(Boolean)
      .join(", ");
  }

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="m-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-[var(--card)] text-[var(--card-foreground)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] p-6">
          <div>
            <h3 className="text-lg font-bold">Addresses</h3>
            <p className="text-sm text-[var(--muted-foreground)]">{customerName}</p>
          </div>
          <div className="flex items-center gap-2">
            {!showForm && (
              <Button size="sm" onClick={startNew}>
                <Plus className="mr-1 h-4 w-4" /> New Address
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={handleSave}
            className="space-y-4 border-b border-[var(--border)] bg-[var(--muted)] p-6"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Label</Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="HQ, Warehouse, Shop 2..."
                />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <input
                  id="addr-default"
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) =>
                    setForm({ ...form, isDefault: e.target.checked })
                  }
                  className="h-4 w-4 rounded border border-input"
                />
                <Label htmlFor="addr-default" className="cursor-pointer">
                  Set as default
                </Label>
              </div>
            </div>
            <div>
              <Label>Address *</Label>
              <Input
                value={form.line1}
                onChange={(e) => setForm({ ...form, line1: e.target.value })}
                placeholder="Street, building, area"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <Label>City</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>
              <div>
                <Label>Pincode</Label>
                <Input
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update" : "Save"}
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-3 p-6">
          {loading && (
            <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
          )}
          {!loading && addresses.length === 0 && !showForm && (
            <div className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              <MapPin className="mx-auto mb-2 h-8 w-8 opacity-40" />
              No addresses yet. Click &quot;New Address&quot; to add one.
            </div>
          )}
          {addresses.map((addr) => {
            const isSelected = selectedAddressId === addr.id;
            return (
              <div
                key={addr.id}
                className={`rounded-lg border p-4 transition-colors ${
                  isSelected
                    ? "border-rubick-primary bg-rubick-primary/5"
                    : "border-[var(--border)] bg-[var(--card)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {addr.label && (
                        <span className="font-semibold">{addr.label}</span>
                      )}
                      {addr.isDefault && (
                        <span className="inline-flex items-center rounded-full bg-rubick-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rubick-success">
                          Default
                        </span>
                      )}
                      {isSelected && (
                        <span className="inline-flex items-center rounded-full bg-rubick-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rubick-primary">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[var(--card-foreground)]">
                      {formatLine(addr)}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    {onSelect && (
                      <Button
                        size="sm"
                        variant={isSelected ? "outline" : "default"}
                        onClick={() => {
                          onSelect(addr);
                          onClose();
                        }}
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        {isSelected ? "Selected" : "Use"}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(addr)}
                      aria-label="Edit address"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(addr.id)}
                      aria-label="Delete address"
                    >
                      <Trash2 className="h-4 w-4 text-rubick-danger" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function formatAddressSnapshot(addr: CustomerAddress | null): string {
  if (!addr) return "";
  const locationParts = [addr.line1, addr.city, addr.state, addr.pincode]
    .map((part) => (part ?? "").trim())
    .filter(Boolean);
  const location = locationParts.join(", ");
  return addr.label ? `${addr.label} - ${location}` : location;
}
