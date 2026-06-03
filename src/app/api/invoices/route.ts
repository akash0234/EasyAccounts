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
  customers,
  vendors,
  invoiceHistory,
} from "@/db/schema";
import { invoiceSchema } from "@/lib/validations";
import { generateCode } from "@/lib/code-generator";
import { CODE_PREFIX } from "@/lib/code-prefixes";
import { auth } from "@/lib/auth";
import { eq, and, sql, inArray, ilike, or, gte, lte, type SQL } from "drizzle-orm";

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
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const status = req.nextUrl.searchParams.get("status");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const customerId = req.nextUrl.searchParams.get("customerId");
  const vendorId = req.nextUrl.searchParams.get("vendorId");
  const facilityId = req.nextUrl.searchParams.get("facilityId");
  const pageParam = Number(req.nextUrl.searchParams.get("page") || "0");
  const pageSizeParam = Number(req.nextUrl.searchParams.get("pageSize") || "25");
  const wantsPagination = req.nextUrl.searchParams.has("page") || req.nextUrl.searchParams.has("pageSize");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(Math.floor(pageSizeParam), 100)
      : 25;

  const conditions: SQL[] = [
    eq(invoices.companyId, session.user.companyId),
    eq(invoices.type, type as "SALES" | "PURCHASE"),
  ];

  if (status) {
    conditions.push(eq(invoices.status, status as "DRAFT" | "UNPAID" | "PARTIAL" | "PAID"));
  }

  if (from) {
    conditions.push(gte(invoices.date, new Date(from)));
  }

  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(invoices.date, end));
  }

  if (customerId) {
    conditions.push(eq(invoices.customerId, customerId));
  }

  if (vendorId) {
    conditions.push(eq(invoices.vendorId, vendorId));
  }

  if (facilityId) {
    conditions.push(eq(invoices.facilityId, facilityId));
  }

  if (q) {
    const like = `%${q}%`;
    const partyMatches =
      type === "PURCHASE"
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
        ilike(invoices.invoiceNumber, like),
        partyIds.length > 0
          ? type === "PURCHASE"
            ? inArray(invoices.vendorId, partyIds)
            : inArray(invoices.customerId, partyIds)
          : sql`false`
      )!
    );
  }

  const data = await db.query.invoices.findMany({
    where: and(...conditions),
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
    ...(wantsPagination ? { limit: pageSize, offset: (page - 1) * pageSize } : {}),
  });

  if (wantsPagination) {
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
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
          status: "DRAFT",
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

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get("id");
  const action = searchParams.get("action");

  if (!invoiceId) {
    return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
  }

  if (action === "edit") {
    const body = await req.json();
    const parsed = invoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    try {
      const result = await db.transaction(async (tx) => {
        const [invoice] = await tx
          .select()
          .from(invoices)
          .where(eq(invoices.id, invoiceId))
          .limit(1);

        if (!invoice) {
          throw new Error("Invoice not found");
        }

        if (invoice.companyId !== session.user.companyId) {
          throw new Error("Unauthorized");
        }

        // Only allow editing of DRAFT or UNPAID invoices
        if (!(invoice.status === "DRAFT" || invoice.status === "UNPAID")) {
          throw new Error("Only DRAFT or UNPAID invoices can be edited");
        }

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
          throw new Error("Facility is required");
        }

        const productIds = Array.from(
          new Set(items.map((item) => item.productId).filter((id): id is string => Boolean(id)))
        );
        const productRows =
          productIds.length > 0
            ? await tx.query.products.findMany({
                where: and(
                  eq(products.companyId, session.user.companyId),
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
            throw new Error("Selected product was not found");
          }

          if (item.trackingMode === "BATCH") {
            if (item.serialNumbers.length > 0) {
              throw new Error(
                `${item.product?.name ?? "Product"} is batch-tracked and should not include serial numbers`
              );
            }
            const batchQty = item.batchAllocations.reduce(
              (sum, allocation) => sum + allocation.quantity,
              0
            );
            if (item.batchAllocations.length === 0 || Math.abs(batchQty - item.quantity) > 0.0001) {
              throw new Error(
                `${item.product?.name ?? "Product"} requires batch allocations whose total matches quantity`
              );
            }
          }

          if (item.trackingMode === "SERIAL") {
            if (item.serialNumbers.length !== item.quantity) {
              throw new Error(
                `${item.product?.name ?? "Product"} is serial-tracked and needs exactly one serial per unit`
              );
            }
            const serialSet = new Set(item.serialNumbers);
            if (serialSet.size !== item.serialNumbers.length) {
              throw new Error(
                `${item.product?.name ?? "Product"} contains duplicate serial numbers on the same line`
              );
            }
          }
        }

        const computedItems = normalizedItems.map((item) => {
          const amount = item.quantity * item.rate;
          const gstAmount = (amount * item.gstPercent) / 100;
          return { ...item, amount, gstAmount };
        });
        const itemsSubtotal = computedItems.reduce((sum, item) => sum + item.amount, 0);
        const itemsTax = computedItems.reduce((sum, item) => sum + item.gstAmount, 0);

        const computedCharges =
          invoice.type === "SALES"
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

        // Delete existing items and charges
        await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
        await tx.delete(invoiceAdditionalCharges).where(eq(invoiceAdditionalCharges.invoiceId, invoiceId));

        // Update invoice
        const [updated] = await tx
          .update(invoices)
          .set({
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
            notes: notes || null,
            billingAddressSnapshot: invoice.type === "SALES" ? billingAddressSnapshot || null : null,
            shippingAddressSnapshot: invoice.type === "SALES" ? shippingAddressSnapshot || null : null,
            deliveryEnabled: invoice.type === "SALES" ? deliveryEnabled : false,
            deliveryMode:
              invoice.type === "SALES" && deliveryEnabled ? deliveryMode?.trim() || null : null,
            deliveryReference:
              invoice.type === "SALES" && deliveryEnabled
                ? deliveryReference?.trim() || null
                : null,
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, invoiceId))
          .returning();

        // Insert new items
        for (const item of computedItems) {
          await tx.insert(invoiceItems).values({
            invoiceId: updated.id,
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
          });
        }

        // Insert new charges
        if (computedCharges.length > 0) {
          await tx.insert(invoiceAdditionalCharges).values(
            computedCharges.map((charge) => ({
              invoiceId: updated.id,
              name: charge.name,
              hsnSac: charge.hsnSac || null,
              amount: charge.amount,
              discountAmount: charge.discountAmount ?? 0,
              gstPercent: charge.gstPercent,
              gstAmount: charge.gstAmount,
            }))
          );
        }

        // No ledger ADJUSTMENTs on invoice edits; ledger is only impacted by payments

        return updated;
      });

      return NextResponse.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("PATCH /api/invoices failed", error);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (action === "status") {
    const body = await req.json();
    const { status, notes } = body;

    if (!status || !["DRAFT", "UNPAID", "PARTIAL", "PAID"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    try {
      const result = await db.transaction(async (tx) => {
        const [invoice] = await tx
          .select()
          .from(invoices)
          .where(eq(invoices.id, invoiceId))
          .limit(1);

        if (!invoice) {
          throw new Error("Invoice not found");
        }

        if (invoice.companyId !== session.user.companyId) {
          throw new Error("Unauthorized");
        }

        const oldStatus = invoice.status;
        if (oldStatus === status) {
          return invoice;
        }

        // Validate status transitions
        const validTransitions: Record<string, string[]> = {
          DRAFT: ["UNPAID"],
          UNPAID: ["PARTIAL", "PAID"],
          PARTIAL: ["PAID"],
          PAID: [],
        };

        if (!validTransitions[oldStatus]?.includes(status)) {
          throw new Error(`Cannot transition from ${oldStatus} to ${status}`);
        }

        // Record history
        await tx.insert(invoiceHistory).values({
          invoiceId,
          companyId: session.user.companyId,
          oldStatus,
          newStatus: status,
          changedBy: session.user.id,
          notes: notes || null,
        });

        // Update status
        const [updated] = await tx
          .update(invoices)
          .set({ status, updatedAt: new Date() })
          .where(eq(invoices.id, invoiceId))
          .returning();

        // No ledger entries on status changes; ledger is only impacted by payments

        return updated;
      });

      return NextResponse.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("PATCH /api/invoices failed", error);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get("id");

  if (!invoiceId) {
    return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1);

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      if (invoice.companyId !== session.user.companyId) {
        throw new Error("Unauthorized");
      }

      // Only allow deletion of DRAFT invoices
      if (invoice.status !== "DRAFT") {
        throw new Error("Only DRAFT invoices can be deleted");
      }

      // Delete cascade will handle items, additional charges, and history
      await tx.delete(invoices).where(eq(invoices.id, invoiceId));

      return { success: true };
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("DELETE /api/invoices failed", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
