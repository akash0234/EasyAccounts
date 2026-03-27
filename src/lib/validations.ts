import { z } from "zod";

// Auth
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  companyName: z.string().min(2, "Organisation name required"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
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

// Invoice item
export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description required"),
  quantity: z.coerce.number().min(0.01),
  rate: z.coerce.number().min(0),
  gstPercent: z.coerce.number().min(0).max(28).default(0),
});

// Invoice
export const invoiceSchema = z.object({
  date: z.string().min(1, "Date required"),
  dueDate: z.string().optional(),
  customerId: z.string().optional(),
  vendorId: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item required"),
  notes: z.string().optional(),
});

// Payment
export const paymentSchema = z.object({
  date: z.string().min(1, "Date required"),
  customerId: z.string().optional(),
  vendorId: z.string().optional(),
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
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
});
