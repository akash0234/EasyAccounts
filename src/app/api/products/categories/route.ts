import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, ilike, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.min(Number(limitParam) || 50, 200) : undefined;

  const whereClauses = [eq(categories.companyId, session.user.companyId)];
  if (q) whereClauses.push(ilike(categories.name, `%${q}%`));

  const cats = await db.query.categories.findMany({
    where: and(...whereClauses),
    with: { subcategories: true },
    orderBy: (c, { asc }) => [asc(c.name)],
    limit,
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
