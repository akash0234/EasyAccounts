import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, facilityStock } from "@/db/schema";
import { productSchema } from "@/lib/validations";
import { generateCode } from "@/lib/code-generator";
import { CODE_PREFIX } from "@/lib/code-prefixes";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await db.query.products.findMany({
    where: eq(products.companyId, session.user.companyId),
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });

  // Fetch facility stock for all products
  const allFacilityStock = await db.query.facilityStock.findMany({
    where: eq(facilityStock.companyId, session.user.companyId),
    with: { facility: true },
  });

  // Attach facility stock to each product
  const enriched = data.map((p) => ({
    ...p,
    facilityStock: allFacilityStock
      .filter((fs) => fs.productId === p.id)
      .map((fs) => ({
        facilityId: fs.facilityId,
        facilityName: fs.facility.name,
        currentStock: fs.currentStock,
      })),
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const companyId = session.user.companyId;
  const code = generateCode(CODE_PREFIX.PRODUCT);

  const [product] = await db
    .insert(products)
    .values({
      companyId,
      code,
      ...parsed.data,
      currentStock: parsed.data.openingStock || 0,
      imageUrl: parsed.data.imageUrl || null,
    })
    .returning();

  return NextResponse.json(product, { status: 201 });
}
