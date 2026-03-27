import {
  pgTable,
  text,
  timestamp,
  real,
  boolean,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// ENUMS
// ============================================

export const roleEnum = pgEnum("role", ["ADMIN", "USER"]);
export const ledgerAccountTypeEnum = pgEnum("ledger_account_type", [
  "CUSTOMER",
  "VENDOR",
  "CASH",
  "BANK",
  "SALES",
  "PURCHASE",
  "GST",
]);
export const referenceTypeEnum = pgEnum("reference_type", [
  "INVOICE",
  "PAYMENT",
  "OPENING_BALANCE",
  "ADJUSTMENT",
]);
export const invoiceTypeEnum = pgEnum("invoice_type", ["SALES", "PURCHASE"]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "UNPAID",
  "PARTIAL",
  "PAID",
]);
export const paymentTypeEnum = pgEnum("payment_type", ["RECEIVED", "MADE"]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "CASH",
  "BANK",
  "UPI",
  "CHEQUE",
]);

// ============================================
// AUTH & MULTI-TENANCY
// ============================================

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const companies = pgTable("companies", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  gstin: text("gstin"),
  pan: text("pan"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const companyMembers = pgTable(
  "company_members",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    role: roleEnum("role").default("ADMIN").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("user_company_idx").on(table.userId, table.companyId)]
);

export const financialYears = pgTable(
  "financial_years",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    label: text("label").notNull(), // "2025-26"
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    isActive: boolean("is_active").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("company_fy_idx").on(table.companyId, table.label),
  ]
);

// ============================================
// CUSTOMER & VENDOR
// ============================================

export const customers = pgTable(
  "customers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    gstin: text("gstin"),
    pan: text("pan"),
    phone: text("phone"),
    email: text("email"),
    billingAddress: text("billing_address"),
    shippingAddress: text("shipping_address"),
    city: text("city"),
    state: text("state"),
    pincode: text("pincode"),
    creditLimit: real("credit_limit").default(0).notNull(),
    openingBalance: real("opening_balance").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("customer_company_idx").on(table.companyId)]
);

export const vendors = pgTable(
  "vendors",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    gstin: text("gstin"),
    pan: text("pan"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    pincode: text("pincode"),
    openingBalance: real("opening_balance").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("vendor_company_idx").on(table.companyId)]
);

// ============================================
// LEDGER SYSTEM (CORE)
// ============================================

export const ledgerAccounts = pgTable(
  "ledger_accounts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: ledgerAccountTypeEnum("type").notNull(),
    customerId: text("customer_id").references(() => customers.id),
    vendorId: text("vendor_id").references(() => vendors.id),
    balance: real("balance").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ledger_company_type_idx").on(table.companyId, table.type),
    uniqueIndex("ledger_customer_idx").on(table.customerId),
    uniqueIndex("ledger_vendor_idx").on(table.vendorId),
  ]
);

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    financialYearId: text("financial_year_id")
      .notNull()
      .references(() => financialYears.id),
    ledgerAccountId: text("ledger_account_id")
      .notNull()
      .references(() => ledgerAccounts.id),
    date: timestamp("date").notNull(),
    description: text("description").notNull(),
    debit: real("debit").default(0).notNull(),
    credit: real("credit").default(0).notNull(),
    balanceAfter: real("balance_after").default(0).notNull(),
    referenceType: referenceTypeEnum("reference_type"),
    referenceId: text("reference_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("entry_account_date_idx").on(
      table.companyId,
      table.ledgerAccountId,
      table.date
    ),
    index("entry_reference_idx").on(table.referenceType, table.referenceId),
  ]
);

// ============================================
// INVOICES (SALES & PURCHASE)
// ============================================

export const invoices = pgTable(
  "invoices",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    financialYearId: text("financial_year_id")
      .notNull()
      .references(() => financialYears.id),
    invoiceNumber: text("invoice_number").notNull(),
    type: invoiceTypeEnum("type").notNull(),
    date: timestamp("date").notNull(),
    dueDate: timestamp("due_date"),
    customerId: text("customer_id").references(() => customers.id),
    vendorId: text("vendor_id").references(() => vendors.id),
    subtotal: real("subtotal").default(0).notNull(),
    taxAmount: real("tax_amount").default(0).notNull(),
    totalAmount: real("total_amount").default(0).notNull(),
    paidAmount: real("paid_amount").default(0).notNull(),
    status: invoiceStatusEnum("status").default("UNPAID").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("invoice_number_idx").on(
      table.companyId,
      table.invoiceNumber,
      table.type
    ),
    index("invoice_status_idx").on(table.companyId, table.type, table.status),
  ]
);

export const invoiceItems = pgTable("invoice_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: real("quantity").default(1).notNull(),
  rate: real("rate").default(0).notNull(),
  amount: real("amount").default(0).notNull(),
  gstPercent: real("gst_percent").default(0).notNull(),
  gstAmount: real("gst_amount").default(0).notNull(),
});

// ============================================
// PAYMENTS
// ============================================

export const payments = pgTable(
  "payments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    paymentNumber: text("payment_number").notNull(),
    type: paymentTypeEnum("type").notNull(),
    date: timestamp("date").notNull(),
    customerId: text("customer_id").references(() => customers.id),
    vendorId: text("vendor_id").references(() => vendors.id),
    amount: real("amount").notNull(),
    method: paymentMethodEnum("method").notNull(),
    reference: text("reference"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("payment_number_idx").on(table.companyId, table.paymentNumber),
    index("payment_type_idx").on(table.companyId, table.type),
  ]
);

export const paymentAllocations = pgTable(
  "payment_allocations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    paymentId: text("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    amount: real("amount").notNull(),
  },
  (table) => [
    uniqueIndex("allocation_idx").on(table.paymentId, table.invoiceId),
  ]
);

// ============================================
// RELATIONS
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(companyMembers),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  members: many(companyMembers),
  financialYears: many(financialYears),
  customers: many(customers),
  vendors: many(vendors),
  ledgerAccounts: many(ledgerAccounts),
  ledgerEntries: many(ledgerEntries),
  invoices: many(invoices),
  payments: many(payments),
}));

export const companyMembersRelations = relations(
  companyMembers,
  ({ one }) => ({
    user: one(users, {
      fields: [companyMembers.userId],
      references: [users.id],
    }),
    company: one(companies, {
      fields: [companyMembers.companyId],
      references: [companies.id],
    }),
  })
);

export const financialYearsRelations = relations(
  financialYears,
  ({ one, many }) => ({
    company: one(companies, {
      fields: [financialYears.companyId],
      references: [companies.id],
    }),
    invoices: many(invoices),
    ledgerEntries: many(ledgerEntries),
  })
);

export const customersRelations = relations(customers, ({ one, many }) => ({
  company: one(companies, {
    fields: [customers.companyId],
    references: [companies.id],
  }),
  ledgerAccount: one(ledgerAccounts, {
    fields: [customers.id],
    references: [ledgerAccounts.customerId],
  }),
  invoices: many(invoices),
  payments: many(payments),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  company: one(companies, {
    fields: [vendors.companyId],
    references: [companies.id],
  }),
  ledgerAccount: one(ledgerAccounts, {
    fields: [vendors.id],
    references: [ledgerAccounts.vendorId],
  }),
  invoices: many(invoices),
  payments: many(payments),
}));

export const ledgerAccountsRelations = relations(
  ledgerAccounts,
  ({ one, many }) => ({
    company: one(companies, {
      fields: [ledgerAccounts.companyId],
      references: [companies.id],
    }),
    customer: one(customers, {
      fields: [ledgerAccounts.customerId],
      references: [customers.id],
    }),
    vendor: one(vendors, {
      fields: [ledgerAccounts.vendorId],
      references: [vendors.id],
    }),
    entries: many(ledgerEntries),
  })
);

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  company: one(companies, {
    fields: [ledgerEntries.companyId],
    references: [companies.id],
  }),
  financialYear: one(financialYears, {
    fields: [ledgerEntries.financialYearId],
    references: [financialYears.id],
  }),
  ledgerAccount: one(ledgerAccounts, {
    fields: [ledgerEntries.ledgerAccountId],
    references: [ledgerAccounts.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  company: one(companies, {
    fields: [invoices.companyId],
    references: [companies.id],
  }),
  financialYear: one(financialYears, {
    fields: [invoices.financialYearId],
    references: [financialYears.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  vendor: one(vendors, {
    fields: [invoices.vendorId],
    references: [vendors.id],
  }),
  items: many(invoiceItems),
  paymentAllocations: many(paymentAllocations),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  company: one(companies, {
    fields: [payments.companyId],
    references: [companies.id],
  }),
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
  }),
  vendor: one(vendors, {
    fields: [payments.vendorId],
    references: [vendors.id],
  }),
  allocations: many(paymentAllocations),
}));

export const paymentAllocationsRelations = relations(
  paymentAllocations,
  ({ one }) => ({
    payment: one(payments, {
      fields: [paymentAllocations.paymentId],
      references: [payments.id],
    }),
    invoice: one(invoices, {
      fields: [paymentAllocations.invoiceId],
      references: [invoices.id],
    }),
  })
);
