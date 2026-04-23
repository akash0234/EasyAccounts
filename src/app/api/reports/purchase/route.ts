import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte, inArray, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { invoices, invoiceItems, products } from "@/db/schema";
import { requireReportAdmin } from "@/lib/report-auth";

/**
 * Purchase Report
 * Query params (all optional):
 *   from, to                ISO date bounds
 *   vendorId                single vendor
 *   facilityId              single facility / godown
 *   status                  UNPAID | PARTIAL | PAID
 *   productId, categoryId, subcategoryId
 *   hsn, gstPercent, batchNo
 *   minAmount, maxAmount
 *   financialYearId
 *   groupBy                 "vendor" | "product" | "month"
 */
export async function GET(req: NextRequest) {
  const authz = await requireReportAdmin();
  if (!authz.ok) return authz.response;
  const companyId = authz.companyId;

  const q = req.nextUrl.searchParams;
  const from = q.get("from");
  const to = q.get("to");
  const vendorId = q.get("vendorId");
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
  const groupBy = q.get("groupBy");

  const conditions = [
    eq(invoices.companyId, companyId),
    eq(invoices.type, "PURCHASE" as const),
  ];
  if (from) conditions.push(gte(invoices.date, new Date(from)));
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(invoices.date, end));
  }
  if (vendorId) conditions.push(eq(invoices.vendorId, vendorId));
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

  const wantsItemFilter =
    productId || categoryId || subcategoryId || hsn || gstPercentParam || batchNo;
  if (wantsItemFilter) {
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
  }

  const rows = await db.query.invoices.findMany({
    where: and(...conditions),
    with: {
      vendor: true,
      facility: true,
      financialYear: true,
      items: { with: { product: true } },
    },
    orderBy: (i, { desc }) => [desc(i.date), desc(i.createdAt)],
  });

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

  let aggregation: Record<string, unknown> | null = null;
  if (groupBy === "vendor") {
    const byVendor = new Map<
      string,
      { vendorId: string | null; name: string; count: number; total: number; paid: number }
    >();
    for (const r of rows) {
      const key = r.vendorId ?? "—";
      const cur = byVendor.get(key) ?? {
        vendorId: r.vendorId,
        name: r.vendor?.name ?? "—",
        count: 0,
        total: 0,
        paid: 0,
      };
      cur.count += 1;
      cur.total += r.totalAmount;
      cur.paid += r.paidAmount;
      byVendor.set(key, cur);
    }
    aggregation = { groupBy, rows: Array.from(byVendor.values()) };
  } else if (groupBy === "month") {
    const byMonth = new Map<
      string,
      { month: string; count: number; total: number; tax: number }
    >();
    for (const r of rows) {
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = byMonth.get(key) ?? { month: key, count: 0, total: 0, tax: 0 };
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
      vendor: r.vendor
        ? { id: r.vendor.id, name: r.vendor.name, gstin: r.vendor.gstin }
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
