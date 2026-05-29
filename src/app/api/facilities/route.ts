import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { facilities } from "@/db/schema";
import { facilitySchema } from "@/lib/validations";
import { generateCode } from "@/lib/code-generator";
import { CODE_PREFIX } from "@/lib/code-prefixes";
import { auth } from "@/lib/auth";
import { eq, and, ilike, sql, type SQL } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const pageParam = Number(url.searchParams.get("page") || "0");
  const pageSizeParam = Number(url.searchParams.get("pageSize") || "25");
  const wantsPagination = url.searchParams.has("page") || url.searchParams.has("pageSize");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(Math.floor(pageSizeParam), 100)
      : 25;

  const whereClauses: SQL[] = [eq(facilities.companyId, session.user.companyId)];
  if (q) whereClauses.push(ilike(facilities.name, `%${q}%`));

  const data = await db.query.facilities.findMany({
    where: and(...whereClauses),
    orderBy: (f, { asc, desc }) => (q ? [asc(f.name)] : [desc(f.createdAt)]),
    ...(wantsPagination ? { limit: pageSize, offset: (page - 1) * pageSize } : {}),
  });

  if (wantsPagination) {
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(facilities)
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

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = facilitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const companyId = session.user.companyId;

  const [facility] = await db
    .insert(facilities)
    .values({
      companyId,
      code: generateCode(CODE_PREFIX.FACILITY),
      name: parsed.data.name,
      address: parsed.data.address || null,
      isDefault: parsed.data.isDefault || false,
    })
    .returning();

  return NextResponse.json(facility, { status: 201 });
}
