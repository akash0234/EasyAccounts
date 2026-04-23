import type { Browser, PDFOptions } from "puppeteer-core";
import { getBrowser } from "./browser";

export interface HtmlToPdfOptions {
  /**
   * Reuse an already-open browser (for batch jobs). If omitted, the
   * global singleton is used.
   */
  browser?: Browser;
  /** Override Puppeteer's page.pdf options. Defaults to A4 + sensible margins. */
  pdf?: PDFOptions;
}

const defaultPdfOptions: PDFOptions = {
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: "12mm", right: "12mm", bottom: "14mm", left: "12mm" },
};

/**
 * Render an HTML string to a PDF buffer. The page is always closed after
 * rendering; the browser is left open so subsequent calls reuse it.
 */
export async function htmlToPdfBuffer(
  html: string,
  options: HtmlToPdfOptions = {}
): Promise<Buffer> {
  const browser = options.browser ?? (await getBrowser());
  const page = await browser.newPage();
  try {
    await page.emulateMediaType("print");
    await page.setContent(html, { waitUntil: "networkidle0" });
    const bytes = await page.pdf({ ...defaultPdfOptions, ...options.pdf });
    return Buffer.from(bytes);
  } finally {
    await page.close().catch(() => {});
  }
}
