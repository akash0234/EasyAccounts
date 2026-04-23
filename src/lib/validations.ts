import { z } from "zod";

// Auth
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  organizationName: z.string().min(2, "Organization name required"),
  companyName: z.string().min(2, "Company name required"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

export const organizationCompanySchema = z.object({
  name: z.string().min(2, "Company name required"),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN")
    .optional()
    .or(z.literal("")),
  pan: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

export const organizationUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  companyId: z.string().min(1, "Company is required"),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
});

// Company
export const companySchema = z.object({
  name: z.string().min(2),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN")
    .optional()
    .or(z.literal("")),
  pan: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
});

// Customer
export const customerSchema = z.object({
  name: z.string().min(1, "Name required"),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN")
    .optional()
    .or(z.literal("")),
  pan: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  creditLimit: z.coerce.number().min(0).default(0),
  openingBalance: z.coerce.number().default(0),
});

// Vendor
export const vendorSchema = z.object({
  name: z.string().min(1, "Name required"),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN")
    .optional()
    .or(z.literal("")),
  pan: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  openingBalance: z.coerce.number().default(0),
});

// Facility
export const facilitySchema = z.object({
  name: z.string().min(1, "Name required"),
  address: z.string().optional(),
  isDefault: z.boolean().optional(),
});

// Invoice item
export const invoiceItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1, "Description required"),
  quantity: z.coerce.number().min(0.01),
  rate: z.coerce.number().min(0),
  gstPercent: z.coerce.number().min(0).max(28).default(0),
  batchNo: z.string().optional(),
  slNo: z.string().optional(),
  expiryDate: z.string().optional(),
});

// Invoice
export const invoiceSchema = z.object({
  date: z.string().min(1, "Date required"),
  dueDate: z.string().optional(),
  customerId: z.string().optional(),
  vendorId: z.string().optional(),
  facilityId: z.string().optional(),
  discountEnabled: z.boolean().optional().default(false),
  discountPercent: z.coerce.number().min(0).max(100).optional().default(0),
  discountAmount: z.coerce.number().min(0).optional().default(0),
  items: z.array(invoiceItemSchema).min(1, "At least one item required"),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.discountEnabled) {
    return;
  }

  const invalidPercent = data.discountPercent < 0 || data.discountPercent > 100;
  const invalidAmount = data.discountAmount < 0;

  if (invalidPercent) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Discount percentage must be between 0 and 100",
      path: ["discountPercent"],
    });
  }

  if (invalidAmount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Discount amount cannot be negative",
      path: ["discountAmount"],
    });
  }
});

// Product
export const productSchema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional(),
  hsn: z.string().optional(),
  sku: z.string().optional(),
  unit: z.enum(["PCS", "KG", "LTR", "BOX", "MTR", "SET", "PAIR", "DOZEN", "STRIP", "BOTTLE", "TUBE", "VIAL"]).default("PCS"),
  categoryId: z.string().optional().or(z.literal("")),
  subcategoryId: z.string().optional().or(z.literal("")),
  gstPercent: z.coerce.number().min(0).max(28).default(0),
  purchaseRate: z.coerce.number().min(0).default(0),
  sellingRate: z.coerce.number().min(0).default(0),
  openingStock: z.coerce.number().min(0).default(0),
  reorderLevel: z.coerce.number().min(0).default(0),
  imageUrl: z.string().optional(),
});

// Stock Movement
export const stockMovementSchema = z.object({
  productId: z.string().min(1, "Product required"),
  type: z.enum(["IN", "OUT", "ADJUST"]),
  quantity: z.coerce.number().min(0.01, "Quantity must be positive"),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
});

// Payment
export const paymentSchema = z
  .object({
    date: z.string().min(1, "Date required"),
    customerId: z.string().optional(),
    vendorId: z.string().optional(),
    amount: z.coerce.number().min(0, "Amount cannot be negative"),
    method: z.enum(["CASH", "BANK", "UPI", "CHEQUE"]),
    reference: z.string().optional(),
    notes: z.string().optional(),
    allocations: z
      .array(
        z.object({
          invoiceId: z.string(),
          amount: z.coerce.number().min(0.01),
        })
      )
      .optional(),
    advanceAllocations: z
      .array(
        z.object({
          paymentId: z.string().min(1),
          invoiceId: z.string().min(1),
          amount: z.coerce.number().min(0.01),
        })
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    const hasAdvanceAllocations =
      data.advanceAllocations && data.advanceAllocations.length > 0;
    if (data.amount === 0 && !hasAdvanceAllocations) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amount must be greater than 0 unless using advance allocations",
        path: ["amount"],
      });
    }
  });
