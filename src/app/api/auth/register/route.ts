import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, companies, companyMembers, financialYears, ledgerAccounts } from "@/db/schema";
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

    const { name, email, password, companyName } = parsed.data;

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

    // Create user + company + membership + default FY + default ledger accounts in sequence
    const [user] = await db.insert(users).values({ name, email, passwordHash }).returning();

    const [company] = await db
      .insert(companies)
      .values({ name: companyName })
      .returning();

    await db.insert(companyMembers).values({
      userId: user.id,
      companyId: company.id,
      role: "ADMIN",
    });

    // Create default financial year (April to March)
    const now = new Date();
    const fyStart =
      now.getMonth() >= 3
        ? new Date(now.getFullYear(), 3, 1)
        : new Date(now.getFullYear() - 1, 3, 1);
    const fyEnd = new Date(fyStart.getFullYear() + 1, 2, 31);
    const fyLabel = `${fyStart.getFullYear()}-${String(fyEnd.getFullYear()).slice(2)}`;

    await db.insert(financialYears).values({
      companyId: company.id,
      label: fyLabel,
      startDate: fyStart,
      endDate: fyEnd,
      isActive: true,
    });

    // Create default system ledger accounts
    const defaultAccounts = [
      { name: "Cash", type: "CASH" as const },
      { name: "Bank", type: "BANK" as const },
      { name: "Sales", type: "SALES" as const },
      { name: "Purchase", type: "PURCHASE" as const },
      { name: "GST", type: "GST" as const },
    ];

    await db.insert(ledgerAccounts).values(
      defaultAccounts.map((a) => ({
        companyId: company.id,
        name: a.name,
        type: a.type,
      }))
    );

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
