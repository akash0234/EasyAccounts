import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies, companyMembers } from "@/db/schema";
import {
  createDefaultFinancialYearAndLedgers,
  requireOrganizationRole,
} from "@/lib/organization";
import { organizationCompanySchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const context = await requireOrganizationRole("OWNER", "ADMIN");
    const body = await req.json();
    const parsed = organizationCompanySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const [company] = await db
      .insert(companies)
      .values({
        organizationId: context.organizationId,
        name: parsed.data.name,
        gstin: parsed.data.gstin || null,
        pan: parsed.data.pan || null,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
      })
      .returning();

    await db.insert(companyMembers).values({
      userId: context.userId,
      companyId: company.id,
      role: "ADMIN",
    });

    await createDefaultFinancialYearAndLedgers(company.id);

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    const status = message === "Forbidden" ? 403 : 401;

    return NextResponse.json({ error: message }, { status });
  }
}
