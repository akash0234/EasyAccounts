import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { requireCompanyRole } from "@/lib/organization";
import { companySchema } from "@/lib/validations";

export async function PUT(req: NextRequest) {
  try {
    const membership = await requireCompanyRole("ADMIN");
    const body = await req.json();
    const parsed = companySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const payload = {
      ...parsed.data,
      gstin: parsed.data.gstin || null,
      pan: parsed.data.pan || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      pincode: parsed.data.pincode || null,
      updatedAt: new Date(),
    };

    const [company] = await db
      .update(companies)
      .set(payload)
      .where(eq(companies.id, membership.companyId))
      .returning();

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
