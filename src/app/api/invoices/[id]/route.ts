import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { invoices } from "@/db/schema";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  const { id } = await context.params;

  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, id), eq(invoices.companyId, session.user.companyId)),
    with: {
      items: true,
      additionalCharges: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}
