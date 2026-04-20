"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export interface FacilityStockBreakdown {
  facilityId: string;
  facilityName: string;
  currentStock: number;
}

export interface InventoryStockProduct {
  id: string;
  name: string;
  code: string | null;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  facilityStock?: FacilityStockBreakdown[];
}

interface FacilityStockModalProps {
  product: InventoryStockProduct;
  onClose: () => void;
}

export function FacilityStockModal({ product, onClose }: FacilityStockModalProps) {
  const facilityStock = product.facilityStock ?? [];
  const hasFacilityStock = facilityStock.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-[var(--card)] text-[var(--card-foreground)] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] p-6">
          <div>
            <h3 className="text-lg font-bold">{product.name}</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              {product.code ? `Code: ${product.code}` : "Product stock breakdown"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={product.currentStock <= product.reorderLevel ? "unpaid" : "paid"}>
              Total: {product.currentStock} {product.unit}
            </Badge>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="px-6 pt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Total stock</div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {product.currentStock} {product.unit}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Reorder level</div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {product.reorderLevel} {product.unit}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Facilities</div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {facilityStock.length}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-3 text-sm font-semibold text-slate-800">Facility-wise breakdown</div>
          {hasFacilityStock ? (
            <div className="space-y-2">
              {facilityStock.map((row) => (
                <div
                  key={row.facilityId}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div>
                    <div className="font-medium text-slate-900">{row.facilityName}</div>
                    <div className="text-xs text-slate-500">Location stock</div>
                  </div>
                  <Badge variant={row.currentStock <= 0 ? "unpaid" : "paid"}>
                    {row.currentStock} {product.unit}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              No facility stock recorded for this product.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
