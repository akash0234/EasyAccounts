/**
 * Shared invoice HTML template used for both SALES and PURCHASE PDFs.
 * Pure function of its data — safe to call from workers / batch jobs.
 *
 * Later: a real logo URL can be placed into `company.logoUrl`; until then,
 * we render a rounded-square placeholder with the company's initials.
 */

export type InvoiceTemplateType = "SALES" | "PURCHASE";

export interface TemplateCompany {
  name: string;
  gstin?: string | null;
  pan?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  /** Optional data URL or absolute URL for a logo image. */
  logoUrl?: string | null;
}

export interface TemplateParty {
  name: string;
  gstin?: string | null;
  pan?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}

export interface TemplateFacility {
  name: string;
  address?: string | null;
}

export interface TemplateItem {
  description: string;
  hsn?: string | null;
  quantity: number;
  unit?: string | null;
  rate: number;
  amount: number;
  gstPercent: number;
  gstAmount: number;
  batchNo?: string | null;
  slNo?: string | null;
  expiryDate?: Date | string | null;
}

export interface TemplateInvoice {
  invoiceNumber: string;
  date: Date | string;
  dueDate?: Date | string | null;
  subtotal: number;
  taxAmount: number;
  discountAmount?: number | null;
  discountPercent?: number | null;
  totalAmount: number;
  paidAmount: number;
  status: string;
  notes?: string | null;
  items: TemplateItem[];
  financialYear?: string | null;
}

export interface InvoiceTemplateData {
  type: InvoiceTemplateType;
  company: TemplateCompany;
  party: TemplateParty;
  facility?: TemplateFacility | null;
  invoice: TemplateInvoice;
}

// ── helpers ─────────────────────────────────────────────────────────────

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(
    value || 0
  );
}

function formatDate(value?: Date | string | null) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function joinAddress(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(", ");
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "EA";
}

/**
 * Rupee amount in words (Indian numbering: lakh, crore).
 * Handles integers + paise.
 */
function amountInWords(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "Zero Rupees Only";
  const isNeg = n < 0;
  const abs = Math.abs(n);
  const rupees = Math.floor(abs);
  const paise = Math.round((abs - rupees) * 100);

  const words = (num: number): string => {
    const ones = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
      "Sixteen", "Seventeen", "Eighteen", "Nineteen",
    ];
    const tens = [
      "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
    ];
    const two = (x: number) =>
      x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]}${x % 10 ? " " + ones[x % 10] : ""}`;
    const three = (x: number) =>
      x >= 100
        ? `${ones[Math.floor(x / 100)]} Hundred${x % 100 ? " " + two(x % 100) : ""}`
        : two(x);

    if (num === 0) return "Zero";
    let out = "";
    const crore = Math.floor(num / 10000000);
    if (crore > 0) {
      out += three(crore) + " Crore ";
      num %= 10000000;
    }
    const lakh = Math.floor(num / 100000);
    if (lakh > 0) {
      out += three(lakh) + " Lakh ";
      num %= 100000;
    }
    const thousand = Math.floor(num / 1000);
    if (thousand > 0) {
      out += three(thousand) + " Thousand ";
      num %= 1000;
    }
    if (num > 0) out += three(num);
    return out.replace(/\s+/g, " ").trim();
  };

  let result = `${words(rupees)} Rupees`;
  if (paise > 0) result += ` and ${words(paise)} Paise`;
  result += " Only";
  if (isNeg) result = "Minus " + result;
  return result;
}

/** Same-state → CGST+SGST; else IGST. */
function splitTax(
  companyState: string | null | undefined,
  partyState: string | null | undefined,
  taxAmount: number
) {
  const sameState =
    companyState && partyState &&
    companyState.trim().toLowerCase() === partyState.trim().toLowerCase();
  if (sameState) {
    const half = taxAmount / 2;
    return { cgst: half, sgst: half, igst: 0, sameState: true };
  }
  return { cgst: 0, sgst: 0, igst: taxAmount, sameState: false };
}

// ── filename ────────────────────────────────────────────────────────────

export function getInvoicePdfFilename(
  type: InvoiceTemplateType,
  invoiceNumber: string
) {
  const safe = invoiceNumber
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const prefix = type === "SALES" ? "sales-invoice" : "purchase-invoice";
  return `${safe || prefix}.pdf`;
}

// ── main render ─────────────────────────────────────────────────────────

export function renderInvoiceHtml(data: InvoiceTemplateData): string {
  const { type, company, party, facility, invoice } = data;

  const isSales = type === "SALES";
  const docTitle = isSales ? "TAX INVOICE" : "PURCHASE INVOICE";
  const partyLabel = isSales ? "Bill To" : "Bill From (Vendor)";
  const companyLabel = isSales ? "Sold By" : "Purchased By";

  const companyAddress = joinAddress([
    company.address, company.city, company.state, company.pincode,
  ]);
  const partyAddress = joinAddress([
    party.billingAddress ?? party.address,
    party.city, party.state, party.pincode,
  ]);

  const tax = splitTax(company.state, party.state, invoice.taxAmount);
  const balance = Math.max(invoice.totalAmount - invoice.paidAmount, 0);

  const logoBlock = company.logoUrl
    ? `<img class="logo" src="${escapeHtml(company.logoUrl)}" alt="${escapeHtml(company.name)} logo" />`
    : `<div class="logo logo-placeholder" aria-label="Company logo placeholder">${escapeHtml(initials(company.name))}</div>`;

  const statusTone =
    invoice.status === "PAID" ? "paid" : invoice.status === "PARTIAL" ? "partial" : "unpaid";

  const rowsHtml = invoice.items.map((item, i) => {
    const lineTotal = item.amount + item.gstAmount;
    const qtyDisplay = `${formatNumber(item.quantity)}${item.unit ? " " + escapeHtml(item.unit) : ""}`;
    return `
      <tr>
        <td class="col-sn">${i + 1}</td>
        <td class="col-desc">
          <div class="cell-main">${escapeHtml(item.description)}</div>
          ${
            item.batchNo || item.slNo || item.expiryDate
              ? `<div class="cell-sub">
                   ${item.batchNo ? `Batch: ${escapeHtml(item.batchNo)}` : ""}
                   ${item.slNo ? ` &middot; SL: ${escapeHtml(item.slNo)}` : ""}
                   ${item.expiryDate ? ` &middot; Exp: ${formatDate(item.expiryDate)}` : ""}
                 </div>`
              : ""
          }
        </td>
        <td class="col-hsn">${item.hsn ? escapeHtml(item.hsn) : "—"}</td>
        <td class="num col-qty">${qtyDisplay}</td>
        <td class="num col-rate">${formatCurrency(item.rate)}</td>
        <td class="num col-taxable">${formatCurrency(item.amount)}</td>
        <td class="num col-gstp">${formatNumber(item.gstPercent)}%</td>
        <td class="num col-gsta">${formatCurrency(item.gstAmount)}</td>
        <td class="num col-total strong">${formatCurrency(lineTotal)}</td>
      </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(invoice.invoiceNumber)} · ${docTitle}</title>
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: "Helvetica Neue", Arial, sans-serif;
        color: #0f172a;
        font-size: 11.5px;
        line-height: 1.45;
        background: #ffffff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      /* ── Layout ─────────────────────────────────────────────── */
      .sheet {
        padding: 16mm 14mm;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 20px;
        padding-bottom: 14px;
        border-bottom: 2px solid #0f172a;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 14px;
        min-width: 0;
      }
      .logo {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        object-fit: contain;
        flex: none;
      }
      .logo-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #1e3a8a, #2563eb);
        color: #fff;
        font-weight: 700;
        font-size: 20px;
        letter-spacing: 0.08em;
      }
      .brand-text .company-name {
        font-size: 18px;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: 0.01em;
      }
      .brand-text .company-sub {
        margin-top: 2px;
        color: #475569;
        font-size: 11px;
      }

      .doc-meta {
        text-align: right;
        flex: none;
      }
      .doc-title {
        font-size: 18px;
        font-weight: 800;
        letter-spacing: 0.18em;
        color: #1e3a8a;
      }
      .doc-sub {
        margin-top: 4px;
        color: #475569;
        font-size: 11px;
      }
      .status-chip {
        display: inline-block;
        margin-top: 6px;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .status-chip.paid { background: #dcfce7; color: #166534; }
      .status-chip.partial { background: #fef9c3; color: #854d0e; }
      .status-chip.unpaid { background: #fee2e2; color: #991b1b; }

      /* ── Meta grid ──────────────────────────────────────────── */
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
        margin-top: 14px;
        padding: 12px 14px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
      }
      .meta-item .meta-label {
        color: #64748b;
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .meta-item .meta-value {
        margin-top: 2px;
        font-weight: 600;
      }

      /* ── Address panels ─────────────────────────────────────── */
      .addr-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        margin-top: 14px;
      }
      .addr-panel {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 12px 14px;
        background: #fff;
      }
      .addr-label {
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #1e3a8a;
        font-weight: 700;
      }
      .addr-name {
        margin-top: 6px;
        font-size: 13px;
        font-weight: 700;
        color: #0f172a;
      }
      .addr-sub {
        margin-top: 4px;
        color: #475569;
        font-size: 11px;
        line-height: 1.5;
      }

      /* ── Items table ────────────────────────────────────────── */
      table.items {
        width: 100%;
        border-collapse: collapse;
        margin-top: 14px;
      }
      .items thead th {
        background: #1e3a8a;
        color: #fff;
        text-align: left;
        padding: 8px 8px;
        font-size: 10.5px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .items thead th.num { text-align: right; }
      .items tbody td {
        padding: 8px 8px;
        border-bottom: 1px solid #e2e8f0;
        vertical-align: top;
      }
      .items tbody tr:nth-child(even) td { background: #f8fafc; }
      .items .num { text-align: right; white-space: nowrap; }
      .items .strong { font-weight: 700; }
      .items .cell-main { font-weight: 600; color: #0f172a; }
      .items .cell-sub {
        margin-top: 2px;
        color: #64748b;
        font-size: 10.5px;
      }
      .col-sn { width: 28px; color: #64748b; }
      .col-hsn { width: 64px; color: #475569; }
      .col-qty, .col-gstp { width: 64px; }
      .col-rate, .col-taxable, .col-gsta, .col-total { width: 92px; }

      /* Keep table header repeating across pages */
      table.items thead { display: table-header-group; }
      table.items tfoot { display: table-row-group; }
      table.items tr { page-break-inside: avoid; }

      /* ── Totals block ───────────────────────────────────────── */
      .totals-wrap {
        display: grid;
        grid-template-columns: 1fr 300px;
        gap: 16px;
        margin-top: 16px;
      }
      .amount-words {
        border: 1px dashed #cbd5e1;
        border-radius: 10px;
        padding: 10px 12px;
        background: #f8fafc;
        color: #0f172a;
        font-size: 11.5px;
      }
      .amount-words .aw-label {
        color: #64748b;
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .totals {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        overflow: hidden;
      }
      .totals .row {
        display: flex;
        justify-content: space-between;
        padding: 6px 12px;
        font-size: 11.5px;
        border-bottom: 1px solid #e2e8f0;
      }
      .totals .row:last-child { border-bottom: 0; }
      .totals .row.muted { color: #475569; background: #f8fafc; }
      .totals .row.grand {
        background: #1e3a8a;
        color: #fff;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.03em;
      }
      .totals .row.balance {
        background: #fff7ed;
        color: #9a3412;
        font-weight: 700;
      }

      /* ── Footer ─────────────────────────────────────────────── */
      .footer-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 16px;
        margin-top: 18px;
      }
      .notes {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 10px 12px;
        background: #fff;
        font-size: 11px;
        color: #0f172a;
      }
      .notes .notes-label {
        color: #64748b;
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .signature {
        text-align: center;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 14px 10px 10px;
        background: #fff;
      }
      .signature .sig-space {
        height: 52px;
      }
      .signature .sig-label {
        margin-top: 6px;
        font-size: 11px;
        color: #0f172a;
        font-weight: 700;
      }
      .signature .sig-sub {
        color: #64748b;
        font-size: 10px;
      }

      .small-print {
        margin-top: 12px;
        text-align: center;
        color: #94a3b8;
        font-size: 9.5px;
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <!-- Header -->
      <header class="header">
        <div class="brand">
          ${logoBlock}
          <div class="brand-text">
            <div class="company-name">${escapeHtml(company.name)}</div>
            ${companyAddress ? `<div class="company-sub">${escapeHtml(companyAddress)}</div>` : ""}
            <div class="company-sub">
              ${company.gstin ? `GSTIN: ${escapeHtml(company.gstin)}` : ""}
              ${company.pan ? `${company.gstin ? " &middot; " : ""}PAN: ${escapeHtml(company.pan)}` : ""}
            </div>
            <div class="company-sub">
              ${company.phone ? `Ph: ${escapeHtml(company.phone)}` : ""}
              ${company.email ? `${company.phone ? " &middot; " : ""}${escapeHtml(company.email)}` : ""}
            </div>
          </div>
        </div>
        <div class="doc-meta">
          <div class="doc-title">${docTitle}</div>
          <div class="doc-sub">No. <strong>${escapeHtml(invoice.invoiceNumber)}</strong></div>
          <div class="doc-sub">Date: ${formatDate(invoice.date)}</div>
          ${invoice.dueDate ? `<div class="doc-sub">Due: ${formatDate(invoice.dueDate)}</div>` : ""}
          <span class="status-chip ${statusTone}">${escapeHtml(invoice.status)}</span>
        </div>
      </header>

      <!-- Meta strip -->
      <section class="meta-grid">
        <div class="meta-item">
          <div class="meta-label">Invoice #</div>
          <div class="meta-value">${escapeHtml(invoice.invoiceNumber)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Invoice Date</div>
          <div class="meta-value">${formatDate(invoice.date)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Financial Year</div>
          <div class="meta-value">${escapeHtml(invoice.financialYear ?? "—")}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Facility</div>
          <div class="meta-value">${escapeHtml(facility?.name ?? "—")}</div>
        </div>
      </section>

      <!-- Addresses -->
      <section class="addr-grid">
        <div class="addr-panel">
          <div class="addr-label">${companyLabel}</div>
          <div class="addr-name">${escapeHtml(company.name)}</div>
          ${companyAddress ? `<div class="addr-sub">${escapeHtml(companyAddress)}</div>` : ""}
          ${company.gstin ? `<div class="addr-sub">GSTIN: ${escapeHtml(company.gstin)}</div>` : ""}
          ${company.phone ? `<div class="addr-sub">Phone: ${escapeHtml(company.phone)}</div>` : ""}
          ${company.email ? `<div class="addr-sub">Email: ${escapeHtml(company.email)}</div>` : ""}
        </div>
        <div class="addr-panel">
          <div class="addr-label">${partyLabel}</div>
          <div class="addr-name">${escapeHtml(party.name)}</div>
          ${partyAddress ? `<div class="addr-sub">${escapeHtml(partyAddress)}</div>` : ""}
          ${party.gstin ? `<div class="addr-sub">GSTIN: ${escapeHtml(party.gstin)}</div>` : ""}
          ${party.phone ? `<div class="addr-sub">Phone: ${escapeHtml(party.phone)}</div>` : ""}
          ${party.email ? `<div class="addr-sub">Email: ${escapeHtml(party.email)}</div>` : ""}
        </div>
      </section>

      <!-- Items -->
      <table class="items">
        <thead>
          <tr>
            <th class="col-sn">#</th>
            <th class="col-desc">Description</th>
            <th class="col-hsn">HSN</th>
            <th class="num col-qty">Qty</th>
            <th class="num col-rate">Rate</th>
            <th class="num col-taxable">Taxable</th>
            <th class="num col-gstp">GST %</th>
            <th class="num col-gsta">GST Amt</th>
            <th class="num col-total">Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- Totals -->
      <section class="totals-wrap">
        <div class="amount-words">
          <div class="aw-label">Amount in Words</div>
          <div>${escapeHtml(amountInWords(invoice.totalAmount))}</div>
        </div>
        <div class="totals">
          <div class="row muted"><span>Subtotal (Taxable)</span><span>${formatCurrency(invoice.subtotal)}</span></div>
          ${
            tax.sameState
              ? `<div class="row muted"><span>CGST</span><span>${formatCurrency(tax.cgst)}</span></div>
                 <div class="row muted"><span>SGST</span><span>${formatCurrency(tax.sgst)}</span></div>`
              : `<div class="row muted"><span>IGST</span><span>${formatCurrency(tax.igst)}</span></div>`
          }
          ${
            invoice.discountAmount && invoice.discountAmount > 0
              ? `<div class="row muted"><span>Discount${
                  invoice.discountPercent ? ` (${formatNumber(invoice.discountPercent)}%)` : ""
                }</span><span>− ${formatCurrency(invoice.discountAmount)}</span></div>`
              : ""
          }
          <div class="row grand"><span>Grand Total</span><span>${formatCurrency(invoice.totalAmount)}</span></div>
          <div class="row"><span>Paid</span><span>${formatCurrency(invoice.paidAmount)}</span></div>
          ${
            balance > 0
              ? `<div class="row balance"><span>Balance Due</span><span>${formatCurrency(balance)}</span></div>`
              : ""
          }
        </div>
      </section>

      <!-- Footer -->
      <section class="footer-grid">
        <div class="notes">
          <div class="notes-label">Notes & Terms</div>
          ${
            invoice.notes
              ? `<div>${escapeHtml(invoice.notes)}</div>`
              : `<div style="color:#94a3b8">—</div>`
          }
          <div style="margin-top:8px;color:#64748b;font-size:10.5px">
            Goods once sold will not be taken back. Interest @ 18% p.a. will be
            charged on bills outstanding beyond due date. Subject to ${
              company.city ? escapeHtml(company.city) : "local"
            } jurisdiction.
          </div>
        </div>
        <div class="signature">
          <div class="sig-space"></div>
          <div class="sig-label">For ${escapeHtml(company.name)}</div>
          <div class="sig-sub">Authorised Signatory</div>
        </div>
      </section>

      <div class="small-print">
        This is a computer-generated invoice and does not require a physical signature.
      </div>
    </main>
  </body>
</html>`;
}
