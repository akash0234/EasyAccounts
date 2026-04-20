"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

interface FinancialYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [fys, setFys] = useState<FinancialYear[]>([]);

  useEffect(() => {
    fetch("/api/financial-years")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setFys(data); });
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Settings</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Company Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-slate-500">Company:</span> {session?.user?.companyName}</div>
            <div><span className="text-slate-500">User:</span> {session?.user?.name}</div>
            <div><span className="text-slate-500">Email:</span> {session?.user?.email}</div>
            <div><span className="text-slate-500">Role:</span> {session?.user?.role}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Financial Years</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fys.map((fy) => (
                <div key={fy.id} className="flex items-center justify-between text-sm p-2 rounded border">
                  <span className="font-medium">{fy.label}</span>
                  <span>
                    {new Date(fy.startDate).toLocaleDateString("en-IN")} - {new Date(fy.endDate).toLocaleDateString("en-IN")}
                  </span>
                  {fy.isActive && <Badge variant="paid">Active</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
