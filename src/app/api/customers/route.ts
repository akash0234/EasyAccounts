import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, ledgerAccounts, ledgerEntries, financialYears } from "@/db/schema";
import { customerSchema } from "@/lib/validations";
import { generateCode } from "@/lib/code-generator";
import { CODE_PREFIX } from "@/lib/code-prefixes";
import { auth } from "@/lib/auth";
import { eq, and, or, ilike, sql, type SQL } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const pageParam = Number(url.searchParams.get("page") || "0");
  const pageSizeParam = Number(url.searchParams.get("pageSize") || "25");
  const wantsPagination = url.searchParams.has("page") || url.searchParams.has("pageSize");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(Math.floor(pageSizeParam), 100)
      : 25;

  const whereClauses: SQL[] = [eq(customers.companyId, session.user.companyId)];
  if (q) {
    whereClauses.push(
      or(
        ilike(customers.name, `%${q}%`),
        ilike(customers.gstin, `%${q}%`),
        ilike(customers.phone, `%${q}%`)
      )!
    );
  }

  const data = await db.query.customers.findMany({
    where: and(...whereClauses),
    with: { ledgerAccount: true, addresses: true },
    orderBy: (c, { asc, desc }) => (q ? [asc(c.name)] : [desc(c.createdAt)]),
    ...(wantsPagination ? { limit: pageSize, offset: (page - 1) * pageSize } : {}),
  });

  if (wantsPagination) {
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(and(...whereClauses));
    const total = Number(totalResult[0]?.count ?? 0);
    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  }

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
      code: generateCode(CODE_PREFIX.CUSTOMER),
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
