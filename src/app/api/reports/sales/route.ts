import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte, inArray, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { invoices, invoiceItems, products } from "@/db/schema";
import { requireReportAdmin } from "@/lib/report-auth";

/**
 * Sales Report
 * Query params (all optional):
 *   from, to                ISO date (inclusive, invoice date)
 *   customerId              filter to a single customer
 *   facilityId              filter to a single facility
 *   status                  UNPAID | PARTIAL | PAID
 *   productId               filter rows to those containing the product
 *   categoryId              filter rows to products in this category
 *   subcategoryId           filter rows to products in this subcategory
 *   hsn                     exact HSN code match (on items.product.hsn)
 *   gstPercent              filter items by GST rate
 *   batchNo                 filter items by batch number
 *   minAmount, maxAmount    invoice.totalAmount bounds
 *   financialYearId         restrict to a given FY
 *   groupBy                 optional: "customer" | "product" | "month" — returns aggregate only
 */
export async function GET(req: NextRequest) {
  const authz = await requireReportAdmin();
  if (!authz.ok) return authz.response;
  const companyId = authz.companyId;

  const q = req.nextUrl.searchParams;
  const from = q.get("from");
  const to = q.get("to");
  const customerId = q.get("customerId");
  const facilityId = q.get("facilityId");
  const status = q.get("status");
  const productId = q.get("productId");
  const categoryId = q.get("categoryId");
  const subcategoryId = q.get("subcategoryId");
  const hsn = q.get("hsn");
  const gstPercentParam = q.get("gstPercent");
  const batchNo = q.get("batchNo");
  const minAmountParam = q.get("minAmount");
  const maxAmountParam = q.get("maxAmount");
  const financialYearId = q.get("financialYearId");
  const groupBy = q.get("groupBy"); // "customer" | "product" | "month"

  const conditions = [
    eq(invoices.companyId, companyId),
    eq(invoices.type, "SALES" as const),
  ];
  if (from) conditions.push(gte(invoices.date, new Date(from)));
  if (to) {
    // inclusive end of day
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(invoices.date, end));
  }
  if (customerId) conditions.push(eq(invoices.customerId, customerId));
  if (facilityId) conditions.push(eq(invoices.facilityId, facilityId));
  if (status)
    conditions.push(
      eq(invoices.status, status as "UNPAID" | "PARTIAL" | "PAID")
    );
  if (financialYearId)
    conditions.push(eq(invoices.financialYearId, financialYearId));
  if (minAmountParam) {
    const n = Number(minAmountParam);
    if (!Number.isNaN(n)) conditions.push(gte(invoices.totalAmount, n));
  }
  if (maxAmountParam) {
    const n = Number(maxAmountParam);
    if (!Number.isNaN(n)) conditions.push(lte(invoices.totalAmount, n));
  }

  // If any item-level filters are supplied, we need to constrain invoices
  // to those containing matching items.
  const itemFilters: string[] = [];
  const wantsItemFilter =
    productId || categoryId || subcategoryId || hsn || gstPercentParam || batchNo;
  if (wantsItemFilter) {
    // Find invoice IDs whose items match
    const matchingInvoiceIds = await db
      .select({ id: invoiceItems.invoiceId })
      .from(invoiceItems)
      .leftJoin(products, eq(invoiceItems.productId, products.id))
      .where(
        and(
          ...([
            productId ? eq(invoiceItems.productId, productId) : undefined,
            categoryId ? eq(products.categoryId, categoryId) : undefined,
            subcategoryId
              ? eq(products.subcategoryId, subcategoryId)
              : undefined,
            hsn ? eq(products.hsn, hsn) : undefined,
            gstPercentParam
              ? eq(invoiceItems.gstPercent, Number(gstPercentParam))
              : undefined,
            batchNo ? eq(invoiceItems.batchNo, batchNo) : undefined,
          ].filter(Boolean) as SQL[])
        )
      );
    const ids = Array.from(new Set(matchingInvoiceIds.map((r) => r.id)));
    if (ids.length === 0) {
      return NextResponse.json({
        filters: Object.fromEntries(q.entries()),
        summary: emptySummary(),
        rows: [],
      });
    }
    conditions.push(inArray(invoices.id, ids));
    itemFilters.push("item-filtered");
  }

  const rows = await db.query.invoices.findMany({
    where: and(...conditions),
    with: {
      customer: true,
      facility: true,
      financialYear: true,
      items: { with: { product: true } },
    },
    orderBy: (i, { desc }) => [desc(i.date), desc(i.createdAt)],
  });

  // Summary
  const summary = rows.reduce(
    (acc, r) => {
      acc.count += 1;
      acc.subtotal += r.subtotal;
      acc.tax += r.taxAmount;
      acc.discount += r.discountAmount;
      acc.total += r.totalAmount;
      acc.paid += r.paidAmount;
      acc.outstanding += r.totalAmount - r.paidAmount;
      return acc;
    },
    emptySummary()
  );

  // Optional aggregation
  let aggregation: Record<string, unknown> | null = null;
  if (groupBy === "customer") {
    const byCustomer = new Map<
      string,
      { customerId: string | null; name: string; count: number; total: number; paid: number }
    >();
    for (const r of rows) {
      const key = r.customerId ?? "—";
      const cur = byCustomer.get(key) ?? {
        customerId: r.customerId,
        name: r.customer?.name ?? "—",
        count: 0,
        total: 0,
        paid: 0,
      };
      cur.count += 1;
      cur.total += r.totalAmount;
      cur.paid += r.paidAmount;
      byCustomer.set(key, cur);
    }
    aggregation = { groupBy, rows: Array.from(byCustomer.values()) };
  } else if (groupBy === "month") {
    const byMonth = new Map<
      string,
      { month: string; count: number; total: number; tax: number }
    >();
    for (const r of rows) {
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = byMonth.get(key) ?? {
        month: key,
        count: 0,
        total: 0,
        tax: 0,
      };
      cur.count += 1;
      cur.total += r.totalAmount;
      cur.tax += r.taxAmount;
      byMonth.set(key, cur);
    }
    aggregation = {
      groupBy,
      rows: Array.from(byMonth.values()).sort((a, b) =>
        a.month.localeCompare(b.month)
      ),
    };
  } else if (groupBy === "product") {
    const byProduct = new Map<
      string,
      {
        productId: string | null;
        name: string;
        hsn: string | null;
        qty: number;
        amount: number;
        tax: number;
      }
    >();
    for (const r of rows) {
      for (const item of r.items) {
        const key = item.productId ?? `desc:${item.description}`;
        const cur = byProduct.get(key) ?? {
          productId: item.productId,
          name: item.product?.name ?? item.description,
          hsn: item.product?.hsn ?? null,
          qty: 0,
          amount: 0,
          tax: 0,
        };
        cur.qty += item.quantity;
        cur.amount += item.amount;
        cur.tax += item.gstAmount;
        byProduct.set(key, cur);
      }
    }
    aggregation = {
      groupBy,
      rows: Array.from(byProduct.values()).sort((a, b) => b.amount - a.amount),
    };
  }

  return NextResponse.json({
    filters: Object.fromEntries(q.entries()),
    summary,
    rows: rows.map((r) => ({
      id: r.id,
      date: r.date,
      invoiceNumber: r.invoiceNumber,
      status: r.status,
      customer: r.customer
        ? { id: r.customer.id, name: r.customer.name, gstin: r.customer.gstin }
        : null,
      facility: r.facility
        ? { id: r.facility.id, name: r.facility.name }
        : null,
      financialYear: r.financialYear?.label ?? null,
      subtotal: r.subtotal,
      taxAmount: r.taxAmount,
      discountAmount: r.discountAmount,
      totalAmount: r.totalAmount,
      paidAmount: r.paidAmount,
      outstanding: r.totalAmount - r.paidAmount,
      itemCount: r.items.length,
    })),
    aggregation,
    meta: { itemFilters },
  });
}

function emptySummary() {
  return {
    count: 0,
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
    paid: 0,
    outstanding: 0,
  };
}

