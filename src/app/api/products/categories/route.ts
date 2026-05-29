import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, ilike, sql, type SQL } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const isActive = url.searchParams.get("isActive");
  const pageParam = Number(url.searchParams.get("page") || "0");
  const pageSizeParam = Number(url.searchParams.get("pageSize") || "25");
  const wantsPagination = url.searchParams.has("page") || url.searchParams.has("pageSize");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(Math.floor(pageSizeParam), 100)
      : 25;

  const whereClauses: SQL[] = [eq(categories.companyId, session.user.companyId)];
  if (q) whereClauses.push(ilike(categories.name, `%${q}%`));
  if (isActive !== null && isActive !== undefined && isActive !== "") {
    whereClauses.push(eq(categories.isActive, isActive === "true"));
  }

  const cats = await db.query.categories.findMany({
    where: and(...whereClauses),
    with: { subcategories: true },
    orderBy: (c, { asc }) => [asc(c.name)],
    ...(wantsPagination ? { limit: pageSize, offset: (page - 1) * pageSize } : {}),
  });

  // Count products per category and subcategory
  const catCounts = await db
    .select({
      categoryId: products.categoryId,
      count: sql<number>`count(*)::int`,
    })
    .from(products)
    .where(eq(products.companyId, session.user.companyId))
    .groupBy(products.categoryId);

  const subCounts = await db
    .select({
      subcategoryId: products.subcategoryId,
      count: sql<number>`count(*)::int`,
    })
    .from(products)
    .where(eq(products.companyId, session.user.companyId))
    .groupBy(products.subcategoryId);

  const catCountMap = Object.fromEntries(catCounts.map((r) => [r.categoryId, r.count]));
  const subCountMap = Object.fromEntries(subCounts.map((r) => [r.subcategoryId, r.count]));

  const result = cats.map((cat) => ({
    ...cat,
    productCount: catCountMap[cat.id] || 0,
    subcategories: cat.subcategories.map((sub) => ({
      ...sub,
      productCount: subCountMap[sub.id] || 0,
    })),
  }));

  if (wantsPagination) {
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(categories)
      .where(and(...whereClauses));
    const total = Number(totalResult[0]?.count ?? 0);
    return NextResponse.json({
      data: result,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  }

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const [row] = await db
    .insert(categories)
    .values({
      companyId: session.user.companyId,
      name: name.trim(),
      description: description || null,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
