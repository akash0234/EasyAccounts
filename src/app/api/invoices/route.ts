import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  invoices,
  invoiceItems,
  invoiceAdditionalCharges,
  invoiceItemAllocations,
  ledgerAccounts,
  ledgerEntries,
  financialYears,
  stockMovements,
  facilityStock,
  products,
  stockDetails,
} from "@/db/schema";
import { invoiceSchema } from "@/lib/validations";
import { generateCode } from "@/lib/code-generator";
import { CODE_PREFIX } from "@/lib/code-prefixes";
import { auth } from "@/lib/auth";
import { eq, and, sql, inArray } from "drizzle-orm";

type TrackingMode = "NONE" | "BATCH" | "SERIAL";

type ParsedBatchAllocation = {
  batchNo: string;
  quantity: number;
  expiryDate?: string | null;
};

function splitCsv(value?: string) {
  return (value ?? "")
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseSerialNumbers(item: {
  serialNumbers?: string[];
  slNo?: string;
}) {
  if (Array.isArray(item.serialNumbers) && item.serialNumbers.length > 0) {
    return item.serialNumbers.map((serial) => serial.trim()).filter(Boolean);
  }
  return splitCsv(item.slNo);
}

function parseBatchAllocations(item: {
  batchAllocations?: ParsedBatchAllocation[];
  batchNo?: string;
  quantity: number;
  expiryDate?: string;
}) {
  if (Array.isArray(item.batchAllocations) && item.batchAllocations.length > 0) {
    return item.batchAllocations
      .map((allocation) => ({
        batchNo: allocation.batchNo.trim(),
        quantity: allocation.quantity,
        expiryDate: allocation.expiryDate ?? null,
      }))
      .filter((allocation) => allocation.batchNo && allocation.quantity > 0);
  }

  const raw = (item.batchNo ?? "").trim();
  if (!raw) return [];

  if (raw.includes(":")) {
    return raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [batchNo, qty] = part.split(":").map((piece) => piece.trim());
        return {
          batchNo,
          quantity: Number(qty),
          expiryDate: item.expiryDate || null,
        };
      })
      .filter((allocation) => allocation.batchNo && allocation.quantity > 0);
  }

  return [
    {
      batchNo: raw,
      quantity: item.quantity,
      expiryDate: item.expiryDate || null,
    },
  ];
}

function formatBatchSnapshot(
  trackingMode: TrackingMode,
  batchNo: string | undefined,
  batchAllocations: ParsedBatchAllocation[]
) {
  if (trackingMode === "NONE") return null;
  if (trackingMode === "SERIAL") return batchNo?.trim() || null;
  if (batchAllocations.length === 1) return batchAllocations[0].batchNo;
  if (batchAllocations.length > 1) {
    return batchAllocations
      .map((allocation) => `${allocation.batchNo}:${allocation.quantity}`)
      .join(", ");
  }
  return batchNo?.trim() || null;
}

function formatSerialSnapshot(serialNumbers: string[], slNo?: string) {
  if (serialNumbers.length === 0) return slNo?.trim() || null;
  if (serialNumbers.length === 1) return serialNumbers[0];
  return serialNumbers.join(", ");
}

function batchMovementLabel(batchAllocations: ParsedBatchAllocation[]) {
  if (batchAllocations.length === 0) return null;
  if (batchAllocations.length === 1) return batchAllocations[0].batchNo;
  return "MULTI";
}

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
    with: {
      customer: true,
      vendor: true,
      facility: true,
      items: {
        with: {
          allocations: {
            with: {
              stockDetail: true,
            },
          },
        },
      },
      additionalCharges: true,
    },
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
  const {
    items,
    additionalCharges,
    date,
    dueDate,
    notes,
    customerId,
    vendorId,
    facilityId,
    discountEnabled,
    discountAmount,
    billingAddressSnapshot,
    shippingAddressSnapshot,
    deliveryEnabled,
    deliveryMode,
    deliveryReference,
  } = parsed.data;

  if (!facilityId) {
    return NextResponse.json({ error: "Facility is required" }, { status: 400 });
  }

  const productIds = Array.from(
    new Set(items.map((item) => item.productId).filter((id): id is string => Boolean(id)))
  );
  const productRows =
    productIds.length > 0
      ? await db.query.products.findMany({
          where: and(
            eq(products.companyId, companyId),
            inArray(products.id, productIds)
          ),
        })
      : [];
  const productMap = new Map(productRows.map((product) => [product.id, product]));

  const normalizedItems = items.map((item) => {
    const product = item.productId ? productMap.get(item.productId) : undefined;
    const trackingMode = (product?.trackingMode ?? "NONE") as TrackingMode;
    const serialNumbers = parseSerialNumbers(item);
    const batchAllocations = parseBatchAllocations(item);
    return { ...item, product, trackingMode, serialNumbers, batchAllocations };
  });

  for (const item of normalizedItems) {
    if (item.productId && !item.product) {
      return NextResponse.json(
        { error: "Selected product was not found" },
        { status: 400 }
      );
    }

    if (item.trackingMode === "NONE") {
      continue;
    }

    if (item.trackingMode === "BATCH") {
      if (item.serialNumbers.length > 0) {
        return NextResponse.json(
          {
            error: `${item.product?.name ?? "Product"} is batch-tracked and should not include serial numbers`,
          },
          { status: 400 }
        );
      }
      const batchQty = item.batchAllocations.reduce(
        (sum, allocation) => sum + allocation.quantity,
        0
      );
      if (item.batchAllocations.length === 0 || Math.abs(batchQty - item.quantity) > 0.0001) {
        return NextResponse.json(
          {
            error:
              `${item.product?.name ?? "Product"} requires batch allocations whose total matches quantity`,
          },
          { status: 400 }
        );
      }
    }

    if (item.trackingMode === "SERIAL") {
      if (item.serialNumbers.length !== item.quantity) {
        return NextResponse.json(
          {
            error:
              `${item.product?.name ?? "Product"} is serial-tracked and needs exactly one serial per unit`,
          },
          { status: 400 }
        );
      }
      const serialSet = new Set(item.serialNumbers);
      if (serialSet.size !== item.serialNumbers.length) {
        return NextResponse.json(
          {
            error: `${item.product?.name ?? "Product"} contains duplicate serial numbers on the same line`,
          },
          { status: 400 }
        );
      }
    }
  }

  const activeFY = await db.query.financialYears.findFirst({
    where: and(
      eq(financialYears.companyId, companyId),
      eq(financialYears.isActive, true)
    ),
  });
  if (!activeFY) {
    return NextResponse.json({ error: "No active financial year" }, { status: 400 });
  }

  const computedItems = normalizedItems.map((item) => {
    const amount = item.quantity * item.rate;
    const gstAmount = (amount * item.gstPercent) / 100;
    return { ...item, amount, gstAmount };
  });
  const itemsSubtotal = computedItems.reduce((sum, item) => sum + item.amount, 0);
  const itemsTax = computedItems.reduce((sum, item) => sum + item.gstAmount, 0);

  const computedCharges =
    type === "SALES"
      ? (additionalCharges ?? []).map((charge) => {
          const net = Math.max(charge.amount - (charge.discountAmount ?? 0), 0);
          const gstAmount = (net * charge.gstPercent) / 100;
          return { ...charge, net, gstAmount };
        })
      : [];
  const chargesSubtotal = computedCharges.reduce((sum, charge) => sum + charge.net, 0);
  const chargesTax = computedCharges.reduce((sum, charge) => sum + charge.gstAmount, 0);

  const subtotal = itemsSubtotal + chargesSubtotal;
  const taxAmount = itemsTax + chargesTax;
  const grossTotal = subtotal + taxAmount;
  const normalizedDiscountAmount = discountEnabled
    ? Math.min(Math.max(discountAmount, 0), grossTotal)
    : 0;
  const normalizedDiscountPercent =
    discountEnabled && grossTotal > 0
      ? (normalizedDiscountAmount / grossTotal) * 100
      : 0;
  const totalAmount = grossTotal - normalizedDiscountAmount;

  const prefix =
    type === "SALES" ? CODE_PREFIX.SALES_INVOICE : CODE_PREFIX.PURCHASE_INVOICE;
  const code = generateCode(prefix);
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoices)
    .where(and(eq(invoices.companyId, companyId), eq(invoices.type, type)));
  const count = Number(countResult[0].count) + 1;
  const invoiceNumber = `${prefix}-${String(count).padStart(4, "0")}`;

  try {
    const invoice = await db.transaction(async (tx) => {
      const [createdInvoice] = await tx
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
          facilityId,
          subtotal,
          taxAmount,
          discountPercent: normalizedDiscountPercent,
          discountAmount: normalizedDiscountAmount,
          totalAmount,
          status: "UNPAID",
          notes: notes || null,
          billingAddressSnapshot: type === "SALES" ? billingAddressSnapshot || null : null,
          shippingAddressSnapshot: type === "SALES" ? shippingAddressSnapshot || null : null,
          deliveryEnabled: type === "SALES" ? deliveryEnabled : false,
          deliveryMode:
            type === "SALES" && deliveryEnabled ? deliveryMode?.trim() || null : null,
          deliveryReference:
            type === "SALES" && deliveryEnabled
              ? deliveryReference?.trim() || null
              : null,
        })
        .returning();

      const createdInvoiceItems = [];
      for (const item of computedItems) {
        const [createdItem] = await tx
          .insert(invoiceItems)
          .values({
            invoiceId: createdInvoice.id,
            productId: item.productId || null,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
            gstPercent: item.gstPercent,
            gstAmount: item.gstAmount,
            batchNo: formatBatchSnapshot(item.trackingMode, item.batchNo, item.batchAllocations),
            slNo: formatSerialSnapshot(item.serialNumbers, item.slNo),
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          })
          .returning();
        createdInvoiceItems.push({ ...item, record: createdItem });
      }

      if (computedCharges.length > 0) {
        await tx.insert(invoiceAdditionalCharges).values(
          computedCharges.map((charge) => ({
            invoiceId: createdInvoice.id,
            name: charge.name,
            hsnSac: charge.hsnSac || null,
            amount: charge.amount,
            discountAmount: charge.discountAmount ?? 0,
            gstPercent: charge.gstPercent,
            gstAmount: charge.gstAmount,
          }))
        );
      }

      for (const item of createdInvoiceItems) {
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
                sourceInvoiceId: createdInvoice.id,
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
                sourceInvoiceId: createdInvoice.id,
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
            referenceId: createdInvoice.id,
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
                orderBy: (detail, { asc: ascOrder }) => [ascOrder(detail.createdAt)],
              });

              const available = matchingRows.reduce(
                (sum, row) => sum + row.availableQty,
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
                    soldInvoiceId: newAvailableQty <= 0 ? createdInvoice.id : row.soldInvoiceId,
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
                `VALIDATION:One or more serial numbers for ${item.product?.name} are unavailable in the selected facility`
              );
            }

            const rowMap = new Map(
              matchingRows
                .filter((row) => row.serialNo)
                .map((row) => [row.serialNo as string, row])
            );

            for (const serial of item.serialNumbers) {
              const row = rowMap.get(serial);
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
                  soldInvoiceId: createdInvoice.id,
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
            referenceId: createdInvoice.id,
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

      if (type === "SALES" && customerId) {
        const customerLedger = await tx.query.ledgerAccounts.findFirst({
          where: and(
            eq(ledgerAccounts.companyId, companyId),
            eq(ledgerAccounts.customerId, customerId)
          ),
        });
        const salesLedger = await tx.query.ledgerAccounts.findFirst({
          where: and(
            eq(ledgerAccounts.companyId, companyId),
            eq(ledgerAccounts.type, "SALES")
          ),
        });

        if (customerLedger && salesLedger) {
          const newCustomerBalance = customerLedger.balance + totalAmount;
          const newSalesBalance = salesLedger.balance + totalAmount;

          await tx.insert(ledgerEntries).values([
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
              referenceId: createdInvoice.id,
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
              referenceId: createdInvoice.id,
            },
          ]);

          await tx
            .update(ledgerAccounts)
            .set({ balance: newCustomerBalance })
            .where(eq(ledgerAccounts.id, customerLedger.id));
          await tx
            .update(ledgerAccounts)
            .set({ balance: newSalesBalance })
            .where(eq(ledgerAccounts.id, salesLedger.id));
        }
      } else if (type === "PURCHASE" && vendorId) {
        const vendorLedger = await tx.query.ledgerAccounts.findFirst({
          where: and(
            eq(ledgerAccounts.companyId, companyId),
            eq(ledgerAccounts.vendorId, vendorId)
          ),
        });
        const purchaseLedger = await tx.query.ledgerAccounts.findFirst({
          where: and(
            eq(ledgerAccounts.companyId, companyId),
            eq(ledgerAccounts.type, "PURCHASE")
          ),
        });

        if (vendorLedger && purchaseLedger) {
          const newVendorBalance = vendorLedger.balance + totalAmount;
          const newPurchaseBalance = purchaseLedger.balance + totalAmount;

          await tx.insert(ledgerEntries).values([
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
              referenceId: createdInvoice.id,
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
              referenceId: createdInvoice.id,
            },
          ]);

          await tx
            .update(ledgerAccounts)
            .set({ balance: newVendorBalance })
            .where(eq(ledgerAccounts.id, vendorLedger.id));
          await tx
            .update(ledgerAccounts)
            .set({ balance: newPurchaseBalance })
            .where(eq(ledgerAccounts.id, purchaseLedger.id));
        }
      }

      return createdInvoice;
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("VALIDATION:")) {
      return NextResponse.json(
        { error: message.replace("VALIDATION:", "") },
        { status: 400 }
      );
    }
    console.error("POST /api/invoices failed", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
