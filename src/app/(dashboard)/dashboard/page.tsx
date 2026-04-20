"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  FileText,
  Receipt,
  Truck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Customer {
  id: string;
}

interface Vendor {
  id: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  customer?: { name: string } | null;
}

interface Payment {
  id: string;
  paymentNumber: string;
  date: string;
  amount: number;
  method: string;
  customer?: { name: string } | null;
  vendor?: { name: string } | null;
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function getInvoiceBadge(status: string) {
  if (status === "PAID") {
    return "paid";
  }
  if (status === "PARTIAL") {
    return "partial";
  }
  return "unpaid";
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const [custRes, vendRes, invRes, payRes] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/vendors"),
          fetch("/api/invoices?type=SALES"),
          fetch("/api/payments?type=RECEIVED"),
        ]);
        const [customerData, vendorData, invoiceData, paymentData] =
          await Promise.all([
            custRes.json(),
            vendRes.json(),
            invRes.json(),
            payRes.json(),
          ]);

        setCustomers(Array.isArray(customerData) ? customerData : []);
        setVendors(Array.isArray(vendorData) ? vendorData : []);
        setInvoices(Array.isArray(invoiceData) ? invoiceData : []);
        setPayments(Array.isArray(paymentData) ? paymentData : []);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  const totalSales = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const totalCollected = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const outstanding = invoices.reduce(
    (sum, invoice) => sum + Math.max(invoice.totalAmount - invoice.paidAmount, 0),
    0
  );
  const averageTicket = invoices.length ? totalSales / invoices.length : 0;
  const collectionRate = totalSales > 0 ? Math.min((totalCollected / totalSales) * 100, 100) : 0;
  const receivableRate = totalSales > 0 ? Math.min((outstanding / totalSales) * 100, 100) : 0;
  const recentInvoices = invoices.slice(0, 5);
  const recentPayments = payments.slice(0, 5);
  const pendingInvoices = invoices.filter((invoice) => invoice.status !== "PAID").slice(0, 4);

  const statCards = [
    {
      label: "Customers",
      value: customers.length.toLocaleString("en-IN"),
      meta: "Ledger-linked party masters",
      icon: Users,
      iconClass: "bg-rubick-primary/10 text-rubick-primary",
    },
    {
      label: "Vendors",
      value: vendors.length.toLocaleString("en-IN"),
      meta: "Suppliers configured for purchases",
      icon: Truck,
      iconClass: "bg-rubick-success/15 text-green-700",
    },
    {
      label: "Sales Invoices",
      value: invoices.length.toLocaleString("en-IN"),
      meta: "Raised in the current workspace",
      icon: FileText,
      iconClass: "bg-rubick-pending/15 text-orange-700",
    },
    {
      label: "Payments Received",
      value: payments.length.toLocaleString("en-IN"),
      meta: "Receipts recorded and allocated",
      icon: CreditCard,
      iconClass: "bg-rubick-info/15 text-cyan-700",
    },
  ];

  const quickLinks = [
    {
      href: "/sales",
      title: "Create sales invoice",
      description: "Raise a GST invoice and post it to the ledger.",
    },
    {
      href: "/payments",
      title: "Record collection",
      description: "Capture receipts and allocate them against dues.",
    },
    {
      href: "/customers",
      title: "Add customer",
      description: "Create a new party master with opening balance.",
    },
  ];

  return (
    <>
      <section className="rubick-hero">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-end">
          <div className="max-w-2xl">
            <div className="rubick-eyebrow text-white/65">Business Snapshot</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Run billing, collections, and ledgers from one workspace.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-50/85 sm:text-base">
              Your `Source` template styling is now mapped into the EasyAccounts
              dashboard shell, while the figures below come from your live
              customers, invoices, and payment records.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild variant="secondary" className="rounded-full">
                <Link href="/sales">Create invoice</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              >
                <Link href="/payments">Record payment</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rubick-hero-card">
              <div className="text-xs uppercase tracking-[0.24em] text-white/60">
                Billed Value
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {formatCurrency(totalSales)}
              </div>
              <div className="mt-2 text-sm text-blue-50/80">
                Across {invoices.length} sales invoices
              </div>
            </div>
            <div className="rubick-hero-card">
              <div className="text-xs uppercase tracking-[0.24em] text-white/60">
                Collections
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {formatCurrency(totalCollected)}
              </div>
              <div className="mt-2 text-sm text-blue-50/80">
                {collectionRate.toFixed(0)}% recovered against billed sales
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.label} className="rubick-stat-card shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-500">
                    {card.label}
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-slate-900">
                    {loading ? "..." : card.value}
                  </div>
                  <div className="mt-2 text-sm text-slate-500">{card.meta}</div>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.iconClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rubick-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="rubick-eyebrow text-slate-400">Revenue Pulse</div>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">
                Billing and cash movement
              </h3>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
              Live overview
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rubick-panel-muted">
              <div className="text-sm text-slate-500">Billed this cycle</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {formatCurrency(totalSales)}
              </div>
              <div className="mt-4 rubick-progress">
                <span style={{ width: "100%" }} />
              </div>
            </div>
            <div className="rubick-panel-muted">
              <div className="text-sm text-slate-500">Collected</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {formatCurrency(totalCollected)}
              </div>
              <div className="mt-4 rubick-progress">
                <span style={{ width: `${collectionRate}%` }} />
              </div>
            </div>
            <div className="rubick-panel-muted">
              <div className="text-sm text-slate-500">Outstanding</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {formatCurrency(outstanding)}
              </div>
              <div className="mt-4 rubick-progress">
                <span
                  style={{ width: `${receivableRate}%` }}
                  className="bg-rubick-pending"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rubick-panel-muted">
              <div className="text-sm text-slate-500">Average invoice size</div>
              <div className="mt-2 text-xl font-semibold text-slate-900">
                {formatCurrency(averageTicket)}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Helpful for spotting whether invoice volume is growing because
                of ticket size or customer count.
              </p>
            </div>

            <div className="rubick-panel-muted">
              <div className="text-sm text-slate-500">Pending collections</div>
              <div className="mt-3 rubick-list">
                {pendingInvoices.length > 0 ? (
                  pendingInvoices.map((invoice) => (
                    <div key={invoice.id} className="rubick-list-item">
                      <div className="flex-1">
                        <div className="font-medium text-slate-800">
                          {invoice.customer?.name ?? invoice.invoiceNumber}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {invoice.invoiceNumber} • {formatDate(invoice.date)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-800">
                          {formatCurrency(
                            Math.max(invoice.totalAmount - invoice.paidAmount, 0)
                          )}
                        </div>
                        <Badge variant={getInvoiceBadge(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
                    No outstanding sales invoices right now.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rubick-panel">
          <div className="rubick-eyebrow text-slate-400">Action Hub</div>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">
            Move faster through daily work
          </h3>
          <div className="mt-6 grid gap-3">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href} className="rubick-quick-link">
                <div>
                  <div className="font-medium text-slate-800">{link.title}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {link.description}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-slate-900 px-5 py-4 text-white">
            <div className="text-xs uppercase tracking-[0.24em] text-white/50">
              Ledger-first reminder
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              Every invoice and payment here updates the books, so the dashboard
              stays close to the actual accounting flow instead of becoming a
              separate reporting layer.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rubick-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="rubick-eyebrow text-slate-400">
                Recent Invoices
              </div>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">
                Latest sales documents
              </h3>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href="/sales">View all</Link>
            </Button>
          </div>

          <div className="mt-6 rubick-list">
            {recentInvoices.length > 0 ? (
              recentInvoices.map((invoice) => (
                <div key={invoice.id} className="rubick-list-item">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rubick-primary/10 text-rubick-primary">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-800">
                        {invoice.invoiceNumber}
                      </span>
                      <Badge variant={getInvoiceBadge(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                    <div className="mt-1 truncate text-sm text-slate-500">
                      {invoice.customer?.name ?? "Customer not linked"} •{" "}
                      {formatDate(invoice.date)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-800">
                      {formatCurrency(invoice.totalAmount)}
                    </div>
                    <div className="text-xs text-slate-500">
                      Paid {formatCurrency(invoice.paidAmount)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No sales invoices yet. Create your first invoice to populate the
                dashboard.
              </div>
            )}
          </div>
        </div>

        <div className="rubick-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="rubick-eyebrow text-slate-400">
                Collection Feed
              </div>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">
                Latest payment receipts
              </h3>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href="/payments">Open payments</Link>
            </Button>
          </div>

          <div className="mt-6 rubick-list">
            {recentPayments.length > 0 ? (
              recentPayments.map((payment) => (
                <div key={payment.id} className="rubick-list-item">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rubick-info/15 text-cyan-700">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-800">
                      {payment.customer?.name ??
                        payment.vendor?.name ??
                        payment.paymentNumber}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {payment.paymentNumber} • {payment.method} •{" "}
                      {formatDate(payment.date)}
                    </div>
                  </div>
                  <div className="text-right font-semibold text-slate-800">
                    {formatCurrency(payment.amount)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No receipts recorded yet. Add a payment to start the collection
                trail.
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
