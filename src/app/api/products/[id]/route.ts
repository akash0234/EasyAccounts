import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, facilities, facilityStock } from "@/db/schema";
import { productSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const product = await db.query.products.findFirst({
    where: and(
      eq(products.id, id),
      eq(products.companyId, session.user.companyId)
    ),
    with: { stockMovements: true, category: true, subcategory: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const payload = {
    ...parsed.data,
    categoryId: parsed.data.categoryId || null,
    subcategoryId: parsed.data.subcategoryId || null,
    openingStock: parsed.data.trackingMode === "NONE" ? parsed.data.openingStock : 0,
  };

  const existing = await db.query.products.findFirst({
    where: and(eq(products.id, id), eq(products.companyId, session.user.companyId)),
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const openingStockDelta = payload.openingStock - existing.openingStock;
  const openingFacility =
    openingStockDelta !== 0
      ? await db.query.facilities.findFirst({
          where: and(
            eq(facilities.companyId, session.user.companyId),
            eq(facilities.isDefault, true),
            eq(facilities.isActive, true)
          ),
        }) ?? await db.query.facilities.findFirst({
          where: and(
            eq(facilities.companyId, session.user.companyId),
            eq(facilities.isActive, true)
          ),
        })
      : null;

  if (openingStockDelta !== 0 && !openingFacility) {
    return NextResponse.json(
      { error: "Create a facility before changing opening stock" },
      { status: 400 }
    );
  }

  let updated;
  try {
    updated = await db.transaction(async (tx) => {
      if (openingStockDelta !== 0 && openingFacility) {
        const currentProductStock = existing.currentStock + openingStockDelta;
        if (currentProductStock < -0.0001) {
          throw new Error("VALIDATION:Opening stock change would make total stock negative");
        }

        const facilityRows = await tx.query.facilityStock.findMany({
          where: and(
            eq(facilityStock.companyId, session.user.companyId),
            eq(facilityStock.productId, id)
          ),
        });
        const facilityCoveredStock = facilityRows.reduce(
          (sum, row) => sum + row.currentStock,
          0
        );
        const unassignedStock = existing.currentStock - facilityCoveredStock;

        if (unassignedStock < -0.0001) {
          throw new Error(
            "VALIDATION:Facility stock is already higher than total stock for this product"
          );
        }

        const existingFacilityStockRow = facilityRows.find(
          (row) => row.facilityId === openingFacility.id
        );
        const baselineFacilityStock =
          (existingFacilityStockRow?.currentStock ?? 0) + unassignedStock;
        const nextFacilityStock = baselineFacilityStock + openingStockDelta;

        if (nextFacilityStock < -0.0001) {
          throw new Error(
            "VALIDATION:Opening stock change would make the selected facility stock negative"
          );
        }

        if (existingFacilityStockRow) {
          await tx
            .update(facilityStock)
            .set({
              currentStock: sql`${facilityStock.currentStock} + ${unassignedStock + openingStockDelta}`,
              updatedAt: new Date(),
            })
            .where(eq(facilityStock.id, existingFacilityStockRow.id));
        } else {
          await tx.insert(facilityStock).values({
            companyId: session.user.companyId,
            facilityId: openingFacility.id,
            productId: id,
            currentStock: nextFacilityStock,
          });
        }
      }

      const [nextProduct] = await tx
        .update(products)
        .set({
          ...payload,
          currentStock: sql`${products.currentStock} + ${openingStockDelta}`,
          updatedAt: new Date(),
        })
        .where(and(eq(products.id, id), eq(products.companyId, session.user.companyId)))
        .returning();

      return nextProduct;
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("VALIDATION:")) {
      return NextResponse.json(
        { error: error.message.replace("VALIDATION:", "") },
        { status: 400 }
      );
    }
    throw error;
  }

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db
    .delete(products)
    .where(
      and(eq(products.id, id), eq(products.companyId, session.user.companyId))
    );

  return NextResponse.json({ success: true });
}
