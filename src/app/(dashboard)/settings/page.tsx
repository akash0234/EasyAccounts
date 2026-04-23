"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FinancialYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface OrganizationCompanyMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface OrganizationCompany {
  id: string;
  name: string;
  gstin: string | null;
  email: string | null;
  phone: string | null;
  members: OrganizationCompanyMember[];
}

interface OrganizationResponse {
  organization: {
    id: string;
    name: string;
    role: string;
  };
  companies: OrganizationCompany[];
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [fys, setFys] = useState<FinancialYear[]>([]);
  const [organizationData, setOrganizationData] = useState<OrganizationResponse | null>(null);
  const [companyError, setCompanyError] = useState("");
  const [userError, setUserError] = useState("");
  const [companySuccess, setCompanySuccess] = useState("");
  const [userSuccess, setUserSuccess] = useState("");
  const [companyLoading, setCompanyLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);

  const canManageOrganization =
    session?.user.organizationRole === "OWNER" ||
    session?.user.organizationRole === "ADMIN";

  const loadData = useCallback(async () => {
    const [financialYearsResponse, organizationResponse] = await Promise.all([
      fetch("/api/financial-years"),
      fetch("/api/organization"),
    ]);

    const financialYears = await financialYearsResponse.json();
    const organization = await organizationResponse.json();

    if (Array.isArray(financialYears)) {
      setFys(financialYears);
    }

    if (organizationResponse.ok) {
      setOrganizationData(organization);
    }
  }, []);

  useEffect(() => {
    void Promise.all([fetch("/api/financial-years"), fetch("/api/organization")]).then(
      async ([financialYearsResponse, organizationResponse]) => {
        const financialYears = await financialYearsResponse.json();
        const organization = await organizationResponse.json();

        if (Array.isArray(financialYears)) {
          setFys(financialYears);
        }

        if (organizationResponse.ok) {
          setOrganizationData(organization);
        }
      }
    );
  }, []);

  async function handleCompanyCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCompanyLoading(true);
    setCompanyError("");
    setCompanySuccess("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/organization/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        gstin: formData.get("gstin"),
        email: formData.get("email"),
        phone: formData.get("phone"),
      }),
    });

    const data = await response.json();
    setCompanyLoading(false);

    if (!response.ok) {
      setCompanyError(data.error || "Unable to create company");
      return;
    }

    event.currentTarget.reset();
    setCompanySuccess("Company created successfully");
    await loadData();
  }

  async function handleUserCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUserLoading(true);
    setUserError("");
    setUserSuccess("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/organization/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
        companyId: formData.get("companyId"),
        role: formData.get("role"),
      }),
    });

    const data = await response.json();
    setUserLoading(false);

    if (!response.ok) {
      setUserError(data.error || "Unable to create company user");
      return;
    }

    event.currentTarget.reset();
    setUserSuccess("Company user created successfully");
    await loadData();
  }

  async function switchCompany(companyId: string) {
    await update({ activeCompanyId: companyId });
    router.refresh();
    await loadData();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="mt-1 text-sm text-slate-500">
          Manage your organization, company access, and active workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-slate-500">Organization:</span>{" "}
              {session?.user.organizationName}
            </div>
            <div>
              <span className="text-slate-500">Organization Role:</span>{" "}
              {session?.user.organizationRole}
            </div>
            <div>
              <span className="text-slate-500">Active Company:</span>{" "}
              {session?.user.companyName}
            </div>
            <div>
              <span className="text-slate-500">Company Role:</span>{" "}
              {session?.user.companyRole}
            </div>
            <div>
              <span className="text-slate-500">User:</span> {session?.user.name}
            </div>
            <div>
              <span className="text-slate-500">Email:</span> {session?.user.email}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Years</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fys.map((fy) => (
                <div
                  key={fy.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-sm"
                >
                  <span className="font-medium">{fy.label}</span>
                  <span>
                    {new Date(fy.startDate).toLocaleDateString("en-IN")} -{" "}
                    {new Date(fy.endDate).toLocaleDateString("en-IN")}
                  </span>
                  {fy.isActive && <Badge variant="paid">Active</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Companies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {organizationData?.companies.map((company) => {
            const isActive = company.id === session?.user.companyId;

            return (
              <div key={company.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800">{company.name}</h3>
                      {isActive && <Badge variant="paid">Active</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {company.email || "No email"}{company.phone ? ` - ${company.phone}` : ""}
                    </p>
                  </div>
                  {!isActive && (
                    <Button type="button" variant="outline" onClick={() => switchCompany(company.id)}>
                      Switch To Company
                    </Button>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                    Company Members
                  </p>
                  {company.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                    >
                      <div>
                        <div className="font-medium text-slate-700">{member.name}</div>
                        <div className="text-slate-500">{member.email}</div>
                      </div>
                      <Badge variant={member.role === "ADMIN" ? "default" : "secondary"}>
                        {member.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {canManageOrganization && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Create Company</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleCompanyCreate}>
                {companyError && (
                  <div className="rounded-md bg-rubick-danger/10 p-3 text-sm text-rubick-danger">
                    {companyError}
                  </div>
                )}
                {companySuccess && (
                  <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
                    {companySuccess}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input id="company-name" name="name" required placeholder="Acme Retail LLP" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company-gstin">GSTIN</Label>
                  <Input id="company-gstin" name="gstin" placeholder="Optional" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company-email">Email</Label>
                  <Input id="company-email" name="email" type="email" placeholder="accounts@company.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company-phone">Phone</Label>
                  <Input id="company-phone" name="phone" placeholder="Optional" />
                </div>
                <Button type="submit" disabled={companyLoading}>
                  {companyLoading ? "Creating..." : "Create Company"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create Company User</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleUserCreate}>
                {userError && (
                  <div className="rounded-md bg-rubick-danger/10 p-3 text-sm text-rubick-danger">
                    {userError}
                  </div>
                )}
                {userSuccess && (
                  <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
                    {userSuccess}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="user-name">Name</Label>
                  <Input id="user-name" name="name" required placeholder="Priya Sharma" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="user-email">Email</Label>
                  <Input id="user-email" name="email" type="email" required placeholder="user@company.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="user-password">Password</Label>
                  <Input id="user-password" name="password" type="password" required minLength={6} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="user-company">Company</Label>
                  <select
                    id="user-company"
                    name="companyId"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select company
                    </option>
                    {organizationData?.companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="user-role">Company Role</Label>
                  <select
                    id="user-role"
                    name="role"
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
                    defaultValue="USER"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="USER">USER</option>
                  </select>
                </div>
                <Button type="submit" disabled={userLoading}>
                  {userLoading ? "Creating..." : "Create Company User"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
