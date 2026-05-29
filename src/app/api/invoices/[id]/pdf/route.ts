import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { companies, companyPaymentSettings, financialYears, invoices } from "@/db/schema";
import {
  getInvoicePdfFilename,
  renderInvoiceHtml,
  type InvoiceTemplateData,
  type TemplateItem,
  type TemplateAdditionalCharge,
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
      items: {
        with: {
          product: true,
        },
      },
      additionalCharges: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const [company, defaultPaymentSetting, fy] = await Promise.all([
    db.query.companies.findFirst({
      where: eq(companies.id, session.user.companyId),
    }),
    db.query.companyPaymentSettings.findFirst({
      where: and(
        eq(companyPaymentSettings.companyId, session.user.companyId),
        eq(companyPaymentSettings.isDefault, true)
      ),
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

  const isVendor = "address" in partySource;
  const party: TemplateParty = {
    name: partySource.name,
    gstin: partySource.gstin,
    pan: partySource.pan,
    phone: partySource.phone,
    email: partySource.email,
    address: isVendor ? partySource.address : null,
    billingAddress: null,
    shippingAddress: null,
    city: isVendor ? partySource.city : null,
    state: isVendor ? partySource.state : null,
    pincode: isVendor ? partySource.pincode : null,
  };

  const items: TemplateItem[] = invoice.items.map((it) => ({
    description: it.description,
    hsn: it.product?.hsn ?? null,
    quantity: it.quantity,
    unit: it.product?.unit ?? null,
    rate: it.rate,
    amount: it.amount,
    gstPercent: it.gstPercent,
    gstAmount: it.gstAmount,
    batchNo: it.batchNo,
    slNo: it.slNo,
    expiryDate: it.expiryDate,
  }));

  const additionalCharges: TemplateAdditionalCharge[] = (
    invoice.additionalCharges ?? []
  ).map((c) => ({
    name: c.name,
    hsnSac: c.hsnSac,
    amount: c.amount,
    discountAmount: c.discountAmount,
    gstPercent: c.gstPercent,
    gstAmount: c.gstAmount,
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
      defaultPaymentSetting,
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
      additionalCharges,
      financialYear: fy?.label ?? null,
      billingAddressSnapshot: invoice.billingAddressSnapshot,
      shippingAddressSnapshot: invoice.shippingAddressSnapshot,
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
