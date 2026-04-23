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
export const organizationRoleEnum = pgEnum("organization_role", [
  "OWNER",
  "ADMIN",
  "USER",
]);
export const companyRoleEnum = pgEnum("company_role", ["ADMIN", "USER"]);
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
export const unitEnum = pgEnum("unit", [
  "PCS",
  "KG",
  "LTR",
  "BOX",
  "MTR",
  "SET",
  "PAIR",
  "DOZEN",
  "STRIP",
  "BOTTLE",
  "TUBE",
  "VIAL",
]);
export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "IN",
  "OUT",
  "ADJUST",
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

export const organizations = pgTable("organizations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: organizationRoleEnum("role").default("USER").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_organization_idx").on(table.userId, table.organizationId),
  ]
);

export const companies = pgTable("companies", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
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
    role: companyRoleEnum("role").default("ADMIN").notNull(),
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
    code: text("code"),
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
    code: text("code"),
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
    code: text("code"),
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
    code: text("code"),
    invoiceNumber: text("invoice_number").notNull(),
    type: invoiceTypeEnum("type").notNull(),
    date: timestamp("date").notNull(),
    dueDate: timestamp("due_date"),
    customerId: text("customer_id").references(() => customers.id),
    vendorId: text("vendor_id").references(() => vendors.id),
    facilityId: text("facility_id").references(() => facilities.id),
    subtotal: real("subtotal").default(0).notNull(),
    taxAmount: real("tax_amount").default(0).notNull(),
    discountPercent: real("discount_percent").default(0).notNull(),
    discountAmount: real("discount_amount").default(0).notNull(),
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
  productId: text("product_id").references(() => products.id),
  description: text("description").notNull(),
  quantity: real("quantity").default(1).notNull(),
  rate: real("rate").default(0).notNull(),
  amount: real("amount").default(0).notNull(),
  gstPercent: real("gst_percent").default(0).notNull(),
  gstAmount: real("gst_amount").default(0).notNull(),
  batchNo: text("batch_no"),
  slNo: text("sl_no"),
  expiryDate: timestamp("expiry_date"),
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
    code: text("code"),
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
// FACILITIES (Warehouses / Godowns)
// ============================================

export const facilities = pgTable(
  "facilities",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    code: text("code"),
    name: text("name").notNull(),
    address: text("address"),
    isDefault: boolean("is_default").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("facility_company_idx").on(table.companyId)]
);

// ============================================
// CATEGORIES
// ============================================

export const categories = pgTable(
  "categories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("category_company_idx").on(table.companyId),
    uniqueIndex("category_name_company_idx").on(table.companyId, table.name),
  ]
);

export const subcategories = pgTable(
  "subcategories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("subcategory_company_idx").on(table.companyId),
    index("subcategory_category_idx").on(table.categoryId),
    uniqueIndex("subcategory_name_category_idx").on(
      table.categoryId,
      table.name
    ),
  ]
);

// ============================================
// PRODUCTS & STOCK
// ============================================

export const products = pgTable(
  "products",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    code: text("code"),
    name: text("name").notNull(),
    description: text("description"),
    hsn: text("hsn"),
    sku: text("sku"),
    unit: unitEnum("unit").default("PCS").notNull(),
    categoryId: text("category_id").references(() => categories.id),
    subcategoryId: text("subcategory_id").references(() => subcategories.id),
    gstPercent: real("gst_percent").default(0).notNull(),
    purchaseRate: real("purchase_rate").default(0).notNull(),
    sellingRate: real("selling_rate").default(0).notNull(),
    openingStock: real("opening_stock").default(0).notNull(),
    currentStock: real("current_stock").default(0).notNull(),
    reorderLevel: real("reorder_level").default(0).notNull(),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("product_company_idx").on(table.companyId)]
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    facilityId: text("facility_id").references(() => facilities.id),
    type: stockMovementTypeEnum("type").notNull(),
    quantity: real("quantity").notNull(),
    batchNo: text("batch_no"),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("stock_product_idx").on(table.companyId, table.productId)]
);

export const facilityStock = pgTable(
  "facility_stock",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    facilityId: text("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    currentStock: real("current_stock").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("facility_product_idx").on(table.facilityId, table.productId),
  ]
);

// ============================================
// RELATIONS
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  organizationMemberships: many(organizationMembers),
  memberships: many(companyMembers),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  companies: many(companies),
}));

export const organizationMembersRelations = relations(
  organizationMembers,
  ({ one }) => ({
    user: one(users, {
      fields: [organizationMembers.userId],
      references: [users.id],
    }),
    organization: one(organizations, {
      fields: [organizationMembers.organizationId],
      references: [organizations.id],
    }),
  })
);

export const companiesRelations = relations(companies, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [companies.organizationId],
    references: [organizations.id],
  }),
  members: many(companyMembers),
  financialYears: many(financialYears),
  customers: many(customers),
  vendors: many(vendors),
  ledgerAccounts: many(ledgerAccounts),
  ledgerEntries: many(ledgerEntries),
  invoices: many(invoices),
  payments: many(payments),
  products: many(products),
  facilities: many(facilities),
  categories: many(categories),
  subcategories: many(subcategories),
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
  facility: one(facilities, {
    fields: [invoices.facilityId],
    references: [facilities.id],
  }),
  items: many(invoiceItems),
  paymentAllocations: many(paymentAllocations),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  product: one(products, {
    fields: [invoiceItems.productId],
    references: [products.id],
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

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  company: one(companies, {
    fields: [categories.companyId],
    references: [companies.id],
  }),
  subcategories: many(subcategories),
  products: many(products),
}));

export const subcategoriesRelations = relations(
  subcategories,
  ({ one, many }) => ({
    company: one(companies, {
      fields: [subcategories.companyId],
      references: [companies.id],
    }),
    category: one(categories, {
      fields: [subcategories.categoryId],
      references: [categories.id],
    }),
    products: many(products),
  })
);

export const productsRelations = relations(products, ({ one, many }) => ({
  company: one(companies, {
    fields: [products.companyId],
    references: [companies.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  subcategory: one(subcategories, {
    fields: [products.subcategoryId],
    references: [subcategories.id],
  }),
  stockMovements: many(stockMovements),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  company: one(companies, {
    fields: [stockMovements.companyId],
    references: [companies.id],
  }),
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
  facility: one(facilities, {
    fields: [stockMovements.facilityId],
    references: [facilities.id],
  }),
}));

export const facilitiesRelations = relations(facilities, ({ one, many }) => ({
  company: one(companies, {
    fields: [facilities.companyId],
    references: [companies.id],
  }),
  invoices: many(invoices),
  stockMovements: many(stockMovements),
  facilityStock: many(facilityStock),
}));

export const facilityStockRelations = relations(facilityStock, ({ one }) => ({
  company: one(companies, {
    fields: [facilityStock.companyId],
    references: [companies.id],
  }),
  facility: one(facilities, {
    fields: [facilityStock.facilityId],
    references: [facilities.id],
  }),
  product: one(products, {
    fields: [facilityStock.productId],
    references: [products.id],
  }),
}));
