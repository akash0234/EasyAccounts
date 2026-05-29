import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ledgerAccounts, ledgerEntries } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, ilike, sql, type SQL, or } from "drizzle-orm";

// GET /api/ledger?accountId=xxx — get ledger entries for an account
// GET /api/ledger — get all ledger accounts
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.companyId;
  const accountId = req.nextUrl.searchParams.get("accountId");
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const pageParam = Number(req.nextUrl.searchParams.get("page") || "0");
  const pageSizeParam = Number(req.nextUrl.searchParams.get("pageSize") || "25");
  const wantsPagination = req.nextUrl.searchParams.has("page") || req.nextUrl.searchParams.has("pageSize");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(Math.floor(pageSizeParam), 100)
      : 25;

  if (accountId) {
    // Return entries for specific account
    const entries = await db.query.ledgerEntries.findMany({
      where: and(
        eq(ledgerEntries.companyId, companyId),
        eq(ledgerEntries.ledgerAccountId, accountId)
      ),
      orderBy: (e, { asc }) => [asc(e.date), asc(e.createdAt)],
    });
    return NextResponse.json(entries);
  }

  // Return all ledger accounts with balances
  const whereClauses: SQL[] = [eq(ledgerAccounts.companyId, companyId)];
  if (q) {
    whereClauses.push(
      or(
        ilike(ledgerAccounts.name, `%${q}%`),
        ilike(ledgerAccounts.type, `%${q}%`)
      )!
    );
  }

  const accounts = await db.query.ledgerAccounts.findMany({
    where: and(...whereClauses),
    with: { customer: true, vendor: true },
    orderBy: (a, { asc }) => [asc(a.name)],
    ...(wantsPagination ? { limit: pageSize, offset: (page - 1) * pageSize } : {}),
  });

  if (wantsPagination) {
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(ledgerAccounts)
      .where(and(...whereClauses));
    const total = Number(totalResult[0]?.count ?? 0);
    return NextResponse.json({
      data: accounts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  }

  return NextResponse.json(accounts);
}
