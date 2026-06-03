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
  stockMovements,
  facilityStock,
  products,
  stockDetails,
  invoiceItems,
  invoiceItemAllocations,
} from "@/db/schema";
import { paymentSchema } from "@/lib/validations";
import { generateCode } from "@/lib/code-generator";
import { CODE_PREFIX } from "@/lib/code-prefixes";
import { auth } from "@/lib/auth";
import { eq, and, sql, ilike, or, gte, lte, inArray, type SQL } from "drizzle-orm";

type TrackingMode = "NONE" | "BATCH" | "SERIAL";

function batchMovementLabel(batchAllocations: any[]) {
  if (batchAllocations.length === 0) return null;
  if (batchAllocations.length === 1) return batchAllocations[0].batchNo;
  return "MULTI";
}

async function processStockTransactions(
  tx: any,
  invoice: any,
  items: any[],
  companyId: string,
  facilityId: string
) {
  const type = invoice.type;
  const invoiceId = invoice.id;

  for (const item of items) {
    if (!item.productId) continue;

    if (type === "PURCHASE") {
      if (item.trackingMode === "BATCH") {
        for (const allocation of item.batchAllocations) {
          await tx.insert(stockDetails).values({
            companyId,
            facilityId,
            productId: item.productId,
            batchNo: allocation.batchNo,
            expiryDate: allocation.expiryDate ? new Date(allocation.expiryDate) : null,
            quantity: allocation.quantity,
            availableQty: allocation.quantity,
            sourceInvoiceId: invoiceId,
            sourceInvoiceItemId: item.record.id,
          });
        }
      } else if (item.trackingMode === "SERIAL") {
        for (const serial of item.serialNumbers) {
          await tx.insert(stockDetails).values({
            companyId,
            facilityId,
            productId: item.productId,
            batchNo: item.batchNo?.trim() || null,
            serialNo: serial,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            quantity: 1,
            availableQty: 1,
            sourceInvoiceId: invoiceId,
            sourceInvoiceItemId: item.record.id,
          });
        }
      }

      await tx.insert(stockMovements).values({
        companyId,
        productId: item.productId,
        facilityId,
        type: "IN",
        quantity: item.quantity,
        batchNo:
          item.trackingMode === "BATCH"
            ? batchMovementLabel(item.batchAllocations)
            : item.batchNo?.trim() || null,
        referenceType: "INVOICE",
        referenceId: invoiceId,
      });

      await tx
        .update(products)
        .set({ currentStock: sql`${products.currentStock} + ${item.quantity}` })
        .where(eq(products.id, item.productId));

      const existingFacilityStock = await tx.query.facilityStock.findFirst({
        where: and(
          eq(facilityStock.facilityId, facilityId),
          eq(facilityStock.productId, item.productId)
        ),
      });
      if (existingFacilityStock) {
        await tx
          .update(facilityStock)
          .set({
            currentStock: sql`${facilityStock.currentStock} + ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(facilityStock.id, existingFacilityStock.id));
      } else {
        await tx.insert(facilityStock).values({
          companyId,
          facilityId,
          productId: item.productId,
          currentStock: item.quantity,
        });
      }
    } else {
      if (item.trackingMode === "BATCH") {
        for (const allocation of item.batchAllocations) {
          let remaining = allocation.quantity;
          const matchingRows = await tx.query.stockDetails.findMany({
            where: and(
              eq(stockDetails.companyId, companyId),
              eq(stockDetails.facilityId, facilityId),
              eq(stockDetails.productId, item.productId),
              eq(stockDetails.batchNo, allocation.batchNo),
              eq(stockDetails.status, "AVAILABLE")
            ),
            orderBy: (detail: any, { asc: ascOrder }: any) => [ascOrder(detail.createdAt)],
          });

          const available = matchingRows.reduce(
            (sum: number, row: any) => sum + row.availableQty,
            0
          );
          if (available + 0.0001 < allocation.quantity) {
            throw new Error(
              `VALIDATION:Insufficient batch stock for ${item.product?.name}. Batch ${allocation.batchNo} has only ${available} available`
            );
          }

          for (const row of matchingRows) {
            if (remaining <= 0) break;
            const consume = Math.min(row.availableQty, remaining);
            const newAvailableQty = row.availableQty - consume;
            await tx
              .update(stockDetails)
              .set({
                availableQty: newAvailableQty,
                status: newAvailableQty <= 0 ? "SOLD" : "AVAILABLE",
                soldInvoiceId: newAvailableQty <= 0 ? invoiceId : row.soldInvoiceId,
                updatedAt: new Date(),
              })
              .where(eq(stockDetails.id, row.id));
            await tx.insert(invoiceItemAllocations).values({
              invoiceItemId: item.record.id,
              stockDetailId: row.id,
              quantity: consume,
            });
            remaining -= consume;
          }
        }
      } else if (item.trackingMode === "SERIAL") {
        const matchingRows = await tx.query.stockDetails.findMany({
          where: and(
            eq(stockDetails.companyId, companyId),
            eq(stockDetails.facilityId, facilityId),
            eq(stockDetails.productId, item.productId),
            eq(stockDetails.status, "AVAILABLE"),
            inArray(stockDetails.serialNo, item.serialNumbers)
          ),
        });

        if (matchingRows.length !== item.serialNumbers.length) {
          throw new Error(
            `VALIDATION:Serial numbers for ${item.product?.name} are not available`
          );
        }

        const rowMap = new Map(
          matchingRows
            .filter((row: any) => row.serialNo)
            .map((row: any) => [row.serialNo as string, row])
        );

        for (const serial of item.serialNumbers) {
          const row: any = rowMap.get(serial);
          if (!row || row.availableQty <= 0) {
            throw new Error(
              `VALIDATION:Serial ${serial} for ${item.product?.name} is not available`
            );
          }
          await tx
            .update(stockDetails)
            .set({
              availableQty: 0,
              status: "SOLD",
              soldInvoiceId: invoiceId,
              updatedAt: new Date(),
            })
            .where(eq(stockDetails.id, row.id));
          await tx.insert(invoiceItemAllocations).values({
            invoiceItemId: item.record.id,
            stockDetailId: row.id,
            quantity: 1,
          });
        }
      }

      await tx.insert(stockMovements).values({
        companyId,
        productId: item.productId,
        facilityId,
        type: "OUT",
        quantity: item.quantity,
        batchNo:
          item.trackingMode === "BATCH"
            ? batchMovementLabel(item.batchAllocations)
            : item.batchNo?.trim() || null,
        referenceType: "INVOICE",
        referenceId: invoiceId,
      });

      await tx
        .update(products)
        .set({ currentStock: sql`${products.currentStock} - ${item.quantity}` })
        .where(eq(products.id, item.productId));

      const existingFacilityStock = await tx.query.facilityStock.findFirst({
        where: and(
          eq(facilityStock.facilityId, facilityId),
          eq(facilityStock.productId, item.productId)
        ),
      });
      if (!existingFacilityStock || existingFacilityStock.currentStock + 0.0001 < item.quantity) {
        throw new Error(
          `VALIDATION:Insufficient stock for ${item.product?.name} in the selected facility`
        );
      }
      await tx
        .update(facilityStock)
        .set({
          currentStock: sql`${facilityStock.currentStock} - ${item.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(facilityStock.id, existingFacilityStock.id));
    }
  }
}

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
  const minAmountParam = req.nextUrl.searchParams.get("minAmount");
  const maxAmountParam = req.nextUrl.searchParams.get("maxAmount");
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

  if (minAmountParam !== null) {
    const n = Number(minAmountParam);
    if (!Number.isNaN(n)) {
      conditions.push(gte(payments.amount, n));
    }
  }

  if (maxAmountParam !== null) {
    const n = Number(maxAmountParam);
    if (!Number.isNaN(n)) {
      conditions.push(lte(payments.amount, n));
    }
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
            const oldStatus = invoice.status;
            const newPaid = invoice.paidAmount + alloc.amount;
            const newStatus = newPaid >= invoice.totalAmount ? "PAID" : "PARTIAL";
            
            await tx
              .update(invoices)
              .set({ paidAmount: newPaid, status: newStatus, updatedAt: new Date() })
              .where(eq(invoices.id, alloc.invoiceId));

            // Process stock transactions if transitioning to PARTIAL or PAID from DRAFT/UNPAID
            if ((newStatus === "PARTIAL" || newStatus === "PAID") && 
                (oldStatus === "DRAFT" || oldStatus === "UNPAID")) {
              if (!invoice.facilityId) {
                throw new Error("Facility is required for stock transactions");
              }

              const items = await tx.query.invoiceItems.findMany({
                where: eq(invoiceItems.invoiceId, invoice.id),
                with: {
                  product: true,
                },
              });

              const normalizedItems = items.map((item) => ({
                ...item,
                productId: item.productId,
                quantity: item.quantity,
                trackingMode: item.product?.trackingMode ?? "NONE",
                batchAllocations: [],
                serialNumbers: [],
                record: item,
              }));

              await processStockTransactions(
                tx,
                invoice,
                normalizedItems,
                companyId,
                invoice.facilityId
              );
            }
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
            const oldStatus = invoice.status;
            const newPaid = invoice.paidAmount + adv.amount;
            const newStatus = newPaid >= invoice.totalAmount ? "PAID" : "PARTIAL";
            
            await tx
              .update(invoices)
              .set({ paidAmount: newPaid, status: newStatus, updatedAt: new Date() })
              .where(eq(invoices.id, adv.invoiceId));

            // Process stock transactions if transitioning to PARTIAL or PAID from DRAFT/UNPAID
            if ((newStatus === "PARTIAL" || newStatus === "PAID") && 
                (oldStatus === "DRAFT" || oldStatus === "UNPAID")) {
              if (!invoice.facilityId) {
                throw new Error("Facility is required for stock transactions");
              }

              const items = await tx.query.invoiceItems.findMany({
                where: eq(invoiceItems.invoiceId, invoice.id),
                with: {
                  product: true,
                },
              });

              const normalizedItems = items.map((item) => ({
                ...item,
                productId: item.productId,
                quantity: item.quantity,
                trackingMode: item.product?.trackingMode ?? "NONE",
                batchAllocations: [],
                serialNumbers: [],
                record: item,
              }));

              await processStockTransactions(
                tx,
                invoice,
                normalizedItems,
                companyId,
                invoice.facilityId
              );
            }
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
