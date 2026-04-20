"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
            <Table className="min-w-full table-fixed">
              <colgroup>
                <col className="w-[8rem]" />
                <col />
                <col className="w-[10rem]" />
                <col className="w-[9rem]" />
                <col className="w-[9rem]" />
                <col className="w-[10rem]" />
              </colgroup>
              <TableHead>
                <TableRow>
                  <TableHeader className="rounded-l-md bg-rubick-primary text-white">
                    Date
                  </TableHeader>
                  <TableHeader className="bg-rubick-primary text-white">
                    Description
                  </TableHeader>
                  <TableHeader className="bg-rubick-primary text-white">
                    Type
                  </TableHeader>
                  <TableHeader className="bg-rubick-primary text-right text-white">
                    Debit
                  </TableHeader>
                  <TableHeader className="bg-rubick-primary text-right text-white">
                    Credit
                  </TableHeader>
                  <TableHeader className="rounded-r-md bg-rubick-primary text-right text-white">
                    Balance
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap align-middle">
                      {fmtDate(e.date)}
                    </TableCell>
                    <TableCell className="align-middle">{e.description}</TableCell>
                    <TableCell className="align-middle">
                      <Badge variant="secondary">{e.referenceType || "-"}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap align-middle text-right text-rubick-danger">
                      {e.debit > 0 ? fmt(e.debit) : "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap align-middle text-right text-rubick-success">
                      {e.credit > 0 ? fmt(e.credit) : "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap align-middle text-right font-medium">
                      {fmt(e.balanceAfter)}
                    </TableCell>
                  </TableRow>
                ))}
                {entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-slate-400">
                      No entries yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
                <Badge variant="secondary">{account.type}</Badge>
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
