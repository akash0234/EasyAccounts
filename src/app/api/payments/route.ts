import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  payments,
  paymentAllocations,
  invoices,
  ledgerAccounts,
  ledgerEntries,
  financialYears,
  customers,
  vendors,
} from "@/db/schema";
import { paymentSchema } from "@/lib/validations";
import { generateCode } from "@/lib/code-generator";
import { CODE_PREFIX } from "@/lib/code-prefixes";
import { auth } from "@/lib/auth";
import { eq, and, sql, ilike, or, gte, lte, inArray, type SQL } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type") || "RECEIVED";
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const method = req.nextUrl.searchParams.get("method");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const customerId = req.nextUrl.searchParams.get("customerId");
  const vendorId = req.nextUrl.searchParams.get("vendorId");
  const minAmount = Number(req.nextUrl.searchParams.get("minAmount") || "");
  const maxAmount = Number(req.nextUrl.searchParams.get("maxAmount") || "");
  const pageParam = Number(req.nextUrl.searchParams.get("page") || "0");
  const pageSizeParam = Number(req.nextUrl.searchParams.get("pageSize") || "25");
  const wantsPagination = req.nextUrl.searchParams.has("page") || req.nextUrl.searchParams.has("pageSize");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(Math.floor(pageSizeParam), 100)
      : 25;

  const conditions: SQL[] = [
    eq(payments.companyId, session.user.companyId),
    eq(payments.type, type as "RECEIVED" | "MADE"),
  ];

  if (method) {
    conditions.push(eq(payments.method, method as "CASH" | "BANK" | "UPI" | "CHEQUE"));
  }

  if (from) {
    conditions.push(gte(payments.date, new Date(from)));
  }

  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(payments.date, end));
  }

  if (customerId) {
    conditions.push(eq(payments.customerId, customerId));
  }

  if (vendorId) {
    conditions.push(eq(payments.vendorId, vendorId));
  }

  if (Number.isFinite(minAmount)) {
    conditions.push(gte(payments.amount, minAmount));
  }

  if (Number.isFinite(maxAmount)) {
    conditions.push(lte(payments.amount, maxAmount));
  }

  if (q) {
    const like = `%${q}%`;
    const partyMatches =
      type === "MADE"
        ? await db
            .select({ id: vendors.id })
            .from(vendors)
            .where(
              and(
                eq(vendors.companyId, session.user.companyId),
                or(ilike(vendors.name, like), ilike(vendors.gstin, like), ilike(vendors.phone, like))
              )
            )
        : await db
            .select({ id: customers.id })
            .from(customers)
            .where(
              and(
                eq(customers.companyId, session.user.companyId),
                or(ilike(customers.name, like), ilike(customers.gstin, like), ilike(customers.phone, like))
              )
            );
    const partyIds = partyMatches.map((row) => row.id);
    conditions.push(
      or(
        ilike(payments.paymentNumber, like),
        ilike(payments.reference, like),
        partyIds.length > 0
          ? type === "MADE"
            ? inArray(payments.vendorId, partyIds)
            : inArray(payments.customerId, partyIds)
          : sql`false`
      )!
    );
  }

  const data = await db.query.payments.findMany({
    where: and(...conditions),
    with: { customer: true, vendor: true, allocations: true },
    orderBy: (p, { desc }) => [desc(p.date)],
    ...(wantsPagination ? { limit: pageSize, offset: (page - 1) * pageSize } : {}),
  });

  if (wantsPagination) {
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(payments)
      .where(and(...conditions));
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
  const type: "RECEIVED" | "MADE" = body.type || "RECEIVED";

  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const companyId = session.user.companyId;
  const {
    date, amount, method, reference, notes, customerId, vendorId,
    allocations: rawAllocations, advanceAllocations: rawAdvanceAllocations,
  } = parsed.data;
  const allocations = rawAllocations ?? [];
  const advanceAllocations = rawAdvanceAllocations ?? [];

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

  // Generate payment code and number
  const prefix = type === "RECEIVED" ? CODE_PREFIX.PAYMENT_RECEIVED : CODE_PREFIX.PAYMENT_MADE;
  const code = generateCode(prefix);
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(payments)
    .where(
      and(eq(payments.companyId, companyId), eq(payments.type, type))
    );
  const count = Number(countResult[0].count) + 1;
  const paymentNumber = `${prefix}-${String(count).padStart(4, "0")}`;

  try {
    const payment = await db.transaction(async (tx) => {
      // ── SERVER-SIDE VALIDATION ──

      // 1. Validate each allocation does not exceed invoice due amount
      for (const alloc of allocations) {
        const invoice = await tx.query.invoices.findFirst({
          where: eq(invoices.id, alloc.invoiceId),
        });
        if (!invoice) {
          throw new Error(`VALIDATION:Invoice not found: ${alloc.invoiceId}`);
        }
        const due = invoice.totalAmount - invoice.paidAmount;
        if (alloc.amount > due + 0.01) {
          throw new Error(
            `VALIDATION:Allocation ${alloc.amount} exceeds due amount ${due} for invoice ${invoice.invoiceNumber}`
          );
        }
      }

      // 2. Validate advance allocations: sufficient unallocated balance + no duplicate pairs
      const seenAdvPairs = new Set<string>();
      const advByPayment = new Map<string, number>();
      for (const adv of advanceAllocations) {
        const pairKey = `${adv.paymentId}:${adv.invoiceId}`;
        if (seenAdvPairs.has(pairKey)) {
          throw new Error(`VALIDATION:Duplicate advance allocation for same payment+invoice`);
        }
        seenAdvPairs.add(pairKey);
        advByPayment.set(adv.paymentId, (advByPayment.get(adv.paymentId) ?? 0) + adv.amount);
      }

      for (const [advPaymentId, requestedAmount] of advByPayment) {
        const advPayment = await tx.query.payments.findFirst({
          where: and(eq(payments.id, advPaymentId), eq(payments.companyId, companyId)),
          with: { allocations: true },
        });
        if (!advPayment) {
          throw new Error(`VALIDATION:Advance payment not found: ${advPaymentId}`);
        }
        const existingAllocSum = (advPayment.allocations ?? []).reduce(
          (s: number, a: { amount: number }) => s + a.amount,
          0
        );
        const available = advPayment.amount - existingAllocSum;
        if (requestedAmount > available + 0.01) {
          throw new Error(
            `VALIDATION:Advance ${advPayment.paymentNumber} has only ${available.toFixed(2)} available, requested ${requestedAmount.toFixed(2)}`
          );
        }
      }

      // 3. Validate total allocations <= amount + advance total
      const allocTotal = allocations.reduce((s, a) => s + a.amount, 0);
      const advTotal = advanceAllocations.reduce((s, a) => s + a.amount, 0);
      if (allocTotal > amount + advTotal + 0.01) {
        throw new Error(
          `VALIDATION:Total allocations (${allocTotal}) exceed payment amount (${amount}) + advance (${advTotal})`
        );
      }

      // ── INSERT PAYMENT ──
      const [newPayment] = await tx
        .insert(payments)
        .values({
          companyId,
          code,
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

      // ── ALLOCATIONS (new payment against invoices) ──
      if (allocations.length > 0) {
        await tx.insert(paymentAllocations).values(
          allocations.map((a) => ({
            paymentId: newPayment.id,
            invoiceId: a.invoiceId,
            amount: a.amount,
          }))
        );

        for (const alloc of allocations) {
          const invoice = await tx.query.invoices.findFirst({
            where: eq(invoices.id, alloc.invoiceId),
          });
          if (invoice) {
            const newPaid = invoice.paidAmount + alloc.amount;
            const newStatus = newPaid >= invoice.totalAmount ? "PAID" : "PARTIAL";
            await tx
              .update(invoices)
              .set({ paidAmount: newPaid, status: newStatus, updatedAt: new Date() })
              .where(eq(invoices.id, alloc.invoiceId));
          }
        }
      }

      // ── ADVANCE ALLOCATIONS (existing advance payments against invoices) ──
      if (advanceAllocations.length > 0) {
        for (const adv of advanceAllocations) {
          await tx.insert(paymentAllocations).values({
            paymentId: adv.paymentId,
            invoiceId: adv.invoiceId,
            amount: adv.amount,
          });

          const invoice = await tx.query.invoices.findFirst({
            where: eq(invoices.id, adv.invoiceId),
          });
          if (invoice) {
            const newPaid = invoice.paidAmount + adv.amount;
            const newStatus = newPaid >= invoice.totalAmount ? "PAID" : "PARTIAL";
            await tx
              .update(invoices)
              .set({ paidAmount: newPaid, status: newStatus, updatedAt: new Date() })
              .where(eq(invoices.id, adv.invoiceId));
          }
        }
      }

      // ── LEDGER ENTRIES — only when actual cash moves ──
      if (amount > 0) {
        const methodAccount = method === "CASH" ? "CASH" : "BANK";
        const cashBankLedger = await tx.query.ledgerAccounts.findFirst({
          where: and(
            eq(ledgerAccounts.companyId, companyId),
            eq(ledgerAccounts.type, methodAccount)
          ),
        });

        if (type === "RECEIVED" && customerId) {
          const customerLedger = await tx.query.ledgerAccounts.findFirst({
            where: and(
              eq(ledgerAccounts.companyId, companyId),
              eq(ledgerAccounts.customerId, customerId)
            ),
          });

          if (customerLedger && cashBankLedger) {
            const newCustomerBalance = customerLedger.balance - amount;
            const newCashBalance = cashBankLedger.balance + amount;

            await tx.insert(ledgerEntries).values([
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
                referenceId: newPayment.id,
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
                referenceId: newPayment.id,
              },
            ]);

            await tx
              .update(ledgerAccounts)
              .set({ balance: newCustomerBalance })
              .where(eq(ledgerAccounts.id, customerLedger.id));
            await tx
              .update(ledgerAccounts)
              .set({ balance: newCashBalance })
              .where(eq(ledgerAccounts.id, cashBankLedger.id));
          }
        } else if (type === "MADE" && vendorId) {
          const vendorLedger = await tx.query.ledgerAccounts.findFirst({
            where: and(
              eq(ledgerAccounts.companyId, companyId),
              eq(ledgerAccounts.vendorId, vendorId)
            ),
          });

          if (vendorLedger && cashBankLedger) {
            const newVendorBalance = vendorLedger.balance - amount;
            const newCashBalance = cashBankLedger.balance - amount;

            await tx.insert(ledgerEntries).values([
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
                referenceId: newPayment.id,
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
                referenceId: newPayment.id,
              },
            ]);

            await tx
              .update(ledgerAccounts)
              .set({ balance: newVendorBalance })
              .where(eq(ledgerAccounts.id, vendorLedger.id));
            await tx
              .update(ledgerAccounts)
              .set({ balance: newCashBalance })
              .where(eq(ledgerAccounts.id, cashBankLedger.id));
          }
        }
      }

      return newPayment;
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith("VALIDATION:")) {
      return NextResponse.json(
        { error: message.replace("VALIDATION:", "") },
        { status: 400 }
      );
    }
    throw err;
  }
}
