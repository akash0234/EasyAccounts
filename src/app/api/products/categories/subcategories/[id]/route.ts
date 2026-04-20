import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subcategories } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

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
  const { name, description } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const [row] = await db
    .update(subcategories)
    .set({ name: name.trim(), description: description || null, updatedAt: new Date() })
    .where(and(eq(subcategories.id, id), eq(subcategories.companyId, session.user.companyId)))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(row);
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

  const [row] = await db
    .delete(subcategories)
    .where(and(eq(subcategories.id, id), eq(subcategories.companyId, session.user.companyId)))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
