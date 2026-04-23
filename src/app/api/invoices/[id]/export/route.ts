import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { companies, invoices } from "@/db/schema";
import {
  getPurchaseInvoiceExportFilename,
  renderPurchaseInvoiceHtml,
} from "@/lib/purchase-invoice-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const url = new URL(request.url);
  const dispositionMode = url.searchParams.get("disposition") === "inline"
    ? "inline"
    : "attachment";

  const invoice = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.id, id),
      eq(invoices.companyId, session.user.companyId),
      eq(invoices.type, "PURCHASE")
    ),
    with: {
      vendor: true,
      facility: true,
      items: true,
    },
  });

  if (!invoice) {
    return NextResponse.json(
      { error: "Purchase invoice not found" },
      { status: 404 }
    );
  }

  const company = await db.query.companies.findFirst({
    where: eq(companies.id, session.user.companyId),
  });

  if (!company) {
    return NextResponse.json(
      { error: "Company not found" },
      { status: 404 }
    );
  }

  const html = renderPurchaseInvoiceHtml({
    company,
    invoice,
  });

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `${dispositionMode}; filename="${getPurchaseInvoiceExportFilename(invoice.invoiceNumber)}"`,
      "Cache-Control": "no-store",
    },
  });
}
