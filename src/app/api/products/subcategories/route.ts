import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subcategories, categories } from "@/db/schema";
import { auth } from "@/lib/auth";
import { and, eq, ilike, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const limit = Math.min(Number(url.searchParams.get("limit") || 5), 50);

  const whereClauses = [eq(subcategories.companyId, session.user.companyId)];
  if (q) {
    whereClauses.push(
      or(
        ilike(subcategories.name, `%${q}%`),
        ilike(categories.name, `%${q}%`)
      )!
    );
  }

  const rows = await db
    .select({
      id: subcategories.id,
      name: subcategories.name,
      categoryId: subcategories.categoryId,
      categoryName: categories.name,
    })
    .from(subcategories)
    .innerJoin(categories, eq(subcategories.categoryId, categories.id))
    .where(and(...whereClauses))
    .orderBy(subcategories.name)
    .limit(limit);

  return NextResponse.json(rows);
}
