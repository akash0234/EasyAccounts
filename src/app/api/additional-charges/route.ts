import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { additionalChargeCatalog } from "@/db/schema";
import { auth } from "@/lib/auth";
import { additionalChargeCatalogSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const whereClause = q
      ? and(
          eq(additionalChargeCatalog.companyId, session.user.companyId),
          eq(additionalChargeCatalog.isActive, true),
          ilike(additionalChargeCatalog.name, `%${q}%`)
        )
      : and(
          eq(additionalChargeCatalog.companyId, session.user.companyId),
          eq(additionalChargeCatalog.isActive, true)
        );

    const data = await db
      .select()
      .from(additionalChargeCatalog)
      .where(whereClause)
      .orderBy(asc(additionalChargeCatalog.name));

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/additional-charges failed", error);
    return NextResponse.json(
      { error: "Failed to load additional charges" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = additionalChargeCatalogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const normalizedName = parsed.data.name.trim();
    const normalizedHsnSac = parsed.data.hsnSac?.trim() || null;

    const existing = await db
      .select()
      .from(additionalChargeCatalog)
      .where(
        and(
          eq(additionalChargeCatalog.companyId, session.user.companyId),
          eq(additionalChargeCatalog.name, normalizedName)
        )
      )
      .limit(1);

    if (existing[0]) {
      const [updated] = await db
        .update(additionalChargeCatalog)
        .set({
          hsnSac: normalizedHsnSac,
          defaultAmount: parsed.data.defaultAmount,
          defaultDiscountAmount: parsed.data.defaultDiscountAmount,
          gstPercent: parsed.data.gstPercent,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(additionalChargeCatalog.id, existing[0].id))
        .returning();

      return NextResponse.json(updated);
    }

    const [created] = await db
      .insert(additionalChargeCatalog)
      .values({
        companyId: session.user.companyId,
        name: normalizedName,
        hsnSac: normalizedHsnSac,
        defaultAmount: parsed.data.defaultAmount,
        defaultDiscountAmount: parsed.data.defaultDiscountAmount,
        gstPercent: parsed.data.gstPercent,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/additional-charges failed", error);
    return NextResponse.json(
      { error: "Failed to save additional charge" },
      { status: 500 }
    );
  }
}
