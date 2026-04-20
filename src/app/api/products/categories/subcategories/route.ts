import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subcategories } from "@/db/schema";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, categoryId } = body;

  if (!name?.trim() || !categoryId) {
    return NextResponse.json({ error: "Name and categoryId are required" }, { status: 400 });
  }

  const [row] = await db
    .insert(subcategories)
    .values({
      companyId: session.user.companyId,
      categoryId,
      name: name.trim(),
      description: description || null,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
