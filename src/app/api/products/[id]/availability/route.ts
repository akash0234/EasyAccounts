import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, facilityStock, stockDetails } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const facilityId = req.nextUrl.searchParams.get("facilityId")?.trim();

  if (!facilityId) {
    return NextResponse.json({ error: "Facility is required" }, { status: 400 });
  }

  const product = await db.query.products.findFirst({
    where: and(
      eq(products.id, id),
      eq(products.companyId, session.user.companyId)
    ),
  });

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const facilityRow = await db.query.facilityStock.findFirst({
    where: and(
      eq(facilityStock.companyId, session.user.companyId),
      eq(facilityStock.facilityId, facilityId),
      eq(facilityStock.productId, id)
    ),
  });

  const detailRows = await db.query.stockDetails.findMany({
    where: and(
      eq(stockDetails.companyId, session.user.companyId),
      eq(stockDetails.facilityId, facilityId),
      eq(stockDetails.productId, id),
      eq(stockDetails.status, "AVAILABLE")
    ),
    orderBy: (detail, { asc }) => [asc(detail.createdAt)],
  });

  const batches =
    product.trackingMode === "BATCH"
      ? Array.from(
          detailRows.reduce((map, row) => {
            const batchNo = row.batchNo?.trim();
            if (!batchNo || row.availableQty <= 0) return map;

            const existing = map.get(batchNo) ?? {
              batchNo,
              availableQty: 0,
              expiryDate: row.expiryDate?.toISOString() ?? null,
            };

            existing.availableQty += row.availableQty;
            if (!existing.expiryDate && row.expiryDate) {
              existing.expiryDate = row.expiryDate.toISOString();
            }
            map.set(batchNo, existing);
            return map;
          }, new Map<string, { batchNo: string; availableQty: number; expiryDate: string | null }>())
        ).map(([, value]) => value)
      : [];

  const serials =
    product.trackingMode === "SERIAL"
      ? detailRows
          .filter((row) => row.serialNo && row.availableQty > 0)
          .map((row) => ({
            serialNo: row.serialNo as string,
            batchNo: row.batchNo?.trim() || null,
            expiryDate: row.expiryDate?.toISOString() ?? null,
          }))
      : [];

  return NextResponse.json({
    productId: product.id,
    facilityId,
    trackingMode: product.trackingMode,
    unit: product.unit,
    currentStock: facilityRow?.currentStock ?? 0,
    batches,
    serials,
    serialCount: serials.length,
    updatedAt: facilityRow?.updatedAt?.toISOString() ?? null,
  });
}
