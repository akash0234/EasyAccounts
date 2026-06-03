/**
 * Shared invoice HTML template used for both SALES and PURCHASE PDFs.
 */

export type InvoiceTemplateType = "SALES" | "PURCHASE";

type PaymentMethod = "CASH" | "BANK" | "UPI" | "CHEQUE";

export interface TemplatePaymentSetting {
  id: string;
  type: PaymentMethod;
  label: string;
  isDefault: boolean;
  upiId?: string | null;
  upiPayeeName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  chequePayeeName?: string | null;
  instructions?: string | null;
}

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
  logoUrl?: string | null;
  defaultPaymentSetting?: TemplatePaymentSetting | null;
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

export interface TemplateAdditionalCharge {
  name: string;
  hsnSac?: string | null;
  amount: number;
  discountAmount?: number | null;
  gstPercent: number;
  gstAmount: number;
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
  additionalCharges?: TemplateAdditionalCharge[];
  financialYear?: string | null;
  billingAddressSnapshot?: string | null;
  shippingAddressSnapshot?: string | null;
}

export interface InvoiceTemplateData {
  type: InvoiceTemplateType;
  company: TemplateCompany;
  party: TemplateParty;
  facility?: TemplateFacility | null;
  invoice: TemplateInvoice;
}

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
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function joinAddress(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "EA";
}

function amountInWords(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "Zero Rupees Only";
  const isNegative = n < 0;
  const absolute = Math.abs(n);
  const rupees = Math.floor(absolute);
  const paise = Math.round((absolute - rupees) * 100);

  const words = (num: number): string => {
    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];
    const twoDigits = (value: number) =>
      value < 20
        ? ones[value]
        : `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${ones[value % 10]}` : ""}`;
    const threeDigits = (value: number) =>
      value >= 100
        ? `${ones[Math.floor(value / 100)]} Hundred${value % 100 ? ` ${twoDigits(value % 100)}` : ""}`
        : twoDigits(value);

    if (num === 0) return "Zero";

    let result = "";
    const crore = Math.floor(num / 10000000);
    if (crore > 0) {
      result += `${threeDigits(crore)} Crore `;
      num %= 10000000;
    }

    const lakh = Math.floor(num / 100000);
    if (lakh > 0) {
      result += `${threeDigits(lakh)} Lakh `;
      num %= 100000;
    }

    const thousand = Math.floor(num / 1000);
    if (thousand > 0) {
      result += `${threeDigits(thousand)} Thousand `;
      num %= 1000;
    }

    if (num > 0) result += threeDigits(num);
    return result.replace(/\s+/g, " ").trim();
  };

  let result = `${words(rupees)} Rupees`;
  if (paise > 0) result += ` and ${words(paise)} Paise`;
  result += " Only";
  return isNegative ? `Minus ${result}` : result;
}

function splitTax(
  companyState: string | null | undefined,
  partyState: string | null | undefined,
  taxAmount: number
) {
  const sameState =
    !!companyState &&
    !!partyState &&
    companyState.trim().toLowerCase() === partyState.trim().toLowerCase();

  if (sameState) {
    const half = taxAmount / 2;
    return { cgst: half, sgst: half, igst: 0, sameState: true };
  }

  return { cgst: 0, sgst: 0, igst: taxAmount, sameState: false };
}

function buildPaymentSettingUpiUri(
  company: TemplateCompany,
  paymentSetting: TemplatePaymentSetting,
  amount: number
) {
  if (!paymentSetting.upiId) return null;

  const params = new URLSearchParams({
    pa: paymentSetting.upiId,
    pn: paymentSetting.upiPayeeName || company.name,
    cu: "INR",
  });

  if (amount > 0) {
    params.set("am", amount.toFixed(2));
  }

  return `upi://pay?${params.toString()}`;
}

function buildPaymentSettingUpiQrUrl(
  company: TemplateCompany,
  paymentSetting: TemplatePaymentSetting,
  amount: number
) {
  const uri = buildPaymentSettingUpiUri(company, paymentSetting, amount);
  if (!uri) return null;
  return `https://quickchart.io/qr?text=${encodeURIComponent(uri)}&size=180`;
}

function renderPaymentPanel(
  company: TemplateCompany,
  balance: number,
  isSales: boolean
) {
  if (!isSales || !company.defaultPaymentSetting) {
    return "";
  }

  const amountForQr = balance > 0 ? balance : 0;
  const defaultPaymentSetting = company.defaultPaymentSetting;
  const instructions = defaultPaymentSetting?.instructions?.trim();

  let details = "";
  if (defaultPaymentSetting?.type === "UPI") {
    const qrUrl = buildPaymentSettingUpiQrUrl(company, defaultPaymentSetting, amountForQr);
    details = `
      <div class="pay-title">${escapeHtml(defaultPaymentSetting.label)}</div>
      <div class="pay-line"><span>UPI ID</span><strong>${escapeHtml(defaultPaymentSetting.upiId || "-")}</strong></div>
      <div class="pay-line"><span>Payee</span><strong>${escapeHtml(defaultPaymentSetting.upiPayeeName || company.name)}</strong></div>
      ${
        qrUrl
          ? `<div class="qr-wrap">
               <img class="qr-code" src="${escapeHtml(qrUrl)}" alt="UPI QR Code" />
               <div class="qr-note">Scan to pay${amountForQr > 0 ? ` ${escapeHtml(formatCurrency(amountForQr))}` : ""}</div>
             </div>`
          : ""
      }
    `;
  } else if (defaultPaymentSetting?.type === "BANK") {
    details = `
      <div class="pay-title">${escapeHtml(defaultPaymentSetting.label)}</div>
      <div class="pay-line"><span>Account Name</span><strong>${escapeHtml(defaultPaymentSetting.bankAccountName || company.name)}</strong></div>
      <div class="pay-line"><span>Account No.</span><strong>${escapeHtml(defaultPaymentSetting.bankAccountNumber || "-")}</strong></div>
      <div class="pay-line"><span>IFSC</span><strong>${escapeHtml(defaultPaymentSetting.bankIfsc || "-")}</strong></div>
      <div class="pay-line"><span>Bank</span><strong>${escapeHtml(defaultPaymentSetting.bankName || "-")}</strong></div>
      <div class="pay-line"><span>Branch</span><strong>${escapeHtml(defaultPaymentSetting.bankBranch || "-")}</strong></div>
    `;
  } else if (defaultPaymentSetting?.type === "CHEQUE") {
    details = `
      <div class="pay-title">${escapeHtml(defaultPaymentSetting.label)}</div>
      <div class="pay-line"><span>Cheque in favour of</span><strong>${escapeHtml(defaultPaymentSetting.chequePayeeName || company.name)}</strong></div>
    `;
  } else if (defaultPaymentSetting?.type === "CASH") {
    details = `
      <div class="pay-title">${escapeHtml(defaultPaymentSetting.label)}</div>
      <div class="pay-line"><span>Payment Mode</span><strong>Cash</strong></div>
    `;
  }

  return `
    <div class="payment-panel">
      ${details}
      ${
        instructions
          ? `<div class="pay-instructions">
               <div class="pay-subtitle">Instructions</div>
               <div>${escapeHtml(instructions)}</div>
             </div>`
          : ""
      }
    </div>
  `;
}

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

export function renderInvoiceHtml(data: InvoiceTemplateData): string {
  const { type, company, party, facility, invoice } = data;
  const isSales = type === "SALES";
  const docTitle = isSales ? "TAX INVOICE" : "PURCHASE INVOICE";
  const partyLabel = isSales ? "Bill To" : "Bill From";
  const companyLabel = isSales ? "Sold By" : "Purchased By";

  const companyAddress = joinAddress([
    company.address,
    company.city,
    company.state,
    company.pincode,
  ]);
  const partyAddress = joinAddress([
    party.billingAddress ?? party.address,
    party.city,
    party.state,
    party.pincode,
  ]);
  const billSnapshot = invoice.billingAddressSnapshot?.trim() || null;
  const shipSnapshot = invoice.shippingAddressSnapshot?.trim() || null;
  const billToText = billSnapshot ?? partyAddress;
  const showShipPanel = !!shipSnapshot && shipSnapshot !== (billSnapshot ?? "");
  const tax = splitTax(company.state, party.state, invoice.taxAmount);
  const balance = Math.max(invoice.totalAmount - invoice.paidAmount, 0);
  const supplyType = tax.sameState ? "Intra-State" : "Inter-State";
  const placeOfSupply = party.state?.trim() || "-";
  const paymentPanel = renderPaymentPanel(company, balance, isSales);

  const logoBlock = company.logoUrl
    ? `<img class="logo" src="${escapeHtml(company.logoUrl)}" alt="${escapeHtml(company.name)} logo" />`
    : `<div class="logo logo-placeholder" aria-label="Company logo placeholder">${escapeHtml(initials(company.name))}</div>`;

  const statusTone =
    invoice.status === "PAID"
      ? "paid"
      : invoice.status === "PARTIAL"
        ? "partial"
        : "unpaid";

  const rowsHtml = invoice.items
    .map((item, index) => {
      const lineTotal = item.amount + item.gstAmount;
      const quantityDisplay = `${formatNumber(item.quantity)}${item.unit ? ` ${escapeHtml(item.unit)}` : ""}`;
      const detailBits = [
        item.batchNo ? `Batch: ${escapeHtml(item.batchNo)}` : "",
        item.slNo ? `SL: ${escapeHtml(item.slNo)}` : "",
        item.expiryDate ? `Exp: ${formatDate(item.expiryDate)}` : "",
      ].filter(Boolean);

      return `
        <tr>
          <td class="col-sn">${index + 1}</td>
          <td class="col-desc">
            <div class="cell-main">${escapeHtml(item.description)}</div>
            ${detailBits.length ? `<div class="cell-sub">${detailBits.join(" | ")}</div>` : ""}
          </td>
          <td class="col-hsn">${item.hsn ? escapeHtml(item.hsn) : "-"}</td>
          <td class="num col-qty">${quantityDisplay}</td>
          <td class="num col-rate">${formatCurrency(item.rate)}</td>
          <td class="num col-taxable">${formatCurrency(item.amount)}</td>
          <td class="num col-gstp">${formatNumber(item.gstPercent)}%</td>
          <td class="num col-gsta">${formatCurrency(item.gstAmount)}</td>
          <td class="num col-total strong">${formatCurrency(lineTotal)}</td>
        </tr>
      `;
    })
    .join("");

  const charges = invoice.additionalCharges ?? [];
  const chargesHtml = charges.length
    ? `
      <section class="other-charges">
        <div class="section-title">Other Charges</div>
        <table class="items compact">
          <thead>
            <tr>
              <th class="col-sn">#</th>
              <th>Particulars</th>
              <th class="col-hsn">HSN/SAC</th>
              <th class="num">Amount</th>
              <th class="num">Discount</th>
              <th class="num">Taxable</th>
              <th class="num col-gstp">GST %</th>
              <th class="num col-gsta">GST Amt</th>
              <th class="num col-total">Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${charges
              .map((charge, index) => {
                const discount = charge.discountAmount ?? 0;
                const taxable = Math.max(charge.amount - discount, 0);
                const lineTotal = taxable + charge.gstAmount;
                return `
                  <tr>
                    <td class="col-sn">${index + 1}</td>
                    <td>${escapeHtml(charge.name)}</td>
                    <td class="col-hsn">${charge.hsnSac ? escapeHtml(charge.hsnSac) : "-"}</td>
                    <td class="num">${formatCurrency(charge.amount)}</td>
                    <td class="num">${discount > 0 ? formatCurrency(discount) : "-"}</td>
                    <td class="num">${formatCurrency(taxable)}</td>
                    <td class="num">${formatNumber(charge.gstPercent)}%</td>
                    <td class="num">${formatCurrency(charge.gstAmount)}</td>
                    <td class="num strong">${formatCurrency(lineTotal)}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </section>
    `
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(invoice.invoiceNumber)} | ${docTitle}</title>
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: "Helvetica Neue", Arial, sans-serif;
        color: #0f172a;
        font-size: 11px;
        line-height: 1.45;
        background: #fff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .sheet {
        padding: 14mm 12mm;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 18px;
        border: 1.5px solid #1e3a8a;
        border-radius: 12px;
        padding: 14px 16px;
      }
      .brand {
        display: flex;
        gap: 12px;
        min-width: 0;
      }
      .logo {
        width: 52px;
        height: 52px;
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
        font-size: 18px;
        font-weight: 800;
      }
      .company-name {
        font-size: 18px;
        font-weight: 800;
      }
      .company-sub {
        margin-top: 3px;
        color: #475569;
        font-size: 10.5px;
      }
      .doc-meta {
        min-width: 220px;
        text-align: right;
      }
      .doc-title {
        font-size: 18px;
        letter-spacing: 0.16em;
        color: #1e3a8a;
        font-weight: 800;
      }
      .doc-sub {
        margin-top: 3px;
        color: #334155;
      }
      .status-chip {
        display: inline-block;
        margin-top: 8px;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .status-chip.paid { background: #dcfce7; color: #166534; }
      .status-chip.partial { background: #fef3c7; color: #92400e; }
      .status-chip.unpaid { background: #fee2e2; color: #991b1b; }

      .meta-grid {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 8px;
        margin-top: 12px;
      }
      .meta-item {
        border: 1px solid #dbeafe;
        background: #f8fbff;
        border-radius: 10px;
        padding: 9px 10px;
      }
      .meta-label {
        color: #64748b;
        font-size: 9px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .meta-value {
        margin-top: 3px;
        font-size: 11px;
        font-weight: 700;
      }

      .addr-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 12px;
      }
      .addr-panel {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 12px;
      }
      .addr-label {
        font-size: 9px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #1e3a8a;
        font-weight: 800;
      }
      .addr-name {
        margin-top: 6px;
        font-size: 13px;
        font-weight: 700;
      }
      .addr-sub {
        margin-top: 4px;
        color: #475569;
        font-size: 10.5px;
      }

      .section-title {
        font-size: 10px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #475569;
        font-weight: 800;
        margin-bottom: 6px;
      }

      table.items {
        width: 100%;
        border-collapse: collapse;
        margin-top: 12px;
      }
      .items thead th {
        background: #1e3a8a;
        color: #fff;
        text-align: left;
        padding: 8px;
        font-size: 9.8px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .items thead th.num { text-align: right; }
      .items tbody td {
        border-bottom: 1px solid #e2e8f0;
        padding: 8px;
        vertical-align: top;
      }
      .items tbody tr:nth-child(even) td {
        background: #f8fafc;
      }
      .items .num {
        text-align: right;
        white-space: nowrap;
      }
      .items .strong {
        font-weight: 700;
      }
      .cell-main {
        font-weight: 700;
      }
      .cell-sub {
        margin-top: 2px;
        font-size: 10px;
        color: #64748b;
      }
      .col-sn { width: 28px; color: #64748b; }
      .col-hsn { width: 72px; color: #475569; }
      .col-qty, .col-gstp { width: 72px; }
      .col-rate, .col-taxable, .col-gsta, .col-total { width: 92px; }
      table.items thead { display: table-header-group; }
      table.items tr { page-break-inside: avoid; }

      .other-charges {
        margin-top: 12px;
      }
      .compact thead th {
        background: #eff6ff;
        color: #0f172a;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: 16px;
        margin-top: 14px;
        align-items: start;
      }
      .summary-stack {
        display: grid;
        gap: 12px;
      }
      .box {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 12px;
        background: #fff;
      }
      .amount-words {
        background: #f8fafc;
        border-style: dashed;
      }
      .totals {
        overflow: hidden;
        padding: 0;
      }
      .totals .row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 7px 12px;
        border-bottom: 1px solid #e2e8f0;
      }
      .totals .row:last-child {
        border-bottom: 0;
      }
      .totals .row.muted {
        background: #f8fafc;
        color: #334155;
      }
      .totals .row.grand {
        background: #1e3a8a;
        color: #fff;
        font-size: 12px;
        font-weight: 800;
      }
      .totals .row.balance {
        background: #fff7ed;
        color: #9a3412;
        font-weight: 700;
      }

      .footer-grid {
        display: grid;
        grid-template-columns: ${paymentPanel ? "1.2fr 1fr 0.9fr" : "1.7fr 1fr"};
        gap: 16px;
        margin-top: 16px;
        align-items: start;
      }
      .notes {
        font-size: 10.5px;
      }
      .muted {
        color: #64748b;
      }
      .payment-panel {
        border: 1px solid #bfdbfe;
        border-radius: 10px;
        padding: 12px;
        background: #f8fbff;
      }
      .pay-title {
        font-size: 11px;
        font-weight: 800;
        color: #1e3a8a;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .pay-line {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-top: 5px;
        font-size: 10.5px;
      }
      .pay-line span {
        color: #475569;
      }
      .pay-line strong {
        text-align: right;
      }
      .pay-subtitle {
        margin-top: 10px;
        margin-bottom: 4px;
        font-size: 9px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #64748b;
        font-weight: 800;
      }
      .pay-instructions {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px dashed #cbd5e1;
        font-size: 10px;
      }
      .qr-wrap {
        margin-top: 10px;
        text-align: center;
      }
      .qr-code {
        width: 122px;
        height: 122px;
        object-fit: contain;
        border: 1px solid #dbeafe;
        border-radius: 8px;
        background: #fff;
        padding: 6px;
      }
      .qr-note {
        margin-top: 6px;
        font-size: 9.5px;
        color: #475569;
      }
      .signature {
        text-align: center;
      }
      .sig-space {
        height: 64px;
      }
      .sig-label {
        margin-top: 4px;
        font-weight: 700;
      }
      .sig-sub {
        color: #64748b;
        font-size: 10px;
      }
      .small-print {
        margin-top: 10px;
        text-align: center;
        color: #94a3b8;
        font-size: 9px;
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <header class="header">
        <div class="brand">
          ${logoBlock}
          <div>
            <div class="company-name">${escapeHtml(company.name)}</div>
            ${companyAddress ? `<div class="company-sub">${escapeHtml(companyAddress)}</div>` : ""}
            <div class="company-sub">
              ${company.gstin ? `GSTIN: ${escapeHtml(company.gstin)}` : ""}
              ${company.pan ? `${company.gstin ? " | " : ""}PAN: ${escapeHtml(company.pan)}` : ""}
            </div>
            <div class="company-sub">
              ${company.phone ? `Phone: ${escapeHtml(company.phone)}` : ""}
              ${company.email ? `${company.phone ? " | " : ""}${escapeHtml(company.email)}` : ""}
            </div>
          </div>
        </div>
        <div class="doc-meta">
          <div class="doc-title">${docTitle}</div>
          <div class="doc-sub">Invoice No: <strong>${escapeHtml(invoice.invoiceNumber)}</strong></div>
          <div class="doc-sub">Invoice Date: ${formatDate(invoice.date)}</div>
          ${invoice.dueDate ? `<div class="doc-sub">Due Date: ${formatDate(invoice.dueDate)}</div>` : ""}
          <span class="status-chip ${statusTone}">${escapeHtml(invoice.status)}</span>
        </div>
      </header>

      <section class="meta-grid">
        <div class="meta-item">
          <div class="meta-label">Invoice No.</div>
          <div class="meta-value">${escapeHtml(invoice.invoiceNumber)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Invoice Date</div>
          <div class="meta-value">${formatDate(invoice.date)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Due Date</div>
          <div class="meta-value">${escapeHtml(formatDate(invoice.dueDate))}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Financial Year</div>
          <div class="meta-value">${escapeHtml(invoice.financialYear || "-")}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Place of Supply</div>
          <div class="meta-value">${escapeHtml(placeOfSupply)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Supply Type</div>
          <div class="meta-value">${escapeHtml(supplyType)}</div>
        </div>
      </section>

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
          ${billToText ? `<div class="addr-sub">${escapeHtml(billToText)}</div>` : ""}
          ${party.gstin ? `<div class="addr-sub">GSTIN: ${escapeHtml(party.gstin)}</div>` : ""}
          ${party.phone ? `<div class="addr-sub">Phone: ${escapeHtml(party.phone)}</div>` : ""}
          ${party.email ? `<div class="addr-sub">Email: ${escapeHtml(party.email)}</div>` : ""}
        </div>
      </section>

      ${
        showShipPanel
          ? `<section class="addr-grid" style="grid-template-columns: 1fr;">
               <div class="addr-panel">
                 <div class="addr-label">Ship To</div>
                 <div class="addr-name">${escapeHtml(party.name)}</div>
                 <div class="addr-sub">${escapeHtml(shipSnapshot!)}</div>
               </div>
             </section>`
          : ""
      }

      ${
        facility?.address
          ? `<section style="margin-top:12px;">
               <div class="section-title">Dispatch From</div>
               <div class="box" style="padding:10px 12px;">
                 <div style="font-weight:700">${escapeHtml(facility.name)}</div>
                 <div class="muted" style="margin-top:4px;">${escapeHtml(facility.address)}</div>
               </div>
             </section>`
          : ""
      }

      <table class="items">
        <thead>
          <tr>
            <th class="col-sn">#</th>
            <th class="col-desc">Particulars</th>
            <th class="col-hsn">HSN</th>
            <th class="num col-qty">Qty</th>
            <th class="num col-rate">Rate</th>
            <th class="num col-taxable">Taxable</th>
            <th class="num col-gstp">GST %</th>
            <th class="num col-gsta">GST Amt</th>
            <th class="num col-total">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      ${chargesHtml}

      <section class="summary-grid">
        <div class="summary-stack">
          <div class="box amount-words">
            <div class="section-title">Amount in Words</div>
            <div>${escapeHtml(amountInWords(invoice.totalAmount))}</div>
          </div>
          <div class="box notes">
            <div class="section-title">Notes and Terms</div>
            ${
              invoice.notes
                ? `<div>${escapeHtml(invoice.notes)}</div>`
                : `<div class="muted">No additional notes.</div>`
            }
            <div style="margin-top:8px;" class="muted">
              Goods once sold will not be taken back. Interest @ 18% p.a. may be charged on bills outstanding beyond due date.
              Subject to ${escapeHtml(company.city || "local")} jurisdiction.
            </div>
          </div>
        </div>
        <div class="box totals">
          <div class="row muted"><span>Taxable Value</span><span>${formatCurrency(invoice.subtotal)}</span></div>
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
                }</span><span>${formatCurrency(invoice.discountAmount)}</span></div>`
              : ""
          }
          <div class="row grand"><span>Grand Total</span><span>${formatCurrency(invoice.totalAmount)}</span></div>
          <div class="row"><span>Paid Amount</span><span>${formatCurrency(invoice.paidAmount)}</span></div>
          ${
            balance > 0
              ? `<div class="row balance"><span>Balance Due</span><span>${formatCurrency(balance)}</span></div>`
              : ""
          }
        </div>
      </section>

      <section class="footer-grid">
        ${paymentPanel}
        <div class="box notes">
          <div class="section-title">GST Summary</div>
          <div class="pay-line"><span>Seller GSTIN</span><strong>${escapeHtml(company.gstin || "-")}</strong></div>
          <div class="pay-line"><span>Party GSTIN</span><strong>${escapeHtml(party.gstin || "-")}</strong></div>
          <div class="pay-line"><span>Tax Structure</span><strong>${escapeHtml(tax.sameState ? "CGST + SGST" : "IGST")}</strong></div>
          <div class="pay-line"><span>Total Tax</span><strong>${formatCurrency(invoice.taxAmount)}</strong></div>
        </div>
        <div class="box signature">
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

