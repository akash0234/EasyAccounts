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

type PaymentMethod = "CASH" | "BANK" | "UPI" | "CHEQUE";

interface CompanyPaymentSetting {
  id: string;
  type: PaymentMethod;
  label: string;
  isDefault: boolean;
  upiId: string | null;
  upiPayeeName: string | null;
  qrImageUrl: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankName: string | null;
  bankBranch: string | null;
  chequePayeeName: string | null;
  instructions: string | null;
}
interface OrganizationCompany {
  id: string;
  name: string;
  gstin: string | null;
  pan: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  paymentSettings: CompanyPaymentSetting[];
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
  const [activeCompanySaving, setActiveCompanySaving] = useState(false);
  const [activeCompanyError, setActiveCompanyError] = useState("");
  const [activeCompanySuccess, setActiveCompanySuccess] = useState("");
  const [activeCompanyForm, setActiveCompanyForm] = useState({
    name: "",
    gstin: "",
    pan: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentEditingId, setPaymentEditingId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    type: "UPI" as PaymentMethod,
    label: "",
    isDefault: false,
    upiId: "",
    upiPayeeName: "",
    qrImageUrl: "",
    bankAccountName: "",
    bankAccountNumber: "",
    bankIfsc: "",
    bankName: "",
    bankBranch: "",
    chequePayeeName: "",
    instructions: "",
  });

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

  const activeCompany =
    organizationData?.companies.find((company) => company.id === session?.user.companyId) ??
    null;

  useEffect(() => {
    if (!activeCompany) return;
    queueMicrotask(() => {
      setActiveCompanyForm({
        name: activeCompany.name ?? "",
        gstin: activeCompany.gstin ?? "",
        pan: activeCompany.pan ?? "",
        phone: activeCompany.phone ?? "",
        email: activeCompany.email ?? "",
        address: activeCompany.address ?? "",
        city: activeCompany.city ?? "",
        state: activeCompany.state ?? "",
        pincode: activeCompany.pincode ?? "",
      });
    });
  }, [activeCompany]);

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

  async function saveActiveCompanySettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActiveCompanySaving(true);
    setActiveCompanyError("");
    setActiveCompanySuccess("");

    const response = await fetch("/api/organization/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activeCompanyForm),
    });
    const data = await response.json();
    setActiveCompanySaving(false);

    if (!response.ok) {
      setActiveCompanyError(data.error || "Unable to update company settings");
      return;
    }

    setActiveCompanySuccess("Company invoice settings updated");
    await loadData();
  }

  function resetPaymentForm() {
    setPaymentEditingId(null);
    setPaymentForm({
      type: "UPI",
      label: "",
      isDefault: false,
      upiId: "",
      upiPayeeName: "",
      qrImageUrl: "",
      bankAccountName: "",
      bankAccountNumber: "",
      bankIfsc: "",
      bankName: "",
      bankBranch: "",
      chequePayeeName: "",
      instructions: "",
    });
  }

  function editPaymentSetting(paymentSetting: CompanyPaymentSetting) {
    setPaymentEditingId(paymentSetting.id);
    setPaymentForm({
      type: paymentSetting.type,
      label: paymentSetting.label,
      isDefault: paymentSetting.isDefault,
      upiId: paymentSetting.upiId ?? "",
      upiPayeeName: paymentSetting.upiPayeeName ?? "",
      qrImageUrl: paymentSetting.qrImageUrl ?? "",
      bankAccountName: paymentSetting.bankAccountName ?? "",
      bankAccountNumber: paymentSetting.bankAccountNumber ?? "",
      bankIfsc: paymentSetting.bankIfsc ?? "",
      bankName: paymentSetting.bankName ?? "",
      bankBranch: paymentSetting.bankBranch ?? "",
      chequePayeeName: paymentSetting.chequePayeeName ?? "",
      instructions: paymentSetting.instructions ?? "",
    });
  }

  async function handleQrUpload(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPaymentForm((current) => ({ ...current, qrImageUrl: String(reader.result ?? "") }));
    };
    reader.readAsDataURL(file);
  }

  async function savePaymentSetting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentSaving(true);
    setActiveCompanyError("");
    setActiveCompanySuccess("");

    const response = await fetch(
      paymentEditingId
        ? `/api/organization/payment-settings/${paymentEditingId}`
        : "/api/organization/payment-settings",
      {
        method: paymentEditingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentForm),
      }
    );
    const data = await response.json();
    setPaymentSaving(false);

    if (!response.ok) {
      setActiveCompanyError(data.error || "Unable to save payment setting");
      return;
    }

    setActiveCompanySuccess("Payment setting saved");
    resetPaymentForm();
    await loadData();
  }

  async function deletePaymentSetting(id: string) {
    setActiveCompanyError("");
    setActiveCompanySuccess("");
    const response = await fetch(`/api/organization/payment-settings/${id}`, {
      method: "DELETE",
    });
    const data = await response.json();

    if (!response.ok) {
      setActiveCompanyError(data.error || "Unable to delete payment setting");
      return;
    }

    setActiveCompanySuccess("Payment setting deleted");
    if (paymentEditingId === id) resetPaymentForm();
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

      {activeCompany && session?.user.companyRole === "ADMIN" && (
        <Card>
          <CardHeader>
            <CardTitle>Active Company Invoice Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={saveActiveCompanySettings}>
              {activeCompanyError && (
                <div className="rounded-md bg-rubick-danger/10 p-3 text-sm text-rubick-danger">
                  {activeCompanyError}
                </div>
              )}
              {activeCompanySuccess && (
                <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
                  {activeCompanySuccess}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>Company Name</Label>
                  <Input value={activeCompanyForm.name} onChange={(e) => setActiveCompanyForm({ ...activeCompanyForm, name: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>GSTIN</Label>
                  <Input value={activeCompanyForm.gstin} onChange={(e) => setActiveCompanyForm({ ...activeCompanyForm, gstin: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>PAN</Label>
                  <Input value={activeCompanyForm.pan} onChange={(e) => setActiveCompanyForm({ ...activeCompanyForm, pan: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={activeCompanyForm.phone} onChange={(e) => setActiveCompanyForm({ ...activeCompanyForm, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={activeCompanyForm.email} onChange={(e) => setActiveCompanyForm({ ...activeCompanyForm, email: e.target.value })} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Address</Label>
                  <Input value={activeCompanyForm.address} onChange={(e) => setActiveCompanyForm({ ...activeCompanyForm, address: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={activeCompanyForm.city} onChange={(e) => setActiveCompanyForm({ ...activeCompanyForm, city: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input value={activeCompanyForm.state} onChange={(e) => setActiveCompanyForm({ ...activeCompanyForm, state: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Pincode</Label>
                  <Input value={activeCompanyForm.pincode} onChange={(e) => setActiveCompanyForm({ ...activeCompanyForm, pincode: e.target.value })} />
                </div>
              </div>

              <Button type="submit" disabled={activeCompanySaving}>
                {activeCompanySaving ? "Saving..." : "Save Invoice Settings"}
              </Button>
            </form>

            <div className="mt-6 space-y-4 rounded-xl border p-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">Multiple Payment Settings</p>
                <p className="text-xs text-slate-500">
                  Add multiple UPI IDs, uploaded QR scanners, bank accounts, cheque, or cash options. Only the default setting prints on sales invoices.
                </p>
              </div>

              <div className="space-y-2">
                {(activeCompany.paymentSettings ?? []).map((paymentSetting) => (
                  <div key={paymentSetting.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                    <div>
                      <div className="font-medium text-slate-800">
                        {paymentSetting.label}{" "}
                        <Badge variant={paymentSetting.isDefault ? "paid" : "secondary"}>
                          {paymentSetting.isDefault ? "Default" : paymentSetting.type}
                        </Badge>
                      </div>
                      <div className="text-slate-500">
                        {paymentSetting.type === "UPI" && (paymentSetting.upiId || "UPI")}
                        {paymentSetting.type === "BANK" && (paymentSetting.bankName || paymentSetting.bankAccountNumber || "Bank")}
                        {paymentSetting.type === "CHEQUE" && (paymentSetting.chequePayeeName || "Cheque")}
                        {paymentSetting.type === "CASH" && "Cash"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => editPaymentSetting(paymentSetting)}>
                        Edit
                      </Button>
                      <Button type="button" variant="outline" onClick={() => deletePaymentSetting(paymentSetting.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <form className="space-y-4" onSubmit={savePaymentSetting}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
                      value={paymentForm.type}
                      onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value as PaymentMethod })}
                    >
                      <option value="UPI">UPI</option>
                      <option value="BANK">Bank Transfer</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Label</Label>
                    <Input value={paymentForm.label} onChange={(e) => setPaymentForm({ ...paymentForm, label: e.target.value })} placeholder="Primary UPI / SBI Current" required />
                  </div>
                  <label className="flex items-center gap-2 pt-7 text-sm">
                    <input type="checkbox" checked={paymentForm.isDefault} onChange={(e) => setPaymentForm({ ...paymentForm, isDefault: e.target.checked })} />
                    Show by default on sales invoices
                  </label>
                </div>

                {paymentForm.type === "UPI" && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>UPI ID</Label>
                      <Input value={paymentForm.upiId} onChange={(e) => setPaymentForm({ ...paymentForm, upiId: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>UPI Payee Name</Label>
                      <Input value={paymentForm.upiPayeeName} onChange={(e) => setPaymentForm({ ...paymentForm, upiPayeeName: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Upload Scanner QR</Label>
                      <Input type="file" accept="image/*" onChange={(e) => handleQrUpload(e.target.files?.[0] ?? null)} />
                    </div>
                  </div>
                )}

                {paymentForm.type === "BANK" && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Input value={paymentForm.bankAccountName} onChange={(e) => setPaymentForm({ ...paymentForm, bankAccountName: e.target.value })} placeholder="Account name" />
                    <Input value={paymentForm.bankAccountNumber} onChange={(e) => setPaymentForm({ ...paymentForm, bankAccountNumber: e.target.value })} placeholder="Account number" />
                    <Input value={paymentForm.bankIfsc} onChange={(e) => setPaymentForm({ ...paymentForm, bankIfsc: e.target.value })} placeholder="IFSC" />
                    <Input value={paymentForm.bankName} onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })} placeholder="Bank name" />
                    <Input value={paymentForm.bankBranch} onChange={(e) => setPaymentForm({ ...paymentForm, bankBranch: e.target.value })} placeholder="Branch" />
                  </div>
                )}

                {paymentForm.type === "CHEQUE" && (
                  <Input value={paymentForm.chequePayeeName} onChange={(e) => setPaymentForm({ ...paymentForm, chequePayeeName: e.target.value })} placeholder="Cheque in favour of" />
                )}

                <textarea
                  value={paymentForm.instructions}
                  onChange={(e) => setPaymentForm({ ...paymentForm, instructions: e.target.value })}
                  placeholder="Optional instructions for this payment setting"
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
                />

                <div className="flex gap-2">
                  <Button type="submit" disabled={paymentSaving}>
                    {paymentSaving ? "Saving..." : paymentEditingId ? "Update Payment Setting" : "Add Payment Setting"}
                  </Button>
                  {paymentEditingId && (
                    <Button type="button" variant="outline" onClick={resetPaymentForm}>
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      )}

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



