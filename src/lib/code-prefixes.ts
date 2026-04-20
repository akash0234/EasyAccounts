/**
 * Centralised code-prefix constants used by generateCode().
 * Keep in sync with seed.mjs (which uses raw strings).
 */
export const CODE_PREFIX = {
  CUSTOMER: "CUST",
  VENDOR: "VEND",
  PRODUCT: "PROD",
  FACILITY: "FAC",
  SALES_INVOICE: "INV",
  PURCHASE_INVOICE: "BILL",
  PAYMENT_RECEIVED: "PR",
  PAYMENT_MADE: "PM",
} as const;

export type CodePrefix = (typeof CODE_PREFIX)[keyof typeof CODE_PREFIX];
