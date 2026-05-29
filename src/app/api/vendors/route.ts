import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vendors, ledgerAccounts, ledgerEntries, financialYears } from "@/db/schema";
import { vendorSchema } from "@/lib/validations";
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

  const whereClauses: SQL[] = [eq(vendors.companyId, session.user.companyId)];
  if (q) {
    whereClauses.push(
      or(
        ilike(vendors.name, `%${q}%`),
        ilike(vendors.gstin, `%${q}%`),
        ilike(vendors.phone, `%${q}%`)
      )!
    );
  }

  const data = await db.query.vendors.findMany({
    where: and(...whereClauses),
    with: { ledgerAccount: true },
    orderBy: (v, { asc, desc }) => (q ? [asc(v.name)] : [desc(v.createdAt)]),
    ...(wantsPagination ? { limit: pageSize, offset: (page - 1) * pageSize } : {}),
  });

  if (wantsPagination) {
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(vendors)
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
  const parsed = vendorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const companyId = session.user.companyId;
  const { openingBalance, ...rest } = parsed.data;

  const [vendor] = await db
    .insert(vendors)
    .values({
      companyId,
      code: generateCode(CODE_PREFIX.VENDOR),
      ...rest,
      gstin: rest.gstin || null,
      email: rest.email || null,
      openingBalance: openingBalance || 0,
    })
    .returning();

  const [ledgerAccount] = await db
    .insert(ledgerAccounts)
    .values({
      companyId,
      name: vendor.name,
      type: "VENDOR",
      vendorId: vendor.id,
      balance: openingBalance || 0,
    })
    .returning();

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
        description: `Opening balance for ${vendor.name}`,
        debit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
        credit: openingBalance > 0 ? openingBalance : 0,
        balanceAfter: openingBalance,
        referenceType: "OPENING_BALANCE",
      });
    }
  }

  return NextResponse.json(vendor, { status: 201 });
}
