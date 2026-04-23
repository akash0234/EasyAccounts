import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { companies, financialYears, invoices } from "@/db/schema";
import {
  getInvoicePdfFilename,
  renderInvoiceHtml,
  type InvoiceTemplateData,
  type TemplateItem,
  type TemplateParty,
} from "@/lib/pdf/invoice-template";
import { htmlToPdfBuffer } from "@/lib/pdf/render";

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
  const disposition =
    url.searchParams.get("disposition") === "inline" ? "inline" : "attachment";

  const invoice = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.id, id),
      eq(invoices.companyId, session.user.companyId)
    ),
    with: {
      vendor: true,
      customer: true,
      facility: true,
      items: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const [company, fy] = await Promise.all([
    db.query.companies.findFirst({
      where: eq(companies.id, session.user.companyId),
    }),
    db.query.financialYears.findFirst({
      where: eq(financialYears.id, invoice.financialYearId),
    }),
  ]);

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const partySource =
    invoice.type === "PURCHASE" ? invoice.vendor : invoice.customer;

  if (!partySource) {
    return NextResponse.json(
      { error: "Invoice is missing its party" },
      { status: 409 }
    );
  }

  const party: TemplateParty = {
    name: partySource.name,
    gstin: partySource.gstin,
    pan: partySource.pan,
    phone: partySource.phone,
    email: partySource.email,
    address:
      "address" in partySource
        ? partySource.address
        : partySource.billingAddress,
    billingAddress:
      "billingAddress" in partySource ? partySource.billingAddress : null,
    shippingAddress:
      "shippingAddress" in partySource ? partySource.shippingAddress : null,
    city: partySource.city,
    state: partySource.state,
    pincode: partySource.pincode,
  };

  const items: TemplateItem[] = invoice.items.map((it) => ({
    description: it.description,
    quantity: it.quantity,
    rate: it.rate,
    amount: it.amount,
    gstPercent: it.gstPercent,
    gstAmount: it.gstAmount,
    batchNo: it.batchNo,
    slNo: it.slNo,
    expiryDate: it.expiryDate,
  }));

  const data: InvoiceTemplateData = {
    type: invoice.type,
    company: {
      name: company.name,
      gstin: company.gstin,
      pan: company.pan,
      phone: company.phone,
      email: company.email,
      address: company.address,
      city: company.city,
      state: company.state,
      pincode: company.pincode,
    },
    party,
    facility: invoice.facility
      ? {
          name: invoice.facility.name,
          address: invoice.facility.address,
        }
      : null,
    invoice: {
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.date,
      dueDate: invoice.dueDate,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      discountAmount: invoice.discountAmount,
      discountPercent: invoice.discountPercent,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      status: invoice.status,
      notes: invoice.notes,
      items,
      financialYear: fy?.label ?? null,
    },
  };

  const html = renderInvoiceHtml(data);
  const pdf = await htmlToPdfBuffer(html);
  const filename = getInvoicePdfFilename(invoice.type, invoice.invoiceNumber);

  // Copy into a fresh Uint8Array so the view is independent of Node's
  // shared Buffer pool, and let the runtime set Content-Length itself —
  // setting it manually breaks browsers when Next.js applies compression
  // or chunked transfer (IDM ignores the header, browsers truncate to 0).
  const body = new Uint8Array(pdf.byteLength);
  body.set(pdf);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
