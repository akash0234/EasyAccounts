import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, facilityStock, facilities } from "@/db/schema";
import { productSchema } from "@/lib/validations";
import { generateCode } from "@/lib/code-generator";
import { CODE_PREFIX } from "@/lib/code-prefixes";
import { auth } from "@/lib/auth";
import { eq, and, or, ilike, sql, type SQL } from "drizzle-orm";

async function findOpeningStockFacility(companyId: string) {
  const defaultFacility = await db.query.facilities.findFirst({
    where: and(
      eq(facilities.companyId, companyId),
      eq(facilities.isDefault, true),
      eq(facilities.isActive, true)
    ),
  });

  if (defaultFacility) {
    return defaultFacility;
  }

  return db.query.facilities.findFirst({
    where: and(
      eq(facilities.companyId, companyId),
      eq(facilities.isActive, true)
    ),
  });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const categoryId = url.searchParams.get("categoryId");
  const subcategoryId = url.searchParams.get("subcategoryId");
  const isActive = url.searchParams.get("isActive");
  const pageParam = Number(url.searchParams.get("page") || "0");
  const pageSizeParam = Number(url.searchParams.get("pageSize") || "25");
  const wantsPagination = url.searchParams.has("page") || url.searchParams.has("pageSize");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(Math.floor(pageSizeParam), 100)
      : 25;

  const whereClauses: SQL[] = [eq(products.companyId, session.user.companyId)];
  if (q) {
    whereClauses.push(
      or(
        ilike(products.name, `%${q}%`),
        ilike(products.code, `%${q}%`),
        ilike(products.hsn, `%${q}%`),
        ilike(products.sku, `%${q}%`)
      )!
    );
  }
  if (categoryId) {
    whereClauses.push(eq(products.categoryId, categoryId));
  }
  if (subcategoryId) {
    whereClauses.push(eq(products.subcategoryId, subcategoryId));
  }
  if (isActive !== null && isActive !== undefined && isActive !== "") {
    whereClauses.push(eq(products.isActive, isActive === "true"));
  }

  const data = await db.query.products.findMany({
    where: and(...whereClauses),
    with: { category: true, subcategory: true },
    orderBy: (p, { asc, desc }) => (q ? [asc(p.name)] : [desc(p.createdAt)]),
    ...(wantsPagination ? { limit: pageSize, offset: (page - 1) * pageSize } : {}),
  });

  if (q) {
    if (wantsPagination) {
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(and(...whereClauses));
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

  if (wantsPagination) {
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(...whereClauses));
    const total = Number(totalResult[0]?.count ?? 0);
    return NextResponse.json({
      data: enriched,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  }

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
  const payload = {
    ...parsed.data,
    categoryId: parsed.data.categoryId || null,
    subcategoryId: parsed.data.subcategoryId || null,
    openingStock: parsed.data.trackingMode === "NONE" ? parsed.data.openingStock : 0,
  };
  const openingFacility =
    payload.openingStock > 0 ? await findOpeningStockFacility(companyId) : null;

  if (payload.openingStock > 0 && !openingFacility) {
    return NextResponse.json(
      { error: "Create a facility before adding opening stock" },
      { status: 400 }
    );
  }

  const product = await db.transaction(async (tx) => {
    const [createdProduct] = await tx
      .insert(products)
      .values({
        companyId,
        code,
        ...payload,
        currentStock: payload.openingStock || 0,
        imageUrl: parsed.data.imageUrl || null,
      })
      .returning();

    if (payload.openingStock > 0 && openingFacility) {
      await tx.insert(facilityStock).values({
        companyId,
        facilityId: openingFacility.id,
        productId: createdProduct.id,
        currentStock: payload.openingStock,
      });
    }

    return createdProduct;
  });

  return NextResponse.json(product, { status: 201 });
}
