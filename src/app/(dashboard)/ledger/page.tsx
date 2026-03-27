"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowLeft } from "lucide-react";

interface LedgerAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  customer?: { name: string } | null;
  vendor?: { name: string } | null;
}

interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balanceAfter: number;
  referenceType: string | null;
}

export default function LedgerPage() {
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<LedgerAccount | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/ledger").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setAccounts(data);
    });
  }, []);

  async function viewAccount(account: LedgerAccount) {
    setSelectedAccount(account);
    const res = await fetch(`/api/ledger?accountId=${account.id}`);
    const data = await res.json();
    if (Array.isArray(data)) setEntries(data);
  }

  const fmt = (n: number) => n.toLocaleString("en-IN", { style: "currency", currency: "INR" });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN");

  const filtered = accounts.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) || a.type.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedAccount) {
    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setSelectedAccount(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{selectedAccount.name}</h2>
            <p className="text-sm text-gray-500">{selectedAccount.type} Account | Balance: {fmt(selectedAccount.balance)}</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Description</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-right p-3 font-medium">Debit</th>
                    <th className="text-right p-3 font-medium">Credit</th>
                    <th className="text-right p-3 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{fmtDate(e.date)}</td>
                      <td className="p-3">{e.description}</td>
                      <td className="p-3"><span className="text-xs bg-gray-100 px-2 py-1 rounded">{e.referenceType || "-"}</span></td>
                      <td className="p-3 text-right text-red-600">{e.debit > 0 ? fmt(e.debit) : "-"}</td>
                      <td className="p-3 text-right text-green-600">{e.credit > 0 ? fmt(e.credit) : "-"}</td>
                      <td className="p-3 text-right font-medium">{fmt(e.balanceAfter)}</td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr><td colSpan={6} className="p-6 text-center text-gray-500">No entries yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Ledger Accounts</h2>
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input className="pl-9" placeholder="Search accounts..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((account) => (
          <Card key={account.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => viewAccount(account)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{account.name}</CardTitle>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{account.type}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{fmt(account.balance)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
