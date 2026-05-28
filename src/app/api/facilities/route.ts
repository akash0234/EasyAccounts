import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { facilities } from "@/db/schema";
import { facilitySchema } from "@/lib/validations";
import { generateCode } from "@/lib/code-generator";
import { CODE_PREFIX } from "@/lib/code-prefixes";
import { auth } from "@/lib/auth";
import { eq, and, ilike } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.min(Number(limitParam) || 50, 200) : undefined;

  const whereClauses = [eq(facilities.companyId, session.user.companyId)];
  if (q) whereClauses.push(ilike(facilities.name, `%${q}%`));

  const data = await db.query.facilities.findMany({
    where: and(...whereClauses),
    orderBy: (f, { asc, desc }) => (q ? [asc(f.name)] : [desc(f.createdAt)]),
    limit,
  });

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
