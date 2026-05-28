"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Receipt, Save, Trash2, X } from "lucide-react";

export interface AdditionalCharge {
  templateId?: string;
  name: string;
  hsnSac: string;
  amount: number;
  discountAmount: number;
  gstPercent: number;
}

interface ChargeTemplate {
  id: string;
  name: string;
  hsnSac?: string | null;
  defaultAmount: number;
  defaultDiscountAmount: number;
  gstPercent: number;
}

interface ChargeMasterForm {
  name: string;
  hsnSac: string;
  defaultAmount: string;
  defaultDiscountAmount: string;
  gstPercent: string;
}

export const emptyAdditionalCharge: AdditionalCharge = {
  name: "",
  hsnSac: "",
  amount: 0,
  discountAmount: 0,
  gstPercent: 0,
};

const emptyMasterForm: ChargeMasterForm = {
  name: "",
  hsnSac: "",
  defaultAmount: "0",
  defaultDiscountAmount: "0",
  gstPercent: "0",
};

interface Props {
  initial: AdditionalCharge[];
  onSave: (charges: AdditionalCharge[]) => void;
  onClose: () => void;
}

export function AdditionalChargesModal({ initial, onSave, onClose }: Props) {
  const [rows, setRows] = useState<AdditionalCharge[]>(initial);
  const [templates, setTemplates] = useState<ChargeTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [masterForm, setMasterForm] = useState<ChargeMasterForm>(emptyMasterForm);
  const [savingMaster, setSavingMaster] = useState(false);

  useEffect(() => {
    setRows(initial);
  }, [initial]);

  useEffect(() => {
    let cancelled = false;

    async function loadTemplates() {
      setLoadingTemplates(true);
      try {
        const res = await fetch("/api/additional-charges");
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setTemplates(data);
        }
      } finally {
        if (!cancelled) {
          setLoadingTemplates(false);
        }
      }
    }

    void loadTemplates();

    return () => {
      cancelled = true;
    };
  }, []);

  function patchRow(idx: number, patch: Partial<AdditionalCharge>) {
    setRows((prev) =>
      prev.map((row, rowIdx) =>
        rowIdx === idx ? { ...row, ...patch } : row
      )
    );
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, rowIdx) => rowIdx !== idx));
  }

  function addCustomRow() {
    setRows((prev) => [...prev, { ...emptyAdditionalCharge }]);
  }

  function addTemplate(template: ChargeTemplate) {
    setRows((prev) => [
      ...prev,
      {
        templateId: template.id,
        name: template.name,
        hsnSac: template.hsnSac ?? "",
        amount: template.defaultAmount,
        discountAmount: template.defaultDiscountAmount,
        gstPercent: template.gstPercent,
      },
    ]);
  }

  function lineTotal(row: AdditionalCharge) {
    const taxable = Math.max(row.amount - row.discountAmount, 0);
    return taxable + (taxable * row.gstPercent) / 100;
  }

  async function saveMasterCharge() {
    if (!masterForm.name.trim()) {
      return;
    }

    setSavingMaster(true);
    try {
      const res = await fetch("/api/additional-charges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: masterForm.name.trim(),
          hsnSac: masterForm.hsnSac.trim(),
          defaultAmount: Number(masterForm.defaultAmount) || 0,
          defaultDiscountAmount: Number(masterForm.defaultDiscountAmount) || 0,
          gstPercent: Number(masterForm.gstPercent) || 0,
        }),
      });

      if (!res.ok) {
        return;
      }

      const saved = await res.json();
      setTemplates((prev) => {
        const without = prev.filter((item) => item.id !== saved.id);
        return [...without, saved].sort((a, b) => a.name.localeCompare(b.name));
      });
      setMasterForm(emptyMasterForm);
    } finally {
      setSavingMaster(false);
    }
  }

  function handleSave() {
    const cleaned = rows
      .map((row) => ({
        ...row,
        name: row.name.trim(),
        hsnSac: row.hsnSac.trim(),
        amount: Number.isFinite(row.amount) ? row.amount : 0,
        discountAmount: Number.isFinite(row.discountAmount)
          ? row.discountAmount
          : 0,
        gstPercent: Number.isFinite(row.gstPercent) ? row.gstPercent : 0,
      }))
      .filter((row) => row.name && row.amount > 0);

    onSave(cleaned);
    onClose();
  }

  const grandTotal = rows.reduce((sum, row) => sum + lineTotal(row), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="m-4 max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-[var(--card)] text-[var(--card-foreground)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] p-6">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Receipt className="h-5 w-5 text-[var(--muted-foreground)]" />
              Additional Charges
            </h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              Select saved charges, then change amount, discount, or GST if
              needed.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-5 p-6">
          <div className="space-y-3 rounded-lg border border-[var(--border)] p-4">
            <div>
              <p className="text-sm font-medium">Save Additional Charge Master</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Create reusable master data for freight, packing, loading, and
                other charges.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              <div>
                <Label className="text-xs">Charge Name</Label>
                <Input
                  value={masterForm.name}
                  onChange={(e) =>
                    setMasterForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Freight"
                />
              </div>
              <div>
                <Label className="text-xs">HSN/SAC</Label>
                <Input
                  value={masterForm.hsnSac}
                  onChange={(e) =>
                    setMasterForm((prev) => ({ ...prev, hsnSac: e.target.value }))
                  }
                  placeholder="996511"
                />
              </div>
              <div>
                <Label className="text-xs">Default Amount</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={masterForm.defaultAmount}
                  onChange={(e) =>
                    setMasterForm((prev) => ({
                      ...prev,
                      defaultAmount: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Default Discount</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={masterForm.defaultDiscountAmount}
                  onChange={(e) =>
                    setMasterForm((prev) => ({
                      ...prev,
                      defaultDiscountAmount: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs">GST %</Label>
                <Input
                  type="number"
                  min={0}
                  max={28}
                  step="0.01"
                  value={masterForm.gstPercent}
                  onChange={(e) =>
                    setMasterForm((prev) => ({
                      ...prev,
                      gstPercent: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => void saveMasterCharge()}
                disabled={!masterForm.name.trim() || savingMaster}
              >
                <Save className="mr-1 h-3.5 w-3.5" />
                {savingMaster ? "Saving..." : "Save Master Charge"}
              </Button>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-[var(--border)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Saved Charge List</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Pick from the saved charges in your database.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addCustomRow}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Custom Charge
              </Button>
            </div>

            {loadingTemplates ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                Loading saved charges...
              </p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                No saved charges found yet.
              </p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => addTemplate(template)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-3 text-left transition hover:border-rubick-primary hover:bg-rubick-primary/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-[var(--muted-foreground)]">
                          {template.hsnSac ? `HSN/SAC ${template.hsnSac} · ` : ""}
                          GST {template.gstPercent}%
                        </div>
                      </div>
                      <div className="text-right text-sm font-medium">
                        {template.defaultAmount.toLocaleString("en-IN", {
                          style: "currency",
                          currency: "INR",
                        })}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 overflow-x-auto rounded-lg border border-[var(--border)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Selected Charges</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  These will be shown below the product line items.
                </p>
              </div>
              <div className="text-sm text-[var(--muted-foreground)]">
                Total (incl. GST):{" "}
                <span className="font-semibold text-[var(--card-foreground)]">
                  {grandTotal.toLocaleString("en-IN", {
                    style: "currency",
                    currency: "INR",
                  })}
                </span>
              </div>
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                No charges selected yet.
              </p>
            ) : (
              <div className="min-w-[860px] space-y-2">
                {rows.map((row, idx) => (
                  <div key={`${row.templateId ?? row.name}-${idx}`} className="flex items-end gap-2">
                    <div className="w-[220px] shrink-0">
                      {idx === 0 && <Label className="text-xs">Particulars *</Label>}
                      <Input
                        value={row.name}
                        onChange={(e) => patchRow(idx, { name: e.target.value })}
                        placeholder="Charge name"
                      />
                    </div>
                    <div className="w-[130px] shrink-0">
                      {idx === 0 && <Label className="text-xs">HSN/SAC</Label>}
                      <Input
                        value={row.hsnSac}
                        onChange={(e) => patchRow(idx, { hsnSac: e.target.value })}
                        placeholder="996511"
                      />
                    </div>
                    <div className="w-[120px] shrink-0">
                      {idx === 0 && <Label className="text-xs">Amount *</Label>}
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.amount}
                        onChange={(e) =>
                          patchRow(idx, { amount: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="w-[120px] shrink-0">
                      {idx === 0 && <Label className="text-xs">Discount</Label>}
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.discountAmount}
                        onChange={(e) =>
                          patchRow(idx, { discountAmount: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="w-[100px] shrink-0">
                      {idx === 0 && <Label className="text-xs">GST %</Label>}
                      <Input
                        type="number"
                        min={0}
                        max={28}
                        step="0.01"
                        value={row.gstPercent}
                        onChange={(e) =>
                          patchRow(idx, { gstPercent: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="w-[120px] shrink-0 pt-1 text-right text-sm font-medium">
                      {lineTotal(row).toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                      })}
                    </div>
                    <div className="w-[40px] shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(idx)}
                        aria-label="Remove charge"
                      >
                        <Trash2 className="h-4 w-4 text-rubick-danger" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border)] p-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Apply Charges
          </Button>
        </div>
      </div>
    </div>
  );
}
