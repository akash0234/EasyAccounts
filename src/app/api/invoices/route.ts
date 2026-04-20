import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  invoices,
  invoiceItems,
  ledgerAccounts,
  ledgerEntries,
  financialYears,
  stockMovements,
  facilityStock,
  products,
} from "@/db/schema";
import { invoiceSchema } from "@/lib/validations";
import { generateCode } from "@/lib/code-generator";
import { CODE_PREFIX } from "@/lib/code-prefixes";
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
    with: { customer: true, vendor: true, facility: true, items: true },
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
  const { items, date, dueDate, notes, customerId, vendorId, facilityId } = parsed.data;

  // Facility is mandatory for both purchases and sales
  if (!facilityId) {
    return NextResponse.json(
      { error: "Facility is required" },
      { status: 400 }
    );
  }

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

  // Generate invoice code and number
  const prefix = type === "SALES" ? CODE_PREFIX.SALES_INVOICE : CODE_PREFIX.PURCHASE_INVOICE;
  const code = generateCode(prefix);
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
      code,
      invoiceNumber,
      type,
      date: new Date(date),
      dueDate: dueDate ? new Date(dueDate) : null,
      customerId: customerId || null,
      vendorId: vendorId || null,
      facilityId: facilityId || null,
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
      productId: item.productId || null,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
      gstPercent: item.gstPercent,
      gstAmount: item.gstAmount,
      batchNo: item.batchNo || null,
      slNo: item.slNo || null,
      expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
    }))
  );

  // Stock movements for PURCHASE items with productId
  if (type === "PURCHASE") {
    for (const item of computedItems) {
      if (!item.productId) continue;

      // Create stock movement
      await db.insert(stockMovements).values({
        companyId,
        productId: item.productId,
        facilityId: facilityId || null,
        type: "IN",
        quantity: item.quantity,
        batchNo: item.batchNo || null,
        referenceType: "INVOICE",
        referenceId: invoice.id,
      });

      // Update product.currentStock
      await db
        .update(products)
        .set({ currentStock: sql`${products.currentStock} + ${item.quantity}` })
        .where(eq(products.id, item.productId));

      // Upsert facility stock if facilityId provided
      if (facilityId) {
        const existing = await db.query.facilityStock.findFirst({
          where: and(
            eq(facilityStock.facilityId, facilityId),
            eq(facilityStock.productId, item.productId)
          ),
        });

        if (existing) {
          await db
            .update(facilityStock)
            .set({
              currentStock: sql`${facilityStock.currentStock} + ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(facilityStock.id, existing.id));
        } else {
          await db.insert(facilityStock).values({
            companyId,
            facilityId,
            productId: item.productId,
            currentStock: item.quantity,
          });
        }
      }
    }
  }

  // Stock movements for SALES items with productId (stock OUT)
  if (type === "SALES") {
    for (const item of computedItems) {
      if (!item.productId) continue;

      await db.insert(stockMovements).values({
        companyId,
        productId: item.productId,
        facilityId: facilityId || null,
        type: "OUT",
        quantity: item.quantity,
        batchNo: item.batchNo || null,
        referenceType: "INVOICE",
        referenceId: invoice.id,
      });

      // Decrement product.currentStock
      await db
        .update(products)
        .set({ currentStock: sql`${products.currentStock} - ${item.quantity}` })
        .where(eq(products.id, item.productId));

      // Decrement facility stock
      if (facilityId) {
        const existing = await db.query.facilityStock.findFirst({
          where: and(
            eq(facilityStock.facilityId, facilityId),
            eq(facilityStock.productId, item.productId)
          ),
        });

        if (existing) {
          await db
            .update(facilityStock)
            .set({
              currentStock: sql`${facilityStock.currentStock} - ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(facilityStock.id, existing.id));
        }
      }
    }
  }

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
