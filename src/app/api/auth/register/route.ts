import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import {
  companies,
  companyMembers,
  organizationMembers,
  organizations,
  users,
} from "@/db/schema";
import { createDefaultFinancialYearAndLedgers } from "@/lib/organization";
import { registerSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, organizationName, companyName } = parsed.data;

    // Check existing user
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash })
      .returning();

    const [organization] = await db
      .insert(organizations)
      .values({ name: organizationName })
      .returning();

    await db.insert(organizationMembers).values({
      userId: user.id,
      organizationId: organization.id,
      role: "OWNER",
    });

    const [company] = await db
      .insert(companies)
      .values({
        organizationId: organization.id,
        name: companyName,
      })
      .returning();

    await db.insert(companyMembers).values({
      userId: user.id,
      companyId: company.id,
      role: "ADMIN",
    });

    await createDefaultFinancialYearAndLedgers(company.id);

    return NextResponse.json(
      { message: "Account created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
