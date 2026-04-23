interface ExportCompany {
  name: string;
  gstin?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}

interface ExportVendor {
  name: string;
  gstin?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}

interface ExportFacility {
  name: string;
  address?: string | null;
}

interface ExportItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  gstPercent: number;
  gstAmount: number;
  batchNo?: string | null;
  slNo?: string | null;
  expiryDate?: Date | string | null;
}

interface ExportInvoice {
  invoiceNumber: string;
  date: Date | string;
  dueDate?: Date | string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  notes?: string | null;
  vendor?: ExportVendor | null;
  facility?: ExportFacility | null;
  items: ExportItem[];
}

interface PurchaseInvoiceExportData {
  company: ExportCompany;
  invoice: ExportInvoice;
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
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
  });
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

function formatAddress(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(", ");
}

export function getPurchaseInvoiceExportFilename(invoiceNumber: string) {
  const safe = invoiceNumber
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${safe || "purchase-invoice"}.html`;
}

export function renderPurchaseInvoiceHtml({
  company,
  invoice,
}: PurchaseInvoiceExportData) {
  const companyAddress = formatAddress([
    company.address,
    company.city,
    company.state,
    company.pincode,
  ]);
  const vendorAddress = invoice.vendor
    ? formatAddress([
        invoice.vendor.address,
        invoice.vendor.city,
        invoice.vendor.state,
        invoice.vendor.pincode,
      ])
    : "";
  const balanceAmount = Math.max(invoice.totalAmount - invoice.paidAmount, 0);

  const rows = invoice.items
    .map((item, index) => {
      const lineTotal = item.amount + item.gstAmount;
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.description)}</td>
          <td>${item.batchNo ? escapeHtml(item.batchNo) : "-"}</td>
          <td>${item.slNo ? escapeHtml(item.slNo) : "-"}</td>
          <td>${formatDate(item.expiryDate)}</td>
          <td class="num">${item.quantity}</td>
          <td class="num">${formatCurrency(item.rate)}</td>
          <td class="num">${item.gstPercent}%</td>
          <td class="num">${formatCurrency(item.gstAmount)}</td>
          <td class="num strong">${formatCurrency(lineTotal)}</td>
        </tr>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(invoice.invoiceNumber)} - Purchase Invoice</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #172554;
        --muted: #64748b;
        --line: #dbe4f0;
        --panel: #f8fbff;
        --brand: #1e3a8a;
        --accent: #dbeafe;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        color: #0f172a;
        background: #eef4fb;
        padding: 24px;
      }
      .sheet {
        max-width: 1024px;
        margin: 0 auto;
        background: #fff;
        border: 1px solid var(--line);
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
      }
      .hero {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        padding: 28px 32px;
        background: linear-gradient(135deg, #1e3a8a, #2563eb);
        color: #fff;
      }
      .hero h1 {
        margin: 10px 0 0;
        font-size: 28px;
      }
      .eyebrow {
        letter-spacing: 0.24em;
        text-transform: uppercase;
        font-size: 12px;
        opacity: 0.8;
        font-weight: 700;
      }
      .hero-card {
        min-width: 250px;
        padding: 18px 20px;
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 18px;
        background: rgba(255,255,255,0.08);
      }
      .hero-card .amount {
        margin-top: 8px;
        font-size: 26px;
        font-weight: 700;
      }
      .content {
        padding: 28px 32px 32px;
      }
      .grid {
        display: grid;
        gap: 20px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .panel {
        border: 1px solid var(--line);
        border-radius: 18px;
        background: var(--panel);
        padding: 18px 20px;
      }
      .panel h2 {
        margin: 0 0 12px;
        color: var(--ink);
        font-size: 14px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .meta {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .meta-item {
        padding: 12px 14px;
        border-radius: 14px;
        background: #fff;
        border: 1px solid var(--line);
      }
      .label {
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .value {
        margin-top: 6px;
        font-size: 15px;
        font-weight: 600;
      }
      .subtle {
        margin-top: 6px;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.5;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 24px;
      }
      th, td {
        padding: 12px 10px;
        border-bottom: 1px solid var(--line);
        text-align: left;
        vertical-align: top;
        font-size: 13px;
      }
      th {
        background: #eff6ff;
        color: var(--ink);
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .num {
        text-align: right;
        white-space: nowrap;
      }
      .strong {
        font-weight: 700;
      }
      .summary {
        margin-top: 24px;
        margin-left: auto;
        width: min(100%, 360px);
        border: 1px solid var(--line);
        border-radius: 18px;
        background: var(--panel);
        padding: 18px 20px;
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 0;
        color: var(--ink);
      }
      .summary-row.total {
        margin-top: 6px;
        padding-top: 14px;
        border-top: 1px solid var(--line);
        font-size: 18px;
        font-weight: 700;
      }
      .summary-row.balance {
        color: #b91c1c;
        font-weight: 600;
      }
      .notes {
        margin-top: 20px;
        padding: 16px 18px;
        border-radius: 16px;
        background: #fff7ed;
        border: 1px solid #fed7aa;
        color: #9a3412;
        line-height: 1.6;
      }
      @media print {
        body {
          background: #fff;
          padding: 0;
        }
        .sheet {
          max-width: none;
          border: 0;
          border-radius: 0;
          box-shadow: none;
        }
      }
      @media (max-width: 768px) {
        body { padding: 12px; }
        .hero, .content { padding: 20px; }
        .hero { flex-direction: column; }
        .grid, .meta { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <section class="hero">
        <div>
          <div class="eyebrow">Purchase Invoice</div>
          <h1>${escapeHtml(invoice.invoiceNumber)}</h1>
          <div class="subtle">${escapeHtml(company.name)}</div>
        </div>
        <div class="hero-card">
          <div class="label" style="color: rgba(255,255,255,0.75)">Invoice Total</div>
          <div class="amount">${formatCurrency(invoice.totalAmount)}</div>
          <div class="subtle" style="color: rgba(255,255,255,0.75)">
            Status: ${escapeHtml(invoice.status)}
          </div>
        </div>
      </section>

      <section class="content">
        <div class="grid">
          <section class="panel">
            <h2>From</h2>
            <div class="value">${escapeHtml(company.name)}</div>
            ${
              company.gstin
                ? `<div class="subtle">GSTIN: ${escapeHtml(company.gstin)}</div>`
                : ""
            }
            ${
              companyAddress
                ? `<div class="subtle">${escapeHtml(companyAddress)}</div>`
                : ""
            }
            ${
              company.phone
                ? `<div class="subtle">Phone: ${escapeHtml(company.phone)}</div>`
                : ""
            }
            ${
              company.email
                ? `<div class="subtle">Email: ${escapeHtml(company.email)}</div>`
                : ""
            }
          </section>

          <section class="panel">
            <h2>Vendor</h2>
            <div class="value">${escapeHtml(invoice.vendor?.name ?? "-")}</div>
            ${
              invoice.vendor?.gstin
                ? `<div class="subtle">GSTIN: ${escapeHtml(invoice.vendor.gstin)}</div>`
                : ""
            }
            ${
              vendorAddress
                ? `<div class="subtle">${escapeHtml(vendorAddress)}</div>`
                : ""
            }
            ${
              invoice.vendor?.phone
                ? `<div class="subtle">Phone: ${escapeHtml(invoice.vendor.phone)}</div>`
                : ""
            }
            ${
              invoice.vendor?.email
                ? `<div class="subtle">Email: ${escapeHtml(invoice.vendor.email)}</div>`
                : ""
            }
          </section>
        </div>

        <section class="panel" style="margin-top: 20px">
          <h2>Invoice Meta</h2>
          <div class="meta">
            <div class="meta-item">
              <div class="label">Invoice Date</div>
              <div class="value">${formatDate(invoice.date)}</div>
            </div>
            <div class="meta-item">
              <div class="label">Due Date</div>
              <div class="value">${formatDate(invoice.dueDate)}</div>
            </div>
            <div class="meta-item">
              <div class="label">Facility</div>
              <div class="value">${escapeHtml(invoice.facility?.name ?? "-")}</div>
              ${
                invoice.facility?.address
                  ? `<div class="subtle">${escapeHtml(invoice.facility.address)}</div>`
                  : ""
              }
            </div>
            <div class="meta-item">
              <div class="label">Paid Amount</div>
              <div class="value">${formatCurrency(invoice.paidAmount)}</div>
            </div>
          </div>
        </section>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Description</th>
              <th>Batch</th>
              <th>SL No</th>
              <th>Expiry</th>
              <th class="num">Qty</th>
              <th class="num">Rate</th>
              <th class="num">GST %</th>
              <th class="num">GST Amt</th>
              <th class="num">Line Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <section class="summary">
          <div class="summary-row">
            <span>Subtotal</span>
            <strong>${formatCurrency(invoice.subtotal)}</strong>
          </div>
          <div class="summary-row">
            <span>GST</span>
            <strong>${formatCurrency(invoice.taxAmount)}</strong>
          </div>
          <div class="summary-row">
            <span>Paid</span>
            <strong>${formatCurrency(invoice.paidAmount)}</strong>
          </div>
          <div class="summary-row total">
            <span>Total</span>
            <span>${formatCurrency(invoice.totalAmount)}</span>
          </div>
          <div class="summary-row balance">
            <span>Balance Due</span>
            <span>${formatCurrency(balanceAmount)}</span>
          </div>
        </section>

        ${
          invoice.notes
            ? `<section class="notes"><strong>Notes:</strong> ${escapeHtml(invoice.notes)}</section>`
            : ""
        }
      </section>
    </main>
  </body>
</html>`;
}
