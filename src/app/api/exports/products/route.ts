import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { auth } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

function toCsvRow(values: (string | number | null | undefined)[]) {
  return values
    .map((v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (/[",\n]/.test(s)) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    })
    .join(",");
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await db.query.products.findMany({
    where: and(eq(products.companyId, session.user.companyId), eq(products.isActive, true)),
    columns: {
      id: true,
      name: true,
      description: true,
      sku: true,
      sellingRate: true,
      currentStock: true,
      imageUrl: true,
    },
  });

  const header = [
    "retailer_id",
    "name",
    "description",
    "price",
    "availability",
    "image_link",
    "sku",
  ];

  const rows = items.map((p) => {
    const price = `${(p.sellingRate ?? 0).toFixed(2)} INR`;
    const availability = (p.currentStock ?? 0) > 0 ? "in stock" : "out of stock";
    return toCsvRow([
      p.id,
      p.name,
      p.description || "",
      price,
      availability,
      p.imageUrl || "",
      p.sku || "",
    ]);
  });

  const csv = [toCsvRow(header), ...rows].join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=products.csv",
      "Cache-Control": "no-store",
    },
  });
}
