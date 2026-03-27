import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, ledgerAccounts, ledgerEntries, financialYears } from "@/db/schema";
import { customerSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await db.query.customers.findMany({
    where: eq(customers.companyId, session.user.companyId),
    with: { ledgerAccount: true },
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const companyId = session.user.companyId;
  const { openingBalance, ...rest } = parsed.data;

  // Create customer
  const [customer] = await db
    .insert(customers)
    .values({
      companyId,
      ...rest,
      gstin: rest.gstin || null,
      email: rest.email || null,
      openingBalance: openingBalance || 0,
    })
    .returning();

  // Auto-create ledger account for this customer
  const [ledgerAccount] = await db
    .insert(ledgerAccounts)
    .values({
      companyId,
      name: customer.name,
      type: "CUSTOMER",
      customerId: customer.id,
      balance: openingBalance || 0,
    })
    .returning();

  // If opening balance, create opening balance ledger entry
  if (openingBalance && openingBalance !== 0) {
    const activeFY = await db.query.financialYears.findFirst({
      where: and(
        eq(financialYears.companyId, companyId),
        eq(financialYears.isActive, true)
      ),
    });

    if (activeFY) {
      await db.insert(ledgerEntries).values({
        companyId,
        financialYearId: activeFY.id,
        ledgerAccountId: ledgerAccount.id,
        date: new Date(),
        description: `Opening balance for ${customer.name}`,
        debit: openingBalance > 0 ? openingBalance : 0,
        credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
        balanceAfter: openingBalance,
        referenceType: "OPENING_BALANCE",
      });
    }
  }

  return NextResponse.json(customer, { status: 201 });
}
