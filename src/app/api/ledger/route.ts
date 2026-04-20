import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ledgerAccounts, ledgerEntries } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

// GET /api/ledger?accountId=xxx — get ledger entries for an account
// GET /api/ledger — get all ledger accounts
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.companyId;
  const accountId = req.nextUrl.searchParams.get("accountId");

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
  const accounts = await db.query.ledgerAccounts.findMany({
    where: eq(ledgerAccounts.companyId, companyId),
    with: { customer: true, vendor: true },
    orderBy: (a, { asc }) => [asc(a.name)],
  });

  return NextResponse.json(accounts);
}
