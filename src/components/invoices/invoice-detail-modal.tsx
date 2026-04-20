"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export interface InvoiceDetailItem {
  description: string;
  quantity: number;
  rate: number;
  amount?: number;
  gstPercent?: number;
  gstAmount?: number;
}

export interface InvoiceDetailParty {
  name: string;
  gstin?: string | null;
  phone?: string | null;
  address?: string | null;
  billingAddress?: string | null;
  city?: string | null;
}

export interface InvoiceDetailFacility {
  name: string;
  address?: string | null;
}

export interface InvoiceDetailData {
  invoiceNumber: string;
  date: string;
  dueDate?: string | null;
  subtotal?: number | null;
  taxAmount?: number | null;
  totalAmount: number;
  paidAmount: number;
  status: string;
  notes?: string | null;
  customer?: InvoiceDetailParty | null;
  vendor?: InvoiceDetailParty | null;
  facility?: InvoiceDetailFacility | null;
  items?: InvoiceDetailItem[];
}

interface InvoiceDetailModalProps {
  invoice: InvoiceDetailData;
  onClose: () => void;
}

export function InvoiceDetailModal({ invoice, onClose }: InvoiceDetailModalProps) {
  const fmt = (value: number) => value.toLocaleString("en-IN", { style: "currency", currency: "INR" });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-[var(--card)] text-[var(--card-foreground)] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div>
            <h3 className="text-lg font-bold">{invoice.invoiceNumber}</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              {new Date(invoice.date).toLocaleDateString("en-IN")}
              {invoice.dueDate && (
                <> &middot; Due: {new Date(invoice.dueDate).toLocaleDateString("en-IN")}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant={
                invoice.status === "PAID"
                  ? "paid"
                  : invoice.status === "PARTIAL"
                    ? "partial"
                    : "unpaid"
              }
            >
              {invoice.status}
            </Badge>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-4 px-6 pt-4 md:grid-cols-2">
          {invoice.customer && (
            <div>
              <p className="text-sm font-medium text-[var(--muted-foreground)]">Customer</p>
              <p className="font-semibold">{invoice.customer.name}</p>
              {invoice.customer.gstin && (
                <p className="text-xs text-[var(--muted-foreground)]">GSTIN: {invoice.customer.gstin}</p>
              )}
              {invoice.customer.phone && (
                <p className="text-xs text-[var(--muted-foreground)]">Phone: {invoice.customer.phone}</p>
              )}
              {(invoice.customer.billingAddress || invoice.customer.address) && (
                <p className="text-xs text-[var(--muted-foreground)]">
                  {invoice.customer.billingAddress ?? invoice.customer.address}
                  {invoice.customer.city ? `, ${invoice.customer.city}` : ""}
                </p>
              )}
            </div>
          )}

          {invoice.vendor && (
            <div>
              <p className="text-sm font-medium text-[var(--muted-foreground)]">Vendor</p>
              <p className="font-semibold">{invoice.vendor.name}</p>
              {invoice.vendor.gstin && (
                <p className="text-xs text-[var(--muted-foreground)]">GSTIN: {invoice.vendor.gstin}</p>
              )}
              {invoice.vendor.phone && (
                <p className="text-xs text-[var(--muted-foreground)]">Phone: {invoice.vendor.phone}</p>
              )}
              {(invoice.vendor.address || invoice.vendor.billingAddress) && (
                <p className="text-xs text-[var(--muted-foreground)]">
                  {invoice.vendor.address ?? invoice.vendor.billingAddress}
                  {invoice.vendor.city ? `, ${invoice.vendor.city}` : ""}
                </p>
              )}
            </div>
          )}

          {invoice.facility && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-[var(--muted-foreground)]">Facility</p>
              <p className="font-semibold">{invoice.facility.name}</p>
              {invoice.facility.address && (
                <p className="text-xs text-[var(--muted-foreground)]">{invoice.facility.address}</p>
              )}
            </div>
          )}
        </div>

        <div className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                <th className="py-2 text-left font-medium">#</th>
                <th className="py-2 text-left font-medium">Description</th>
                <th className="py-2 text-right font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Rate</th>
                <th className="py-2 text-right font-medium">GST %</th>
                <th className="py-2 text-right font-medium">GST Amt</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items ?? []).map((item, i) => {
                const baseAmount = item.amount ?? item.quantity * item.rate;
                const gstAmount = item.gstAmount ?? 0;
                return (
                  <tr key={i} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 text-[var(--muted-foreground)]">{i + 1}</td>
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{fmt(item.rate)}</td>
                    <td className="py-2 text-right">{item.gstPercent ?? 0}%</td>
                    <td className="py-2 text-right">{fmt(gstAmount)}</td>
                    <td className="py-2 text-right font-medium">{fmt(baseAmount + gstAmount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-1 border-t border-[var(--border)] px-6 pb-6 pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--muted-foreground)]">Subtotal</span>
            <span>{fmt(invoice.subtotal ?? 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--muted-foreground)]">Tax (GST)</span>
            <span>{fmt(invoice.taxAmount ?? 0)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-[var(--border)] pt-2 text-base font-bold">
            <span>Total</span>
            <span>{fmt(invoice.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--muted-foreground)]">Paid</span>
            <span className="text-green-600">{fmt(invoice.paidAmount)}</span>
          </div>
          {invoice.totalAmount - invoice.paidAmount > 0 && (
            <div className="flex justify-between text-sm font-medium">
              <span className="text-[var(--muted-foreground)]">Balance Due</span>
              <span className="text-red-600">{fmt(invoice.totalAmount - invoice.paidAmount)}</span>
            </div>
          )}
          {invoice.notes && (
            <p className="pt-2 text-xs text-[var(--muted-foreground)]">Notes: {invoice.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
}
