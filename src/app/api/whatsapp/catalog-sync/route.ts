import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { products } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { pushItemsBatch } from "@/lib/whatsapp/catalog";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currency = "INR", limit = 100 } = (await req.json().catch(() => ({}))) as {
    currency?: string;
    limit?: number;
  };

  const items = await db.query.products.findMany({
    where: and(eq(products.companyId, session.user.companyId), eq(products.isActive, true)),
    columns: {
      id: true,
      name: true,
      description: true,
      sellingRate: true,
      currentStock: true,
      imageUrl: true,
      sku: true,
    },
    limit: Math.min(500, Math.max(1, Number(limit) || 100)),
  });

  const payload = items.map((p) => ({
    retailer_id: p.id,
    name: p.name,
    description: p.description || "",
    price_amount: Number(p.sellingRate || 0),
    currency,
    availability: (p.currentStock ?? 0) > 0 ? ("in stock" as const) : ("out of stock" as const),
    image_url: p.imageUrl || undefined,
    sku: p.sku || undefined,
  }));

  try {
    const result = await pushItemsBatch(session.user.companyId, payload);
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 400 });
  }
}
