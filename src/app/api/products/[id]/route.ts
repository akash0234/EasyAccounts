import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { productSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

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
  };

  const [updated] = await db
    .update(products)
    .set({ ...payload, updatedAt: new Date() })
    .where(
      and(eq(products.id, id), eq(products.companyId, session.user.companyId))
    )
    .returning();

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
