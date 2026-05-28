import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
import bcrypt from "bcryptjs";
import postgres from "postgres";
import { execFileSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

const ELECTRONICS = {
  company: {
    name: "RK Electronics Showroom",
    gstin: "19AABCR1001E1Z5",
    pan: "AABCR1001E",
    phone: "03322001111",
    email: "electronics@rksons.in",
    address: "21, Chowringhee Road",
    city: "Kolkata",
    state: "West Bengal",
    pincode: "700016",
  },
  users: [
    {
      name: "Arjun Admin",
      email: "arjun.admin@rkelectronics.in",
      phone: "9810000001",
      role: "ADMIN",
      pass: "admin123",
    },
    {
      name: "Priya Sales",
      email: "priya.sales@rkelectronics.in",
      phone: "9810000002",
      role: "USER",
      pass: "user123",
    },
    {
      name: "Rohit Cashier",
      email: "rohit.cashier@rkelectronics.in",
      phone: "9810000003",
      role: "USER",
      pass: "user123",
    },
    {
      name: "Neha Stock",
      email: "neha.stock@rkelectronics.in",
      phone: "9810000004",
      role: "USER",
      pass: "user123",
    },
    {
      name: "Karan Support",
      email: "karan.support@rkelectronics.in",
      phone: "9810000005",
      role: "USER",
      pass: "user123",
    },
  ],
  customers: [
    {
      code: "CUST-001",
      name: "Sen Gupta Household",
      gstin: null,
      phone: "9830011111",
      creditLimit: 0,
      address: {
        label: "Home",
        line1: "Flat 3B, 12 Lake Road",
        city: "Kolkata",
        state: "West Bengal",
        pincode: "700029",
      },
    },
    {
      code: "CUST-002",
      name: "Techno Offices Pvt Ltd",
      gstin: "19AABCT3003O1ZP",
      phone: "9830022222",
      creditLimit: 200000,
      address: {
        label: "Head Office",
        line1: "Salt Lake Sector V, Block DN-52",
        city: "Kolkata",
        state: "West Bengal",
        pincode: "700091",
      },
    },
    {
      code: "CUST-003",
      name: "Das Residence",
      gstin: null,
      phone: "9830033333",
      creditLimit: 50000,
      address: {
        label: "Residence",
        line1: "7/1 Gariahat Road",
        city: "Kolkata",
        state: "West Bengal",
        pincode: "700019",
      },
    },
    {
      code: "CUST-004",
      name: "Bright School Trust",
      gstin: "19AABCB4004S1ZK",
      phone: "9830044444",
      creditLimit: 100000,
      address: {
        label: "Accounts Office",
        line1: "45, Park Circus",
        city: "Kolkata",
        state: "West Bengal",
        pincode: "700017",
      },
    },
    {
      code: "CUST-005",
      name: "Mitra Electronics Resellers",
      gstin: "19AABCM5005R1ZL",
      phone: "9830055555",
      creditLimit: 150000,
      address: {
        label: "Shop",
        line1: "Chandni Chowk Market",
        city: "Kolkata",
        state: "West Bengal",
        pincode: "700013",
      },
    },
  ],
  vendors: [
    {
      code: "VEND-001",
      key: "samsung",
      name: "Samsung India Electronics",
      gstin: "07AAACS1234A1Z1",
      phone: "01240000001",
      address: "Gurgaon HQ",
      city: "Gurgaon",
      state: "Haryana",
      pincode: "122002",
    },
    {
      code: "VEND-002",
      key: "lg",
      name: "LG Electronics India",
      gstin: "07AAACL5678B1Z2",
      phone: "01240000002",
      address: "Greater Noida Plant",
      city: "Greater Noida",
      state: "Uttar Pradesh",
      pincode: "201306",
    },
    {
      code: "VEND-003",
      key: "sony",
      name: "Sony India Pvt Ltd",
      gstin: "07AAACS9876C1Z3",
      phone: "01140000003",
      address: "A-31 Mohan Coop Estate",
      city: "New Delhi",
      state: "Delhi",
      pincode: "110044",
    },
    {
      code: "VEND-004",
      key: "voltas",
      name: "Voltas Limited",
      gstin: "27AAACV1122D1Z4",
      phone: "02266656666",
      address: "Voltas House, Chinchpokli",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400033",
    },
    {
      code: "VEND-005",
      key: "havells",
      name: "Havells India",
      gstin: "07AAACH3344E1Z5",
      phone: "01140000005",
      address: "QRG Towers, Noida",
      city: "Noida",
      state: "Uttar Pradesh",
      pincode: "201304",
    },
  ],
  categories: [
    {
      name: "Televisions",
      description: "LED, QLED, OLED TVs of all sizes",
    },
    {
      name: "Home Appliances",
      description: "Washing machines, refrigerators, ACs",
    },
    {
      name: "Audio & Entertainment",
      description: "Speakers, home theatres, soundbars",
    },
    {
      name: "Mobile & Accessories",
      description: "Smartphones, chargers, earphones",
    },
    {
      name: "Small Kitchen Appliances",
      description: "Mixers, grinders, microwaves",
    },
  ],
  subcategories: [
    {
      name: "Smart LED TV",
      categoryName: "Televisions",
      description: "Internet-enabled LED TVs",
    },
    {
      name: "Split AC",
      categoryName: "Home Appliances",
      description: "Inverter split air conditioners",
    },
    {
      name: "Soundbar",
      categoryName: "Audio & Entertainment",
      description: "Single-unit soundbars",
    },
    {
      name: "Bluetooth Speaker",
      categoryName: "Audio & Entertainment",
      description: "Portable wireless speakers",
    },
    {
      name: "Headphones",
      categoryName: "Audio & Entertainment",
      description: "Over-ear and on-ear headphones",
    },
    {
      name: "Smartphone",
      categoryName: "Mobile & Accessories",
      description: "Android and iOS smartphones",
    },
    {
      name: "Power Bank",
      categoryName: "Mobile & Accessories",
      description: "Portable charging packs",
    },
    {
      name: "Charger",
      categoryName: "Mobile & Accessories",
      description: "Wall chargers and adapters",
    },
    {
      name: "Microwave Oven",
      categoryName: "Small Kitchen Appliances",
      description: "Convection and grill microwaves",
    },
  ],
  products: [
    {
      key: "tv",
      code: "PRD-001",
      name: 'Samsung 55" QLED Smart TV',
      description: "55 inch 4K QLED Smart TV",
      hsn: "8528",
      sku: "SAM-QLED-55",
      unit: "PCS",
      trackingMode: "SERIAL",
      categoryName: "Televisions",
      subcategoryName: "Smart LED TV",
      gstPercent: 18,
      purchaseRate: 62000,
      sellingRate: 74999,
      reorderLevel: 5,
      scenario: "Serial-only inward history with one unit per line and distinct chassis numbers.",
    },
    {
      key: "ac",
      code: "PRD-002",
      name: "LG 1.5 Ton Split AC",
      description: "5-star inverter split AC",
      hsn: "8415",
      sku: "LG-AC-15",
      unit: "PCS",
      trackingMode: "SERIAL",
      categoryName: "Home Appliances",
      subcategoryName: "Split AC",
      gstPercent: 28,
      purchaseRate: 38000,
      sellingRate: 45999,
      reorderLevel: 10,
      scenario: "Serial plus batch inward where each machine has its own serial under supplier lots.",
    },
    {
      key: "soundbar",
      code: "PRD-003",
      name: "Sony HT-S40R Soundbar",
      description: "5.1ch real surround soundbar",
      hsn: "8518",
      sku: "SONY-HTS40R",
      unit: "PCS",
      trackingMode: "NONE",
      categoryName: "Audio & Entertainment",
      subcategoryName: "Soundbar",
      gstPercent: 18,
      purchaseRate: 22000,
      sellingRate: 29990,
      reorderLevel: 8,
      scenario: "True bulk stock with quantity-only inward movement and no batch or serial.",
    },
    {
      key: "phone",
      code: "PRD-004",
      name: "Samsung Galaxy A55 5G",
      description: "8GB/256GB smartphone",
      hsn: "8517",
      sku: "SAM-A55-256",
      unit: "PCS",
      trackingMode: "SERIAL",
      categoryName: "Mobile & Accessories",
      subcategoryName: "Smartphone",
      gstPercent: 18,
      purchaseRate: 32000,
      sellingRate: 38999,
      reorderLevel: 15,
      scenario: "Serial-only mobile stock spread across multiple invoices and facilities.",
    },
    {
      key: "microwave",
      code: "PRD-005",
      name: "LG 28L Convection Microwave",
      description: "Convection plus grill microwave oven",
      hsn: "8516",
      sku: "LG-MC28",
      unit: "PCS",
      trackingMode: "BATCH",
      categoryName: "Small Kitchen Appliances",
      subcategoryName: "Microwave Oven",
      gstPercent: 18,
      purchaseRate: 13000,
      sellingRate: 16499,
      reorderLevel: 10,
      scenario: "Batch-oriented inward stock with multiple historical lots.",
    },
    {
      key: "headphones",
      code: "PRD-006",
      name: "boAt Rockerz 450 Headphones",
      description: "Wireless over-ear Bluetooth headphones",
      hsn: "8518",
      sku: "BOAT-R450",
      unit: "PCS",
      trackingMode: "NONE",
      categoryName: "Audio & Entertainment",
      subcategoryName: "Headphones",
      gstPercent: 18,
      purchaseRate: 1150,
      sellingRate: 1499,
      reorderLevel: 40,
      scenario: "Fast-moving bulk accessory with neither batch nor serial tracking.",
    },
    {
      key: "powerbank",
      code: "PRD-007",
      name: "Ambrane 20000mAh Power Bank",
      description: "20W fast-charge power bank",
      hsn: "8507",
      sku: "AMB-PB20K",
      unit: "PCS",
      trackingMode: "BATCH",
      categoryName: "Mobile & Accessories",
      subcategoryName: "Power Bank",
      gstPercent: 18,
      purchaseRate: 980,
      sellingRate: 1299,
      reorderLevel: 35,
      scenario: "Batch-only accessory stock received in supplier carton lots.",
    },
    {
      key: "speaker",
      code: "PRD-008",
      name: "JBL Go 4 Bluetooth Speaker",
      description: "Portable Bluetooth speaker",
      hsn: "8518",
      sku: "JBL-GO4",
      unit: "PCS",
      trackingMode: "NONE",
      categoryName: "Audio & Entertainment",
      subcategoryName: "Bluetooth Speaker",
      gstPercent: 18,
      purchaseRate: 2400,
      sellingRate: 2999,
      reorderLevel: 25,
      scenario: "Bulk portable speaker stock with plain quantity-based inward history.",
    },
    {
      key: "charger",
      code: "PRD-009",
      name: "Samsung 25W USB-C Fast Charger",
      description: "25W travel adapter with USB-C output",
      hsn: "8504",
      sku: "SAM-25W-TA",
      unit: "PCS",
      trackingMode: "NONE",
      categoryName: "Mobile & Accessories",
      subcategoryName: "Charger",
      gstPercent: 18,
      purchaseRate: 520,
      sellingRate: 699,
      reorderLevel: 60,
      scenario: "Independent bulk accessory with no batch and no serial references.",
    },
  ],
  facilities: [
    {
      key: "showroom",
      code: "FAC-001",
      name: "Chowringhee Showroom Floor",
      address: "21, Chowringhee Road, Kolkata",
      isDefault: true,
    },
    {
      key: "backstore",
      code: "FAC-002",
      name: "Chowringhee Back Storage",
      address: "21, Chowringhee Road (Rear), Kolkata",
      isDefault: false,
    },
    {
      key: "warehouse",
      code: "FAC-003",
      name: "Howrah Warehouse",
      address: "Plot 12, Kona Expressway, Howrah",
      isDefault: false,
    },
    {
      key: "service",
      code: "FAC-004",
      name: "Salt Lake Service Centre",
      address: "Sector V, Block EP, Kolkata",
      isDefault: false,
    },
    {
      key: "behala",
      code: "FAC-005",
      name: "Behala Stock Point",
      address: "Diamond Harbour Road, Behala",
      isDefault: false,
    },
  ],
  purchaseBills: [
    {
      invoiceNumber: "BILL-0001",
      code: "BILL-SEED-0001",
      vendorKey: "samsung",
      facilityKey: "warehouse",
      date: "2025-04-05T10:00:00.000Z",
      dueDate: "2025-04-20T10:00:00.000Z",
      notes: "Initial April inward for serial-driven TVs and phones.",
      items: [
        {
          productKey: "tv",
          description: 'Samsung 55" QLED Smart TV - serial TV240405001',
          quantity: 1,
          slNo: "TV240405001",
        },
        {
          productKey: "tv",
          description: 'Samsung 55" QLED Smart TV - serial TV240405002',
          quantity: 1,
          slNo: "TV240405002",
        },
        {
          productKey: "phone",
          description: "Samsung Galaxy A55 5G - IMEI 356781240405001",
          quantity: 1,
          slNo: "356781240405001",
        },
        {
          productKey: "phone",
          description: "Samsung Galaxy A55 5G - IMEI 356781240405002",
          quantity: 1,
          slNo: "356781240405002",
        },
        {
          productKey: "phone",
          description: "Samsung Galaxy A55 5G - IMEI 356781240405003",
          quantity: 1,
          slNo: "356781240405003",
        },
      ],
    },
    {
      invoiceNumber: "BILL-0002",
      code: "BILL-SEED-0002",
      vendorKey: "lg",
      facilityKey: "backstore",
      date: "2025-04-20T10:00:00.000Z",
      dueDate: "2025-05-05T10:00:00.000Z",
      notes: "Batch plus serial inward for ACs, and bulk microwave lot.",
      items: [
        {
          productKey: "ac",
          description: "LG 1.5 Ton Split AC - serial AC240420001",
          quantity: 1,
          batchNo: "AC-APR-A",
          slNo: "AC240420001",
        },
        {
          productKey: "ac",
          description: "LG 1.5 Ton Split AC - serial AC240420002",
          quantity: 1,
          batchNo: "AC-APR-A",
          slNo: "AC240420002",
        },
        {
          productKey: "microwave",
          description: "LG 28L Convection Microwave - lot MW-APR-A",
          quantity: 4,
          batchNo: "MW-APR-A",
        },
      ],
    },
    {
      invoiceNumber: "BILL-0003",
      code: "BILL-SEED-0003",
      vendorKey: "sony",
      facilityKey: "showroom",
      date: "2025-05-02T10:00:00.000Z",
      dueDate: "2025-05-17T10:00:00.000Z",
      notes: "Showroom replenishment for normal bulk soundbar stock.",
      items: [
        {
          productKey: "soundbar",
          description: "Sony HT-S40R Soundbar - showroom inward",
          quantity: 6,
        },
      ],
    },
    {
      invoiceNumber: "BILL-0004",
      code: "BILL-SEED-0004",
      vendorKey: "samsung",
      facilityKey: "showroom",
      date: "2025-05-18T10:00:00.000Z",
      dueDate: "2025-06-02T10:00:00.000Z",
      notes: "Fresh showroom stock for premium TV and mobile counters.",
      items: [
        {
          productKey: "tv",
          description: 'Samsung 55" QLED Smart TV - serial TV240518001',
          quantity: 1,
          slNo: "TV240518001",
        },
        {
          productKey: "phone",
          description: "Samsung Galaxy A55 5G - IMEI 356781240518001",
          quantity: 1,
          slNo: "356781240518001",
        },
        {
          productKey: "phone",
          description: "Samsung Galaxy A55 5G - IMEI 356781240518002",
          quantity: 1,
          slNo: "356781240518002",
        },
      ],
    },
    {
      invoiceNumber: "BILL-0005",
      code: "BILL-SEED-0005",
      vendorKey: "lg",
      facilityKey: "backstore",
      date: "2025-06-01T10:00:00.000Z",
      dueDate: "2025-06-16T10:00:00.000Z",
      notes: "Second inward with a new AC batch and a second microwave batch in the same storage facility for mixed-batch sales.",
      items: [
        {
          productKey: "ac",
          description: "LG 1.5 Ton Split AC - serial AC240601001",
          quantity: 1,
          batchNo: "AC-JUN-B",
          slNo: "AC240601001",
        },
        {
          productKey: "ac",
          description: "LG 1.5 Ton Split AC - serial AC240601002",
          quantity: 1,
          batchNo: "AC-JUN-B",
          slNo: "AC240601002",
        },
        {
          productKey: "microwave",
          description: "LG 28L Convection Microwave - lot MW-JUN-B",
          quantity: 5,
          batchNo: "MW-JUN-B",
        },
      ],
    },
    {
      invoiceNumber: "BILL-0006",
      code: "BILL-SEED-0006",
      vendorKey: "sony",
      facilityKey: "service",
      date: "2025-06-12T10:00:00.000Z",
      dueDate: "2025-06-27T10:00:00.000Z",
      notes: "Service centre inward for installation and demo stock.",
      items: [
        {
          productKey: "soundbar",
          description: "Sony HT-S40R Soundbar - service inward",
          quantity: 4,
        },
      ],
    },
    {
      invoiceNumber: "BILL-0007",
      code: "BILL-SEED-0007",
      vendorKey: "samsung",
      facilityKey: "backstore",
      date: "2025-06-28T10:00:00.000Z",
      dueDate: "2025-07-13T10:00:00.000Z",
      notes: "Late June phone replenishment for the weekend sale push.",
      items: [
        {
          productKey: "phone",
          description: "Samsung Galaxy A55 5G - IMEI 356781240628001",
          quantity: 1,
          slNo: "356781240628001",
        },
        {
          productKey: "phone",
          description: "Samsung Galaxy A55 5G - IMEI 356781240628002",
          quantity: 1,
          slNo: "356781240628002",
        },
      ],
    },
    {
      invoiceNumber: "BILL-0008",
      code: "BILL-SEED-0008",
      vendorKey: "sony",
      facilityKey: "showroom",
      date: "2025-07-05T10:00:00.000Z",
      dueDate: "2025-07-20T10:00:00.000Z",
      notes: "Accessory replenishment with pure bulk audio items.",
      items: [
        {
          productKey: "headphones",
          description: "boAt Rockerz 450 Headphones - floor stock",
          quantity: 24,
        },
        {
          productKey: "speaker",
          description: "JBL Go 4 Bluetooth Speaker - floor stock",
          quantity: 12,
        },
      ],
    },
    {
      invoiceNumber: "BILL-0009",
      code: "BILL-SEED-0009",
      vendorKey: "havells",
      facilityKey: "warehouse",
      date: "2025-07-18T10:00:00.000Z",
      dueDate: "2025-08-02T10:00:00.000Z",
      notes: "High-volume mobile accessories with batch-only power banks and bulk chargers.",
      items: [
        {
          productKey: "powerbank",
          description: "Ambrane 20000mAh Power Bank - carton PB-JUL-A",
          quantity: 30,
          batchNo: "PB-JUL-A",
        },
        {
          productKey: "charger",
          description: "Samsung 25W USB-C Fast Charger - warehouse stock",
          quantity: 40,
        },
      ],
    },
    {
      invoiceNumber: "BILL-0010",
      code: "BILL-SEED-0010",
      vendorKey: "havells",
      facilityKey: "warehouse",
      date: "2025-08-08T10:00:00.000Z",
      dueDate: "2025-08-23T10:00:00.000Z",
      notes: "Second batch for power banks in the same warehouse to support mixed-batch allocation, plus a bulk headphone refill.",
      items: [
        {
          productKey: "powerbank",
          description: "Ambrane 20000mAh Power Bank - carton PB-AUG-B",
          quantity: 18,
          batchNo: "PB-AUG-B",
        },
        {
          productKey: "headphones",
          description: "boAt Rockerz 450 Headphones - backstore refill",
          quantity: 16,
        },
      ],
    },
    {
      invoiceNumber: "BILL-0011",
      code: "BILL-SEED-0011",
      vendorKey: "sony",
      facilityKey: "service",
      date: "2025-08-25T10:00:00.000Z",
      dueDate: "2025-09-09T10:00:00.000Z",
      notes: "Speaker refill for demos and charger top-up for after-sales desk.",
      items: [
        {
          productKey: "speaker",
          description: "JBL Go 4 Bluetooth Speaker - demo and service stock",
          quantity: 8,
        },
        {
          productKey: "charger",
          description: "Samsung 25W USB-C Fast Charger - support desk stock",
          quantity: 20,
        },
      ],
    },
  ],
  salesBills: [
    {
      invoiceNumber: "INV-0001",
      code: "INV-SEED-0001",
      customerCode: "CUST-001",
      facilityKey: "showroom",
      date: "2025-08-30T10:00:00.000Z",
      dueDate: "2025-09-06T10:00:00.000Z",
      notes: "Walk-in premium sale using showroom serial picks.",
      items: [
        {
          productKey: "tv",
          description: 'Samsung 55" QLED Smart TV - showroom serial TV240518001',
          quantity: 1,
          slNo: "TV240518001",
        },
        {
          productKey: "phone",
          description: "Samsung Galaxy A55 5G - IMEI 356781240518001",
          quantity: 1,
          slNo: "356781240518001",
        },
      ],
    },
    {
      invoiceNumber: "INV-0002",
      code: "INV-SEED-0002",
      customerCode: "CUST-002",
      facilityKey: "warehouse",
      date: "2025-09-04T10:00:00.000Z",
      dueDate: "2025-09-19T10:00:00.000Z",
      notes: "Corporate accessory dispatch showing mixed-batch power bank allocation from one facility.",
      items: [
        {
          productKey: "powerbank",
          description: "Ambrane 20000mAh Power Bank - mixed warehouse batches",
          quantity: 36,
          batchNo: "PB-JUL-A:30, PB-AUG-B:6",
        },
        {
          productKey: "charger",
          description: "Samsung 25W USB-C Fast Charger - warehouse dispatch",
          quantity: 10,
        },
      ],
    },
    {
      invoiceNumber: "INV-0003",
      code: "INV-SEED-0003",
      customerCode: "CUST-003",
      facilityKey: "backstore",
      date: "2025-09-10T10:00:00.000Z",
      dueDate: "2025-09-17T10:00:00.000Z",
      notes: "Kitchen appliance order with mixed microwave batches and one serial AC.",
      items: [
        {
          productKey: "microwave",
          description: "LG 28L Convection Microwave - mixed backstore batches",
          quantity: 7,
          batchNo: "MW-APR-A:4, MW-JUN-B:3",
        },
        {
          productKey: "ac",
          description: "LG 1.5 Ton Split AC - serial AC240420001",
          quantity: 1,
          batchNo: "AC-APR-A",
          slNo: "AC240420001",
        },
      ],
    },
    {
      invoiceNumber: "INV-0004",
      code: "INV-SEED-0004",
      customerCode: "CUST-004",
      facilityKey: "showroom",
      date: "2025-09-18T10:00:00.000Z",
      dueDate: "2025-10-03T10:00:00.000Z",
      notes: "Normal bulk showroom sale for soundbars and speakers.",
      items: [
        {
          productKey: "soundbar",
          description: "Sony HT-S40R Soundbar - showroom sale",
          quantity: 2,
        },
        {
          productKey: "speaker",
          description: "JBL Go 4 Bluetooth Speaker - showroom sale",
          quantity: 3,
        },
      ],
    },
  ],
};

function money(value) {
  return Number(value.toFixed(2));
}

function splitCsv(value = "") {
  return value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseBatchAllocations(value = "", quantity = 0) {
  const raw = value.trim();
  if (!raw) return [];

  if (raw.includes(":")) {
    return raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [batchNo, qty] = part.split(":").map((piece) => piece.trim());
        return {
          batchNo,
          quantity: Number(qty),
        };
      })
      .filter((entry) => entry.batchNo && entry.quantity > 0);
  }

  return [{ batchNo: raw, quantity }];
}

async function truncateAll() {
  await sql`
    TRUNCATE
      invoice_additional_charges,
      additional_charge_catalog,
      customer_addresses,
      invoice_item_allocations,
      stock_details,
      facility_stock,
      stock_movements,
      payment_allocations,
      invoice_items,
      invoices,
      ledger_entries,
      ledger_accounts,
      products,
      subcategories,
      categories,
      payments,
      vendors,
      customers,
      facilities,
      financial_years,
      company_members,
      companies,
      organization_members,
      organizations,
      users
    CASCADE
  `;
}

async function createSystemLedgerAccounts(companyId) {
  const types = [
    { name: "Cash Account", type: "CASH" },
    { name: "Bank Account", type: "BANK" },
    { name: "Sales Account", type: "SALES" },
    { name: "Purchase Account", type: "PURCHASE" },
    { name: "GST Account", type: "GST" },
  ];

  const ledgers = {};
  for (const row of types) {
    const id = crypto.randomUUID();
    await sql`
      INSERT INTO ledger_accounts
        (id, company_id, name, type, balance)
      VALUES
        (${id}, ${companyId}, ${row.name}, ${row.type}, 0)
    `;
    ledgers[row.type] = id;
  }
  return ledgers;
}

async function seedPurchaseBill({
  companyId,
  financialYearId,
  vendorId,
  vendorLedgerId,
  purchaseLedgerId,
  facilityId,
  invoiceNumber,
  code,
  date,
  dueDate,
  notes,
  items,
  productMap,
}) {
  const computedItems = items.map((item) => {
    const product = productMap[item.productKey];
    const amount = money(item.quantity * product.purchaseRate);
    const gstAmount = money((amount * product.gstPercent) / 100);
    return {
      ...item,
      product,
      amount,
      gstPercent: product.gstPercent,
      gstAmount,
      rate: product.purchaseRate,
    };
  });

  const subtotal = money(
    computedItems.reduce((sum, item) => sum + item.amount, 0)
  );
  const taxAmount = money(
    computedItems.reduce((sum, item) => sum + item.gstAmount, 0)
  );
  const totalAmount = money(subtotal + taxAmount);
  const invoiceId = crypto.randomUUID();

  await sql`
    INSERT INTO invoices (
      id,
      company_id,
      financial_year_id,
      code,
      invoice_number,
      type,
      date,
      due_date,
      vendor_id,
      facility_id,
      subtotal,
      tax_amount,
      discount_percent,
      discount_amount,
      total_amount,
      paid_amount,
      status,
      notes
    ) VALUES (
      ${invoiceId},
      ${companyId},
      ${financialYearId},
      ${code},
      ${invoiceNumber},
      'PURCHASE',
      ${new Date(date)},
      ${new Date(dueDate)},
      ${vendorId},
      ${facilityId},
      ${subtotal},
      ${taxAmount},
      0,
      0,
      ${totalAmount},
      0,
      'UNPAID',
      ${notes}
    )
  `;

  for (const item of computedItems) {
    const itemId = crypto.randomUUID();
    await sql`
      INSERT INTO invoice_items (
        id,
        invoice_id,
        product_id,
        description,
        quantity,
        rate,
        amount,
        gst_percent,
        gst_amount,
        batch_no,
        sl_no,
        expiry_date
      ) VALUES (
        ${itemId},
        ${invoiceId},
        ${item.product.id},
        ${item.description},
        ${item.quantity},
        ${item.rate},
        ${item.amount},
        ${item.gstPercent},
        ${item.gstAmount},
        ${item.batchNo || null},
        ${item.slNo || null},
        ${item.expiryDate ? new Date(item.expiryDate) : null}
      )
    `;

    if (item.product.trackingMode === "BATCH") {
      await sql`
        INSERT INTO stock_details (
          id,
          company_id,
          facility_id,
          product_id,
          batch_no,
          expiry_date,
          quantity,
          available_qty,
          status,
          source_invoice_id,
          source_invoice_item_id
        ) VALUES (
          ${crypto.randomUUID()},
          ${companyId},
          ${facilityId},
          ${item.product.id},
          ${item.batchNo || null},
          ${item.expiryDate ? new Date(item.expiryDate) : null},
          ${item.quantity},
          ${item.quantity},
          'AVAILABLE',
          ${invoiceId},
          ${itemId}
        )
      `;
    } else if (item.product.trackingMode === "SERIAL") {
      const serials = item.slNo
        ? item.slNo.split(/[,\n]/).map((serial) => serial.trim()).filter(Boolean)
        : [];
      for (const serial of serials) {
        await sql`
          INSERT INTO stock_details (
            id,
            company_id,
            facility_id,
            product_id,
            batch_no,
            serial_no,
            expiry_date,
            quantity,
            available_qty,
            status,
            source_invoice_id,
            source_invoice_item_id
          ) VALUES (
            ${crypto.randomUUID()},
            ${companyId},
            ${facilityId},
            ${item.product.id},
            ${item.batchNo || null},
            ${serial},
            ${item.expiryDate ? new Date(item.expiryDate) : null},
            1,
            1,
            'AVAILABLE',
            ${invoiceId},
            ${itemId}
          )
        `;
      }
    }

    await sql`
      INSERT INTO stock_movements (
        id,
        company_id,
        product_id,
        facility_id,
        type,
        quantity,
        batch_no,
        reference_type,
        reference_id,
        notes
      ) VALUES (
        ${crypto.randomUUID()},
        ${companyId},
        ${item.product.id},
        ${facilityId},
        'IN',
        ${item.quantity},
        ${item.batchNo || null},
        'INVOICE',
        ${invoiceId},
        ${item.slNo ? `Serial inward ${item.slNo}` : notes}
      )
    `;

    await sql`
      UPDATE products
      SET current_stock = current_stock + ${item.quantity}
      WHERE id = ${item.product.id}
    `;

    const facilityRows = await sql`
      SELECT id FROM facility_stock
      WHERE facility_id = ${facilityId}
        AND product_id = ${item.product.id}
      LIMIT 1
    `;

    if (facilityRows.length > 0) {
      await sql`
        UPDATE facility_stock
        SET current_stock = current_stock + ${item.quantity},
            updated_at = now()
        WHERE id = ${facilityRows[0].id}
      `;
    } else {
      await sql`
        INSERT INTO facility_stock (
          id,
          company_id,
          facility_id,
          product_id,
          current_stock
        ) VALUES (
          ${crypto.randomUUID()},
          ${companyId},
          ${facilityId},
          ${item.product.id},
          ${item.quantity}
        )
      `;
    }
  }

  const vendorBalanceRows = await sql`
    SELECT balance FROM ledger_accounts WHERE id = ${vendorLedgerId}
  `;
  const purchaseBalanceRows = await sql`
    SELECT balance FROM ledger_accounts WHERE id = ${purchaseLedgerId}
  `;

  const newVendorBalance = money(vendorBalanceRows[0].balance + totalAmount);
  const newPurchaseBalance = money(
    purchaseBalanceRows[0].balance + totalAmount
  );

  await sql`
    INSERT INTO ledger_entries (
      id,
      company_id,
      financial_year_id,
      ledger_account_id,
      date,
      description,
      debit,
      credit,
      balance_after,
      reference_type,
      reference_id
    ) VALUES
      (
        ${crypto.randomUUID()},
        ${companyId},
        ${financialYearId},
        ${vendorLedgerId},
        ${new Date(date)},
        ${`Purchase Bill ${invoiceNumber}`},
        0,
        ${totalAmount},
        ${newVendorBalance},
        'INVOICE',
        ${invoiceId}
      ),
      (
        ${crypto.randomUUID()},
        ${companyId},
        ${financialYearId},
        ${purchaseLedgerId},
        ${new Date(date)},
        ${`Purchase Bill ${invoiceNumber}`},
        ${totalAmount},
        0,
        ${newPurchaseBalance},
        'INVOICE',
        ${invoiceId}
      )
  `;

  await sql`
    UPDATE ledger_accounts
    SET balance = ${newVendorBalance}
    WHERE id = ${vendorLedgerId}
  `;
  await sql`
    UPDATE ledger_accounts
    SET balance = ${newPurchaseBalance}
    WHERE id = ${purchaseLedgerId}
  `;

  return {
    invoiceId,
    invoiceNumber,
    totalAmount,
    lineCount: computedItems.length,
  };
}

async function seedSalesBill({
  companyId,
  financialYearId,
  customerId,
  customerLedgerId,
  salesLedgerId,
  facilityId,
  invoiceNumber,
  code,
  date,
  dueDate,
  notes,
  items,
  productMap,
}) {
  const computedItems = items.map((item) => {
    const product = productMap[item.productKey];
    const amount = money(item.quantity * product.sellingRate);
    const gstAmount = money((amount * product.gstPercent) / 100);
    return {
      ...item,
      product,
      amount,
      gstPercent: product.gstPercent,
      gstAmount,
      rate: product.sellingRate,
      batchAllocations: parseBatchAllocations(item.batchNo, item.quantity),
      serialNumbers: splitCsv(item.slNo),
    };
  });

  const subtotal = money(
    computedItems.reduce((sum, item) => sum + item.amount, 0)
  );
  const taxAmount = money(
    computedItems.reduce((sum, item) => sum + item.gstAmount, 0)
  );
  const totalAmount = money(subtotal + taxAmount);
  const invoiceId = crypto.randomUUID();

  await sql`
    INSERT INTO invoices (
      id,
      company_id,
      financial_year_id,
      code,
      invoice_number,
      type,
      date,
      due_date,
      customer_id,
      facility_id,
      subtotal,
      tax_amount,
      discount_percent,
      discount_amount,
      total_amount,
      paid_amount,
      status,
      notes
    ) VALUES (
      ${invoiceId},
      ${companyId},
      ${financialYearId},
      ${code},
      ${invoiceNumber},
      'SALES',
      ${new Date(date)},
      ${new Date(dueDate)},
      ${customerId},
      ${facilityId},
      ${subtotal},
      ${taxAmount},
      0,
      0,
      ${totalAmount},
      0,
      'UNPAID',
      ${notes}
    )
  `;

  for (const item of computedItems) {
    const itemId = crypto.randomUUID();
    await sql`
      INSERT INTO invoice_items (
        id,
        invoice_id,
        product_id,
        description,
        quantity,
        rate,
        amount,
        gst_percent,
        gst_amount,
        batch_no,
        sl_no,
        expiry_date
      ) VALUES (
        ${itemId},
        ${invoiceId},
        ${item.product.id},
        ${item.description},
        ${item.quantity},
        ${item.rate},
        ${item.amount},
        ${item.gstPercent},
        ${item.gstAmount},
        ${item.batchNo || null},
        ${item.slNo || null},
        ${item.expiryDate ? new Date(item.expiryDate) : null}
      )
    `;

    if (item.product.trackingMode === "BATCH") {
      for (const allocation of item.batchAllocations) {
        let remaining = allocation.quantity;
        const rows = await sql`
          SELECT id, available_qty
          FROM stock_details
          WHERE company_id = ${companyId}
            AND facility_id = ${facilityId}
            AND product_id = ${item.product.id}
            AND batch_no = ${allocation.batchNo}
            AND status = 'AVAILABLE'
          ORDER BY created_at ASC
        `;

        const available = rows.reduce(
          (sum, row) => sum + Number(row.available_qty),
          0
        );
        if (available + 0.0001 < allocation.quantity) {
          throw new Error(
            `Insufficient batch stock for ${item.product.name} in batch ${allocation.batchNo}`
          );
        }

        for (const row of rows) {
          if (remaining <= 0) break;
          const consume = Math.min(Number(row.available_qty), remaining);
          const newAvailableQty = Number(row.available_qty) - consume;

          await sql`
            UPDATE stock_details
            SET
              available_qty = ${newAvailableQty},
              status = ${newAvailableQty <= 0 ? "SOLD" : "AVAILABLE"},
              sold_invoice_id = ${newAvailableQty <= 0 ? invoiceId : null},
              updated_at = NOW()
            WHERE id = ${row.id}
          `;

          await sql`
            INSERT INTO invoice_item_allocations (
              id,
              invoice_item_id,
              stock_detail_id,
              quantity,
              created_at
            ) VALUES (
              ${crypto.randomUUID()},
              ${itemId},
              ${row.id},
              ${consume},
              NOW()
            )
          `;

          remaining -= consume;
        }
      }
    } else if (item.product.trackingMode === "SERIAL") {
      const rows = await sql`
        SELECT id, serial_no
        FROM stock_details
        WHERE company_id = ${companyId}
          AND facility_id = ${facilityId}
          AND product_id = ${item.product.id}
          AND status = 'AVAILABLE'
          AND serial_no = ANY(${sql.array(item.serialNumbers)})
      `;

      if (rows.length !== item.serialNumbers.length) {
        throw new Error(
          `Insufficient serial stock for ${item.product.name} in facility`
        );
      }

      const rowMap = new Map(rows.map((row) => [row.serial_no, row]));
      for (const serial of item.serialNumbers) {
        const row = rowMap.get(serial);
        if (!row) {
          throw new Error(`Missing serial ${serial} for ${item.product.name}`);
        }

        await sql`
          UPDATE stock_details
          SET
            available_qty = 0,
            status = 'SOLD',
            sold_invoice_id = ${invoiceId},
            updated_at = NOW()
          WHERE id = ${row.id}
        `;

        await sql`
          INSERT INTO invoice_item_allocations (
            id,
            invoice_item_id,
            stock_detail_id,
            quantity,
            created_at
          ) VALUES (
            ${crypto.randomUUID()},
            ${itemId},
            ${row.id},
            1,
            NOW()
          )
        `;
      }
    }

    await sql`
      INSERT INTO stock_movements (
        id,
        company_id,
        product_id,
        facility_id,
        type,
        quantity,
        batch_no,
        reference_type,
        reference_id,
        notes
      ) VALUES (
        ${crypto.randomUUID()},
        ${companyId},
        ${item.product.id},
        ${facilityId},
        'OUT',
        ${item.quantity},
        ${item.batchNo || null},
        'INVOICE',
        ${invoiceId},
        ${item.slNo ? `Serial outward ${item.slNo}` : notes}
      )
    `;

    await sql`
      UPDATE products
      SET current_stock = current_stock - ${item.quantity}
      WHERE id = ${item.product.id}
    `;

    const facilityRows = await sql`
      SELECT id, current_stock FROM facility_stock
      WHERE facility_id = ${facilityId}
        AND product_id = ${item.product.id}
      LIMIT 1
    `;

    if (facilityRows.length === 0 || Number(facilityRows[0].current_stock) + 0.0001 < item.quantity) {
      throw new Error(`Insufficient facility stock for ${item.product.name}`);
    }

    await sql`
      UPDATE facility_stock
      SET current_stock = current_stock - ${item.quantity},
          updated_at = NOW()
      WHERE id = ${facilityRows[0].id}
    `;
  }

  const customerBalanceRows = await sql`
    SELECT balance FROM ledger_accounts WHERE id = ${customerLedgerId}
  `;
  const salesBalanceRows = await sql`
    SELECT balance FROM ledger_accounts WHERE id = ${salesLedgerId}
  `;

  const newCustomerBalance = money(customerBalanceRows[0].balance + totalAmount);
  const newSalesBalance = money(salesBalanceRows[0].balance + totalAmount);

  await sql`
    INSERT INTO ledger_entries (
      id,
      company_id,
      financial_year_id,
      ledger_account_id,
      date,
      description,
      debit,
      credit,
      balance_after,
      reference_type,
      reference_id
    ) VALUES
      (
        ${crypto.randomUUID()},
        ${companyId},
        ${financialYearId},
        ${customerLedgerId},
        ${new Date(date)},
        ${`Sales Invoice ${invoiceNumber}`},
        ${totalAmount},
        0,
        ${newCustomerBalance},
        'INVOICE',
        ${invoiceId}
      ),
      (
        ${crypto.randomUUID()},
        ${companyId},
        ${financialYearId},
        ${salesLedgerId},
        ${new Date(date)},
        ${`Sales Invoice ${invoiceNumber}`},
        0,
        ${totalAmount},
        ${newSalesBalance},
        'INVOICE',
        ${invoiceId}
      )
  `;

  await sql`
    UPDATE ledger_accounts
    SET balance = ${newCustomerBalance}
    WHERE id = ${customerLedgerId}
  `;
  await sql`
    UPDATE ledger_accounts
    SET balance = ${newSalesBalance}
    WHERE id = ${salesLedgerId}
  `;

  return {
    invoiceId,
    invoiceNumber,
    totalAmount,
    lineCount: computedItems.length,
  };
}

async function rebuildStockDetailsFromPurchases(companyId) {
  const output = execFileSync(
    process.execPath,
    ["scripts/rebuild-stock-details.mjs", companyId],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    }
  ).trim();

  const match = output.match(/Rebuilt stock details:\s*(\d+)/);
  return match ? Number(match[1]) : 0;
}

async function main() {
  await truncateAll();

  const [org] = await sql`
    INSERT INTO organizations (id, name)
    VALUES (${crypto.randomUUID()}, 'RK & Sons Co.')
    RETURNING id, name
  `;

  const ownerPassHash = await bcrypt.hash("owner123", 10);
  const [owner] = await sql`
    INSERT INTO users (id, name, email, password_hash, phone)
    VALUES (
      ${crypto.randomUUID()},
      'RK Owner',
      'owner@rksons.in',
      ${ownerPassHash},
      '9800000000'
    )
    RETURNING id, email
  `;

  await sql`
    INSERT INTO organization_members (id, user_id, organization_id, role)
    VALUES (
      ${crypto.randomUUID()},
      ${owner.id},
      ${org.id},
      'OWNER'
    )
  `;

  const companyId = crypto.randomUUID();
  await sql`
    INSERT INTO companies (
      id,
      organization_id,
      name,
      gstin,
      pan,
      phone,
      email,
      address,
      city,
      state,
      pincode
    ) VALUES (
      ${companyId},
      ${org.id},
      ${ELECTRONICS.company.name},
      ${ELECTRONICS.company.gstin},
      ${ELECTRONICS.company.pan},
      ${ELECTRONICS.company.phone},
      ${ELECTRONICS.company.email},
      ${ELECTRONICS.company.address},
      ${ELECTRONICS.company.city},
      ${ELECTRONICS.company.state},
      ${ELECTRONICS.company.pincode}
    )
  `;

  await sql`
    INSERT INTO company_members (id, user_id, company_id, role)
    VALUES (
      ${crypto.randomUUID()},
      ${owner.id},
      ${companyId},
      'ADMIN'
    )
  `;

  const seededUsers = [];
  for (const user of ELECTRONICS.users) {
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(user.pass, 10);
    await sql`
      INSERT INTO users (id, name, email, password_hash, phone)
      VALUES (
        ${userId},
        ${user.name},
        ${user.email},
        ${passwordHash},
        ${user.phone}
      )
    `;
    await sql`
      INSERT INTO organization_members (id, user_id, organization_id, role)
      VALUES (
        ${crypto.randomUUID()},
        ${userId},
        ${org.id},
        'USER'
      )
    `;
    await sql`
      INSERT INTO company_members (id, user_id, company_id, role)
      VALUES (
        ${crypto.randomUUID()},
        ${userId},
        ${companyId},
        ${user.role}
      )
    `;
    seededUsers.push(`${user.email} / ${user.pass} (${user.role})`);
  }

  const fyStart = new Date("2025-04-01T00:00:00.000Z");
  const fyEnd = new Date("2026-03-31T23:59:59.000Z");
  const financialYearId = crypto.randomUUID();
  await sql`
    INSERT INTO financial_years (
      id,
      company_id,
      label,
      start_date,
      end_date,
      is_active
    ) VALUES (
      ${financialYearId},
      ${companyId},
      '2025-26',
      ${fyStart},
      ${fyEnd},
      true
    )
  `;

  const systemLedgers = await createSystemLedgerAccounts(companyId);

  const customerMap = {};
  for (const customer of ELECTRONICS.customers) {
    const customerId = crypto.randomUUID();
    const customerLedgerId = crypto.randomUUID();
    customerMap[customer.code] = { id: customerId, ledgerId: customerLedgerId, ...customer };

    await sql`
      INSERT INTO customers (
        id,
        company_id,
        code,
        name,
        gstin,
        phone,
        credit_limit,
        opening_balance
      ) VALUES (
        ${customerId},
        ${companyId},
        ${customer.code},
        ${customer.name},
        ${customer.gstin},
        ${customer.phone},
        ${customer.creditLimit},
        0
      )
    `;

    await sql`
      INSERT INTO customer_addresses (
        id,
        customer_id,
        label,
        line1,
        city,
        state,
        pincode,
        is_default
      ) VALUES (
        ${crypto.randomUUID()},
        ${customerId},
        ${customer.address.label},
        ${customer.address.line1},
        ${customer.address.city},
        ${customer.address.state},
        ${customer.address.pincode},
        true
      )
    `;

    await sql`
      INSERT INTO ledger_accounts (
        id,
        company_id,
        code,
        name,
        type,
        customer_id,
        balance
      ) VALUES (
        ${customerLedgerId},
        ${companyId},
        ${customer.code},
        ${customer.name},
        'CUSTOMER',
        ${customerId},
        0
      )
    `;
  }

  const vendorMap = {};
  for (const vendor of ELECTRONICS.vendors) {
    const vendorId = crypto.randomUUID();
    const vendorLedgerId = crypto.randomUUID();
    vendorMap[vendor.key] = { id: vendorId, ledgerId: vendorLedgerId, ...vendor };

    await sql`
      INSERT INTO vendors (
        id,
        company_id,
        code,
        name,
        gstin,
        phone,
        address,
        city,
        state,
        pincode,
        opening_balance
      ) VALUES (
        ${vendorId},
        ${companyId},
        ${vendor.code},
        ${vendor.name},
        ${vendor.gstin},
        ${vendor.phone},
        ${vendor.address},
        ${vendor.city},
        ${vendor.state},
        ${vendor.pincode},
        0
      )
    `;

    await sql`
      INSERT INTO ledger_accounts (
        id,
        company_id,
        code,
        name,
        type,
        vendor_id,
        balance
      ) VALUES (
        ${vendorLedgerId},
        ${companyId},
        ${vendor.code},
        ${vendor.name},
        'VENDOR',
        ${vendorId},
        0
      )
    `;
  }

  const categoryMap = {};
  for (const category of ELECTRONICS.categories) {
    const categoryId = crypto.randomUUID();
    categoryMap[category.name] = categoryId;
    await sql`
      INSERT INTO categories (
        id,
        company_id,
        name,
        description,
        is_active
      ) VALUES (
        ${categoryId},
        ${companyId},
        ${category.name},
        ${category.description},
        true
      )
    `;
  }

  const subcategoryMap = {};
  for (const subcategory of ELECTRONICS.subcategories) {
    const subcategoryId = crypto.randomUUID();
    subcategoryMap[subcategory.name] = subcategoryId;
    await sql`
      INSERT INTO subcategories (
        id,
        company_id,
        category_id,
        name,
        description,
        is_active
      ) VALUES (
        ${subcategoryId},
        ${companyId},
        ${categoryMap[subcategory.categoryName]},
        ${subcategory.name},
        ${subcategory.description},
        true
      )
    `;
  }

  const productMap = {};
  for (const product of ELECTRONICS.products) {
    const productId = crypto.randomUUID();
    productMap[product.key] = { id: productId, ...product };

    await sql`
      INSERT INTO products (
        id,
        company_id,
        code,
        name,
        description,
        hsn,
        sku,
        unit,
        tracking_mode,
        category_id,
        subcategory_id,
        gst_percent,
        purchase_rate,
        selling_rate,
        opening_stock,
        current_stock,
        reorder_level,
        is_active
      ) VALUES (
        ${productId},
        ${companyId},
        ${product.code},
        ${product.name},
        ${product.description},
        ${product.hsn},
        ${product.sku},
        ${product.unit},
        ${product.trackingMode},
        ${categoryMap[product.categoryName]},
        ${subcategoryMap[product.subcategoryName]},
        ${product.gstPercent},
        ${product.purchaseRate},
        ${product.sellingRate},
        0,
        0,
        ${product.reorderLevel},
        true
      )
    `;
  }

  const facilityMap = {};
  for (const facility of ELECTRONICS.facilities) {
    const facilityId = crypto.randomUUID();
    facilityMap[facility.key] = { id: facilityId, ...facility };
    await sql`
      INSERT INTO facilities (
        id,
        company_id,
        code,
        name,
        address,
        is_default,
        is_active
      ) VALUES (
        ${facilityId},
        ${companyId},
        ${facility.code},
        ${facility.name},
        ${facility.address},
        ${facility.isDefault},
        true
      )
    `;
  }

  const seededBills = [];
  for (const bill of ELECTRONICS.purchaseBills) {
    const seeded = await seedPurchaseBill({
      companyId,
      financialYearId,
      vendorId: vendorMap[bill.vendorKey].id,
      vendorLedgerId: vendorMap[bill.vendorKey].ledgerId,
      purchaseLedgerId: systemLedgers.PURCHASE,
      facilityId: facilityMap[bill.facilityKey].id,
      invoiceNumber: bill.invoiceNumber,
      code: bill.code,
      date: bill.date,
      dueDate: bill.dueDate,
      notes: bill.notes,
      items: bill.items,
      productMap,
    });
    seededBills.push(seeded);
  }

  const stockDetailRowsInserted = await rebuildStockDetailsFromPurchases(companyId);

  const seededSales = [];
  for (const bill of ELECTRONICS.salesBills) {
    const customer = customerMap[bill.customerCode];
    const seeded = await seedSalesBill({
      companyId,
      financialYearId,
      customerId: customer.id,
      customerLedgerId: customer.ledgerId,
      salesLedgerId: systemLedgers.SALES,
      facilityId: facilityMap[bill.facilityKey].id,
      invoiceNumber: bill.invoiceNumber,
      code: bill.code,
      date: bill.date,
      dueDate: bill.dueDate,
      notes: bill.notes,
      items: bill.items,
      productMap,
    });
    seededSales.push(seeded);
  }

  const stockSnapshot = await sql`
    SELECT
      p.name,
      p.opening_stock,
      p.current_stock
    FROM products p
    WHERE p.company_id = ${companyId}
    ORDER BY p.code
  `;

  const facilitySnapshot = await sql`
    SELECT
      f.name AS facility_name,
      p.name AS product_name,
      fs.current_stock
    FROM facility_stock fs
    JOIN facilities f ON f.id = fs.facility_id
    JOIN products p ON p.id = fs.product_id
    WHERE fs.company_id = ${companyId}
    ORDER BY f.code, p.code
  `;

  console.log("");
  console.log("Seed complete");
  console.log("-".repeat(72));
  console.log(`Organization : ${org.name}`);
  console.log(`Company      : ${ELECTRONICS.company.name}`);
  console.log(`Owner login  : ${owner.email} / owner123`);
  console.log("Team logins  :");
  for (const user of seededUsers) {
    console.log(`  - ${user}`);
  }
  console.log("-".repeat(72));
  console.log("Scenario seeded:");
  for (const product of ELECTRONICS.products) {
    console.log(`  - ${product.name}: ${product.scenario}`);
  }
  console.log("-".repeat(72));
  console.log("Historical purchase bills:");
  for (const bill of seededBills) {
    console.log(
      `  - ${bill.invoiceNumber}: ${bill.lineCount} lines, total INR ${bill.totalAmount.toLocaleString(
        "en-IN",
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      )}`
    );
  }
  console.log("-".repeat(72));
  console.log("Historical sales invoices:");
  for (const bill of seededSales) {
    console.log(
      `  - ${bill.invoiceNumber}: ${bill.lineCount} lines, total INR ${bill.totalAmount.toLocaleString(
        "en-IN",
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      )}`
    );
  }
  console.log("-".repeat(72));
  console.log("Product stock snapshot (opening stock intentionally zero):");
  for (const row of stockSnapshot) {
    console.log(
      `  - ${row.name}: opening=${row.opening_stock}, current=${row.current_stock}`
    );
  }
  console.log("-".repeat(72));
  console.log("Facility stock snapshot:");
  for (const row of facilitySnapshot) {
    console.log(
      `  - ${row.facility_name} -> ${row.product_name}: ${row.current_stock}`
    );
  }
  console.log("-".repeat(72));
  console.log(`Stock detail rows rebuilt: ${stockDetailRowsInserted}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end();
  });
