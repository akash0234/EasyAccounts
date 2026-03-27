import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  payments,
  paymentAllocations,
  invoices,
  ledgerAccounts,
  ledgerEntries,
  financialYears,
} from "@/db/schema";
import { paymentSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type") || "RECEIVED";

  const data = await db.query.payments.findMany({
    where: and(
      eq(payments.companyId, session.user.companyId),
      eq(payments.type, type as "RECEIVED" | "MADE")
    ),
    with: { customer: true, vendor: true, allocations: true },
    orderBy: (p, { desc }) => [desc(p.date)],
  });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const type: "RECEIVED" | "MADE" = body.type || "RECEIVED";

  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const companyId = session.user.companyId;
  const { date, amount, method, reference, notes, customerId, vendorId, allocations } =
    parsed.data;

  // Get active FY
  const activeFY = await db.query.financialYears.findFirst({
    where: and(
      eq(financialYears.companyId, companyId),
      eq(financialYears.isActive, true)
    ),
  });
  if (!activeFY) {
    return NextResponse.json(
      { error: "No active financial year" },
      { status: 400 }
    );
  }

  // Generate payment number
  const prefix = type === "RECEIVED" ? "REC" : "PAY";
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(payments)
    .where(
      and(eq(payments.companyId, companyId), eq(payments.type, type))
    );
  const count = Number(countResult[0].count) + 1;
  const paymentNumber = `${prefix}-${String(count).padStart(4, "0")}`;

  // Create payment
  const [payment] = await db
    .insert(payments)
    .values({
      companyId,
      paymentNumber,
      type,
      date: new Date(date),
      customerId: customerId || null,
      vendorId: vendorId || null,
      amount,
      method,
      reference: reference || null,
      notes: notes || null,
    })
    .returning();

  // Auto-adjust against invoices (allocations)
  if (allocations && allocations.length > 0) {
    await db.insert(paymentAllocations).values(
      allocations.map((a) => ({
        paymentId: payment.id,
        invoiceId: a.invoiceId,
        amount: a.amount,
      }))
    );

    // Update invoice paid amounts and status
    for (const alloc of allocations) {
      const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, alloc.invoiceId),
      });
      if (invoice) {
        const newPaid = invoice.paidAmount + alloc.amount;
        const newStatus =
          newPaid >= invoice.totalAmount ? "PAID" : "PARTIAL";
        await db
          .update(invoices)
          .set({ paidAmount: newPaid, status: newStatus, updatedAt: new Date() })
          .where(eq(invoices.id, alloc.invoiceId));
      }
    }
  }

  // LEDGER ENTRIES
  const methodAccount = method === "CASH" ? "CASH" : "BANK";
  const cashBankLedger = await db.query.ledgerAccounts.findFirst({
    where: and(
      eq(ledgerAccounts.companyId, companyId),
      eq(ledgerAccounts.type, methodAccount)
    ),
  });

  if (type === "RECEIVED" && customerId) {
    // Payment received: Credit customer, Debit cash/bank
    const customerLedger = await db.query.ledgerAccounts.findFirst({
      where: and(
        eq(ledgerAccounts.companyId, companyId),
        eq(ledgerAccounts.customerId, customerId)
      ),
    });

    if (customerLedger && cashBankLedger) {
      const newCustomerBalance = customerLedger.balance - amount;
      const newCashBalance = cashBankLedger.balance + amount;

      await db.insert(ledgerEntries).values([
        {
          companyId,
          financialYearId: activeFY.id,
          ledgerAccountId: customerLedger.id,
          date: new Date(date),
          description: `Payment Received ${paymentNumber}`,
          debit: 0,
          credit: amount,
          balanceAfter: newCustomerBalance,
          referenceType: "PAYMENT",
          referenceId: payment.id,
        },
        {
          companyId,
          financialYearId: activeFY.id,
          ledgerAccountId: cashBankLedger.id,
          date: new Date(date),
          description: `Payment Received ${paymentNumber}`,
          debit: amount,
          credit: 0,
          balanceAfter: newCashBalance,
          referenceType: "PAYMENT",
          referenceId: payment.id,
        },
      ]);

      await db
        .update(ledgerAccounts)
        .set({ balance: newCustomerBalance })
        .where(eq(ledgerAccounts.id, customerLedger.id));
      await db
        .update(ledgerAccounts)
        .set({ balance: newCashBalance })
        .where(eq(ledgerAccounts.id, cashBankLedger.id));
    }
  } else if (type === "MADE" && vendorId) {
    // Payment made: Debit vendor, Credit cash/bank
    const vendorLedger = await db.query.ledgerAccounts.findFirst({
      where: and(
        eq(ledgerAccounts.companyId, companyId),
        eq(ledgerAccounts.vendorId, vendorId)
      ),
    });

    if (vendorLedger && cashBankLedger) {
      const newVendorBalance = vendorLedger.balance - amount;
      const newCashBalance = cashBankLedger.balance - amount;

      await db.insert(ledgerEntries).values([
        {
          companyId,
          financialYearId: activeFY.id,
          ledgerAccountId: vendorLedger.id,
          date: new Date(date),
          description: `Payment Made ${paymentNumber}`,
          debit: amount,
          credit: 0,
          balanceAfter: newVendorBalance,
          referenceType: "PAYMENT",
          referenceId: payment.id,
        },
        {
          companyId,
          financialYearId: activeFY.id,
          ledgerAccountId: cashBankLedger.id,
          date: new Date(date),
          description: `Payment Made ${paymentNumber}`,
          debit: 0,
          credit: amount,
          balanceAfter: newCashBalance,
          referenceType: "PAYMENT",
          referenceId: payment.id,
        },
      ]);

      await db
        .update(ledgerAccounts)
        .set({ balance: newVendorBalance })
        .where(eq(ledgerAccounts.id, vendorLedger.id));
      await db
        .update(ledgerAccounts)
        .set({ balance: newCashBalance })
        .where(eq(ledgerAccounts.id, cashBankLedger.id));
    }
  }

  return NextResponse.json(payment, { status: 201 });
}
