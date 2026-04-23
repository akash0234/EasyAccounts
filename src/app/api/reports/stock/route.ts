import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { stockMovements, products } from "@/db/schema";
import { requireReportAdmin } from "@/lib/report-auth";

/**
 * Stock Transactions Report
 * Query params (all optional):
 *   from, to            ISO date bounds on stock_movements.created_at
 *   productId
 *   categoryId, subcategoryId
 *   facilityId
 *   type                IN | OUT | ADJUST
 *   referenceType       e.g. INVOICE, ADJUSTMENT
 *   batchNo
 *   hsn
 *   groupBy             "product" | "facility" | "type" | "day"
 *
 * Returns both the raw movement rows and a summary of quantity in/out/net per bucket.
 */
export async function GET(req: NextRequest) {
  const authz = await requireReportAdmin();
  if (!authz.ok) return authz.response;
  const companyId = authz.companyId;

  const q = req.nextUrl.searchParams;
  const from = q.get("from");
  const to = q.get("to");
  const productId = q.get("productId");
  const categoryId = q.get("categoryId");
  const subcategoryId = q.get("subcategoryId");
  const facilityId = q.get("facilityId");
  const type = q.get("type"); // IN | OUT | ADJUST
  const referenceType = q.get("referenceType");
  const batchNo = q.get("batchNo");
  const hsn = q.get("hsn");
  const groupBy = q.get("groupBy");

  const conditions = [eq(stockMovements.companyId, companyId)];
  if (from) conditions.push(gte(stockMovements.createdAt, new Date(from)));
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(stockMovements.createdAt, end));
  }
  if (productId) conditions.push(eq(stockMovements.productId, productId));
  if (facilityId) conditions.push(eq(stockMovements.facilityId, facilityId));
  if (type)
    conditions.push(
      eq(stockMovements.type, type as "IN" | "OUT" | "ADJUST")
    );
  if (referenceType)
    conditions.push(eq(stockMovements.referenceType, referenceType));
  if (batchNo) conditions.push(eq(stockMovements.batchNo, batchNo));

  // Category / subcategory / hsn are product-level filters — resolve to productIds first
  if (categoryId || subcategoryId || hsn) {
    const matching = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.companyId, companyId),
          ...([
            categoryId ? eq(products.categoryId, categoryId) : undefined,
            subcategoryId
              ? eq(products.subcategoryId, subcategoryId)
              : undefined,
            hsn ? eq(products.hsn, hsn) : undefined,
          ].filter(Boolean) as SQL[])
        )
      );
    const ids = matching.map((r) => r.id);
    if (ids.length === 0) {
      return NextResponse.json({
        filters: Object.fromEntries(q.entries()),
        summary: emptySummary(),
        rows: [],
      });
    }
    // Drizzle has `inArray`; import lazily
    const { inArray } = await import("drizzle-orm");
    conditions.push(inArray(stockMovements.productId, ids));
  }

  const rows = await db.query.stockMovements.findMany({
    where: and(...conditions),
    with: { product: true, facility: true },
    orderBy: (s, { desc }) => [desc(s.createdAt)],
  });

  const summary = rows.reduce(
    (acc, r) => {
      acc.count += 1;
      if (r.type === "IN") acc.inQty += r.quantity;
      else if (r.type === "OUT") acc.outQty += r.quantity;
      else acc.adjustQty += r.quantity;
      return acc;
    },
    emptySummary()
  );
  summary.netQty = summary.inQty - summary.outQty + summary.adjustQty;

  let aggregation: Record<string, unknown> | null = null;
  if (groupBy === "product") {
    const byProduct = new Map<
      string,
      {
        productId: string;
        name: string;
        hsn: string | null;
        inQty: number;
        outQty: number;
        adjustQty: number;
        net: number;
      }
    >();
    for (const r of rows) {
      const key = r.productId;
      const cur = byProduct.get(key) ?? {
        productId: r.productId,
        name: r.product?.name ?? "—",
        hsn: r.product?.hsn ?? null,
        inQty: 0,
        outQty: 0,
        adjustQty: 0,
        net: 0,
      };
      if (r.type === "IN") cur.inQty += r.quantity;
      else if (r.type === "OUT") cur.outQty += r.quantity;
      else cur.adjustQty += r.quantity;
      cur.net = cur.inQty - cur.outQty + cur.adjustQty;
      byProduct.set(key, cur);
    }
    aggregation = {
      groupBy,
      rows: Array.from(byProduct.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    };
  } else if (groupBy === "facility") {
    const byFac = new Map<
      string,
      { facilityId: string | null; name: string; inQty: number; outQty: number; adjustQty: number; net: number }
    >();
    for (const r of rows) {
      const key = r.facilityId ?? "—";
      const cur = byFac.get(key) ?? {
        facilityId: r.facilityId,
        name: r.facility?.name ?? "(no facility)",
        inQty: 0,
        outQty: 0,
        adjustQty: 0,
        net: 0,
      };
      if (r.type === "IN") cur.inQty += r.quantity;
      else if (r.type === "OUT") cur.outQty += r.quantity;
      else cur.adjustQty += r.quantity;
      cur.net = cur.inQty - cur.outQty + cur.adjustQty;
      byFac.set(key, cur);
    }
    aggregation = { groupBy, rows: Array.from(byFac.values()) };
  } else if (groupBy === "type") {
    aggregation = {
      groupBy,
      rows: [
        { type: "IN", qty: summary.inQty },
        { type: "OUT", qty: summary.outQty },
        { type: "ADJUST", qty: summary.adjustQty },
      ],
    };
  } else if (groupBy === "day") {
    const byDay = new Map<
      string,
      { day: string; inQty: number; outQty: number; adjustQty: number }
    >();
    for (const r of rows) {
      const d = new Date(r.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const cur = byDay.get(key) ?? {
        day: key,
        inQty: 0,
        outQty: 0,
        adjustQty: 0,
      };
      if (r.type === "IN") cur.inQty += r.quantity;
      else if (r.type === "OUT") cur.outQty += r.quantity;
      else cur.adjustQty += r.quantity;
      byDay.set(key, cur);
    }
    aggregation = {
      groupBy,
      rows: Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day)),
    };
  }

  return NextResponse.json({
    filters: Object.fromEntries(q.entries()),
    summary,
    rows: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      type: r.type,
      quantity: r.quantity,
      batchNo: r.batchNo,
      referenceType: r.referenceType,
      referenceId: r.referenceId,
      notes: r.notes,
      product: r.product
        ? {
            id: r.product.id,
            name: r.product.name,
            hsn: r.product.hsn,
            unit: r.product.unit,
          }
        : null,
      facility: r.facility
        ? { id: r.facility.id, name: r.facility.name }
        : null,
    })),
    aggregation,
  });
}

function emptySummary() {
  return { count: 0, inQty: 0, outQty: 0, adjustQty: 0, netQty: 0 };
}
