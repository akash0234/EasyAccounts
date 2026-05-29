import { NextResponse } from "next/server";
import { getOrganizationCompanies, getOrganizationContext } from "@/lib/organization";

export async function GET() {
  try {
    const context = await getOrganizationContext();
    const companies = await getOrganizationCompanies(context.organizationId);

    return NextResponse.json({
      organization: {
        id: context.organizationId,
        name: context.organizationName,
        role: context.organizationRole,
      },
      companies: companies.map((company) => ({
        id: company.id,
        name: company.name,
        gstin: company.gstin,
        pan: company.pan,
        email: company.email,
        phone: company.phone,
        address: company.address,
        city: company.city,
        state: company.state,
        pincode: company.pincode,
        paymentSettings: company.paymentSettings,
        members: company.members.map((member) => ({
          id: member.id,
          role: member.role,
          userId: member.userId,
          name: member.user.name,
          email: member.user.email,
        })),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message === "Forbidden" ? 403 : 401;

    return NextResponse.json({ error: message }, { status });
  }
}
