import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  invoices,
  invoiceItems,
  ledgerAccounts,
  ledgerEntries,
  financialYears,
  customers,
  vendors,
} from "@/db/schema";
import { invoiceSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type") || "SALES";

  const data = await db.query.invoices.findMany({
    where: and(
      eq(invoices.companyId, session.user.companyId),
      eq(invoices.type, type as "SALES" | "PURCHASE")
    ),
    with: { customer: true, vendor: true, items: true },
    orderBy: (i, { desc }) => [desc(i.date)],
  });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const type: "SALES" | "PURCHASE" = body.type || "SALES";

  const parsed = invoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const companyId = session.user.companyId;
  const { items, date, dueDate, notes, customerId, vendorId } = parsed.data;

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

  // Calculate totals
  const computedItems = items.map((item) => {
    const amount = item.quantity * item.rate;
    const gstAmount = (amount * item.gstPercent) / 100;
    return { ...item, amount, gstAmount };
  });
  const subtotal = computedItems.reduce((sum, i) => sum + i.amount, 0);
  const taxAmount = computedItems.reduce((sum, i) => sum + i.gstAmount, 0);
  const totalAmount = subtotal + taxAmount;

  // Generate invoice number
  const prefix = type === "SALES" ? "INV" : "BILL";
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoices)
    .where(
      and(eq(invoices.companyId, companyId), eq(invoices.type, type))
    );
  const count = Number(countResult[0].count) + 1;
  const invoiceNumber = `${prefix}-${String(count).padStart(4, "0")}`;

  // Create invoice
  const [invoice] = await db
    .insert(invoices)
    .values({
      companyId,
      financialYearId: activeFY.id,
      invoiceNumber,
      type,
      date: new Date(date),
      dueDate: dueDate ? new Date(dueDate) : null,
      customerId: customerId || null,
      vendorId: vendorId || null,
      subtotal,
      taxAmount,
      totalAmount,
      status: "UNPAID",
      notes: notes || null,
    })
    .returning();

  // Create invoice items
  await db.insert(invoiceItems).values(
    computedItems.map((item) => ({
      invoiceId: invoice.id,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
      gstPercent: item.gstPercent,
      gstAmount: item.gstAmount,
    }))
  );

  // LEDGER ENTRIES — the core of ledger-first architecture
  if (type === "SALES" && customerId) {
    // Sales: Debit customer, Credit sales
    const customerLedger = await db.query.ledgerAccounts.findFirst({
      where: and(
        eq(ledgerAccounts.companyId, companyId),
        eq(ledgerAccounts.customerId, customerId)
      ),
    });
    const salesLedger = await db.query.ledgerAccounts.findFirst({
      where: and(
        eq(ledgerAccounts.companyId, companyId),
        eq(ledgerAccounts.type, "SALES")
      ),
    });

    if (customerLedger && salesLedger) {
      const newCustomerBalance = customerLedger.balance + totalAmount;
      const newSalesBalance = salesLedger.balance + totalAmount;

      await db.insert(ledgerEntries).values([
        {
          companyId,
          financialYearId: activeFY.id,
          ledgerAccountId: customerLedger.id,
          date: new Date(date),
          description: `Sales Invoice ${invoiceNumber}`,
          debit: totalAmount,
          credit: 0,
          balanceAfter: newCustomerBalance,
          referenceType: "INVOICE",
          referenceId: invoice.id,
        },
        {
          companyId,
          financialYearId: activeFY.id,
          ledgerAccountId: salesLedger.id,
          date: new Date(date),
          description: `Sales Invoice ${invoiceNumber}`,
          debit: 0,
          credit: totalAmount,
          balanceAfter: newSalesBalance,
          referenceType: "INVOICE",
          referenceId: invoice.id,
        },
      ]);

      // Update running balances
      await db
        .update(ledgerAccounts)
        .set({ balance: newCustomerBalance })
        .where(eq(ledgerAccounts.id, customerLedger.id));
      await db
        .update(ledgerAccounts)
        .set({ balance: newSalesBalance })
        .where(eq(ledgerAccounts.id, salesLedger.id));
    }
  } else if (type === "PURCHASE" && vendorId) {
    // Purchase: Credit vendor, Debit purchase
    const vendorLedger = await db.query.ledgerAccounts.findFirst({
      where: and(
        eq(ledgerAccounts.companyId, companyId),
        eq(ledgerAccounts.vendorId, vendorId)
      ),
    });
    const purchaseLedger = await db.query.ledgerAccounts.findFirst({
      where: and(
        eq(ledgerAccounts.companyId, companyId),
        eq(ledgerAccounts.type, "PURCHASE")
      ),
    });

    if (vendorLedger && purchaseLedger) {
      const newVendorBalance = vendorLedger.balance + totalAmount;
      const newPurchaseBalance = purchaseLedger.balance + totalAmount;

      await db.insert(ledgerEntries).values([
        {
          companyId,
          financialYearId: activeFY.id,
          ledgerAccountId: vendorLedger.id,
          date: new Date(date),
          description: `Purchase Bill ${invoiceNumber}`,
          debit: 0,
          credit: totalAmount,
          balanceAfter: newVendorBalance,
          referenceType: "INVOICE",
          referenceId: invoice.id,
        },
        {
          companyId,
          financialYearId: activeFY.id,
          ledgerAccountId: purchaseLedger.id,
          date: new Date(date),
          description: `Purchase Bill ${invoiceNumber}`,
          debit: totalAmount,
          credit: 0,
          balanceAfter: newPurchaseBalance,
          referenceType: "INVOICE",
          referenceId: invoice.id,
        },
      ]);

      await db
        .update(ledgerAccounts)
        .set({ balance: newVendorBalance })
        .where(eq(ledgerAccounts.id, vendorLedger.id));
      await db
        .update(ledgerAccounts)
        .set({ balance: newPurchaseBalance })
        .where(eq(ledgerAccounts.id, purchaseLedger.id));
    }
  }

  return NextResponse.json(invoice, { status: 201 });
}
