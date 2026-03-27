"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Truck, FileText, CreditCard } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    customers: 0,
    vendors: 0,
    salesInvoices: 0,
    paymentsReceived: 0,
  });

  useEffect(() => {
    async function loadStats() {
      const [custRes, vendRes, invRes, payRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/vendors"),
        fetch("/api/invoices?type=SALES"),
        fetch("/api/payments?type=RECEIVED"),
      ]);
      const [customers, vendors, invoices, payments] = await Promise.all([
        custRes.json(),
        vendRes.json(),
        invRes.json(),
        payRes.json(),
      ]);
      setStats({
        customers: Array.isArray(customers) ? customers.length : 0,
        vendors: Array.isArray(vendors) ? vendors.length : 0,
        salesInvoices: Array.isArray(invoices) ? invoices.length : 0,
        paymentsReceived: Array.isArray(payments) ? payments.length : 0,
      });
    }
    loadStats();
  }, []);

  const cards = [
    { title: "Customers", value: stats.customers, icon: Users, color: "text-blue-600" },
    { title: "Vendors", value: stats.vendors, icon: Truck, color: "text-green-600" },
    { title: "Sales Invoices", value: stats.salesInvoices, icon: FileText, color: "text-purple-600" },
    { title: "Payments Received", value: stats.paymentsReceived, icon: CreditCard, color: "text-orange-600" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{card.title}</CardTitle>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
