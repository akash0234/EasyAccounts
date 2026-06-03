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

const PHARMA = {
  company: {
    name: "RK Pharma Distributors",
    gstin: "19AABCR2002F1Z6",
    pan: "AABCR2002F",
    phone: "03322112222",
    email: "pharma@rksons.in",
    address: "12, Park Street",
    city: "Kolkata",
    state: "West Bengal",
    pincode: "700016",
  },
  customers: [
    {
      code: "PH-CUST-001",
      name: "City Hospital Pharmacy",
      gstin: "19AAACH1111P1Z5",
      phone: "9830066666",
      creditLimit: 200000,
      address: {
        label: "Pharmacy",
        line1: "123, Hospital Road",
        city: "Kolkata",
        state: "West Bengal",
        pincode: "700020",
      },
    },
    {
      code: "PH-CUST-002",
      name: "Green Care Clinic",
      gstin: null,
      phone: "9830077777",
      creditLimit: 50000,
      address: {
        label: "Clinic",
        line1: "88, Lake View Road",
        city: "Kolkata",
        state: "West Bengal",
        pincode: "700029",
      },
    },
  ],
  vendors: [
    {
      code: "PH-VEND-001",
      key: "cipla",
      name: "Cipla Ltd",
      gstin: "27AAACC1234N1Z8",
      phone: "02266650001",
      address: "Cipla House",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400099",
    },
    {
      code: "PH-VEND-002",
      key: "sun",
      name: "Sun Pharmaceutical Industries",
      gstin: "27AAACS1122M1Z2",
      phone: "02266650002",
      address: "Sun House",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400099",
    },
  ],
  categories: [
    { name: "Medicines", description: "Prescription and OTC medicines" },
    { name: "Surgical Supplies", description: "Consumables and supplies" },
  ],
  subcategories: [
    { name: "Tablet", categoryName: "Medicines", description: "Solid oral dose" },
    { name: "Syrup", categoryName: "Medicines", description: "Liquid oral dose" },
    { name: "Bandage", categoryName: "Surgical Supplies", description: "Dressings" },
  ],
  products: [
    {
      key: "pcm",
      code: "PH-PRD-001",
      name: "Paracetamol 500mg",
      description: "Analgesic/antipyretic tablets",
      hsn: "3004",
      sku: "PCM-500",
      unit: "PCS",
      trackingMode: "BATCH",
      categoryName: "Medicines",
      subcategoryName: "Tablet",
      gstPercent: 12,
      purchaseRate: 20,
      sellingRate: 30,
      reorderLevel: 200,
      scenario: "Batch with expiry dates and mixed allocations across lots.",
    },
    {
      key: "syrup",
      code: "PH-PRD-002",
      name: "Cough Syrup 100ml",
      description: "Antitussive syrup",
      hsn: "3004",
      sku: "CS-100",
      unit: "PCS",
      trackingMode: "BATCH",
      categoryName: "Medicines",
      subcategoryName: "Syrup",
      gstPercent: 12,
      purchaseRate: 60,
      sellingRate: 85,
      reorderLevel: 100,
      scenario: "Batch inward with expiry consumed in FIFO lots.",
    },
    {
      key: "bandage",
      code: "PH-PRD-003",
      name: "Surgical Bandage 10cm",
      description: "Cotton crepe bandage",
      hsn: "3005",
      sku: "SB-10",
      unit: "PCS",
      trackingMode: "NONE",
      categoryName: "Surgical Supplies",
      subcategoryName: "Bandage",
      gstPercent: 12,
      purchaseRate: 35,
      sellingRate: 55,
      reorderLevel: 150,
      scenario: "Plain quantity-only consumables without batch/serial.",
    },
  ],
  facilities: [
    { key: "ph-store", code: "PH-FAC-001", name: "Park Street Pharma Store", address: "12, Park Street, Kolkata", isDefault: true },
    { key: "ph-warehouse", code: "PH-FAC-002", name: "Pharma Warehouse", address: "Howrah Industrial Area", isDefault: false },
  ],
  purchaseBills: [
    {
      invoiceNumber: "BILL-P-0001",
      code: "BILL-P-SEED-0001",
      vendorKey: "cipla",
      facilityKey: "ph-store",
      date: "2025-04-10T10:00:00.000Z",
      dueDate: "2025-04-25T10:00:00.000Z",
      notes: "Initial batch medicines with expiries",
      items: [
        { productKey: "pcm", description: "Paracetamol 500mg - lot PCM-APR-A", quantity: 100, batchNo: "PCM-APR-A", expiryDate: "2026-12-31T00:00:00.000Z" },
        { productKey: "syrup", description: "Cough Syrup 100ml - lot CS-APR-A", quantity: 50, batchNo: "CS-APR-A", expiryDate: "2026-09-30T00:00:00.000Z" },
        { productKey: "bandage", description: "Surgical Bandage 10cm", quantity: 200 },
      ],
    },
    {
      invoiceNumber: "BILL-P-0002",
      code: "BILL-P-SEED-0002",
      vendorKey: "sun",
      facilityKey: "ph-store",
      date: "2025-06-15T10:00:00.000Z",
      dueDate: "2025-07-01T10:00:00.000Z",
      notes: "Replenishment lots",
      items: [
        { productKey: "pcm", description: "Paracetamol 500mg - lot PCM-JUN-B", quantity: 80, batchNo: "PCM-JUN-B", expiryDate: "2026-12-31T00:00:00.000Z" },
        { productKey: "syrup", description: "Cough Syrup 100ml - lot CS-JUN-B", quantity: 40, batchNo: "CS-JUN-B", expiryDate: "2026-10-31T00:00:00.000Z" },
      ],
    },
  ],
  salesBills: [
    {
      invoiceNumber: "INV-P-0001",
      code: "INV-P-SEED-0001",
      customerCode: "PH-CUST-001",
      facilityKey: "ph-store",
      date: "2025-09-05T12:00:00.000Z",
      dueDate: "2025-09-10T12:00:00.000Z",
      notes: "Hospital counter sale",
      items: [
        { productKey: "pcm", description: "Paracetamol 500mg", quantity: 30, batchNo: "PCM-APR-A:20, PCM-JUN-B:10" },
        { productKey: "syrup", description: "Cough Syrup 100ml", quantity: 10, batchNo: "CS-APR-A:10" },
        { productKey: "bandage", description: "Surgical Bandage 10cm", quantity: 20 },
      ],
    },
    {
      invoiceNumber: "INV-P-0002",
      code: "INV-P-SEED-0002",
      customerCode: "PH-CUST-002",
      facilityKey: "ph-store",
      date: "2025-09-12T12:00:00.000Z",
      dueDate: "2025-09-18T12:00:00.000Z",
      notes: "Clinic bulk sale",
      items: [
        { productKey: "pcm", description: "Paracetamol 500mg", quantity: 50, batchNo: "PCM-APR-A:50" },
        { productKey: "syrup", description: "Cough Syrup 100ml", quantity: 20, batchNo: "CS-JUN-B:20" },
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
  changedByUserId,
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
        notes,
        created_at
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
        ${item.slNo ? `Serial inward ${item.slNo}` : notes},
        ${new Date(date)}
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

  

  // Record status history to mirror finalize from DRAFT -> UNPAID
  await sql`
    INSERT INTO invoice_history (
      id,
      invoice_id,
      company_id,
      old_status,
      new_status,
      changed_by,
      notes
    ) VALUES (
      ${crypto.randomUUID()},
      ${invoiceId},
      ${companyId},
      'DRAFT',
      'UNPAID',
      ${changedByUserId || null},
      ${notes}
    )
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
  changedByUserId,
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
              ${new Date(date)}
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
            ${new Date(date)}
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
        notes,
        created_at
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
        ${item.slNo ? `Serial outward ${item.slNo}` : notes},
        ${new Date(date)}
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

  

  // Record status history to mirror finalize from DRAFT -> UNPAID
  await sql`
    INSERT INTO invoice_history (
      id,
      invoice_id,
      company_id,
      old_status,
      new_status,
      changed_by,
      notes
    ) VALUES (
      ${crypto.randomUUID()},
      ${invoiceId},
      ${companyId},
      'DRAFT',
      'UNPAID',
      ${changedByUserId || null},
      ${notes}
    )
  `;

  return {
    invoiceId,
    invoiceNumber,
    totalAmount,
    lineCount: computedItems.length,
  };
}

async function seedPurchaseDraft({
  companyId,
  financialYearId,
  vendorId,
  facilityId,
  invoiceNumber,
  code,
  date,
  dueDate,
  notes,
  items,
  productMap,
  changedByUserId,
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
      'DRAFT',
      ${notes}
    )
  `;

  for (const item of computedItems) {
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
        ${crypto.randomUUID()},
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
  }

  await sql`
    INSERT INTO invoice_history (
      id,
      invoice_id,
      company_id,
      old_status,
      new_status,
      changed_by,
      notes
    ) VALUES (
      ${crypto.randomUUID()},
      ${invoiceId},
      ${companyId},
      ${null},
      'DRAFT',
      ${changedByUserId || null},
      ${notes}
    )
  `;

  return { invoiceId, invoiceNumber, totalAmount, lineCount: computedItems.length };
}

async function seedSalesDraft({
  companyId,
  financialYearId,
  customerId,
  facilityId,
  invoiceNumber,
  code,
  date,
  dueDate,
  notes,
  items,
  productMap,
  changedByUserId,
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
      'DRAFT',
      ${notes}
    )
  `;

  for (const item of computedItems) {
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
        ${crypto.randomUUID()},
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
  }

  await sql`
    INSERT INTO invoice_history (
      id,
      invoice_id,
      company_id,
      old_status,
      new_status,
      changed_by,
      notes
    ) VALUES (
      ${crypto.randomUUID()},
      ${invoiceId},
      ${companyId},
      ${null},
      'DRAFT',
      ${changedByUserId || null},
      ${notes}
    )
  `;

  return { invoiceId, invoiceNumber, totalAmount, lineCount: computedItems.length };
}

// Record a sales payment (RECEIVED) against one or more sales invoices and update ledgers and invoice statuses
async function applySalesPayment({
  companyId,
  financialYearId,
  cashLedgerId,
  paymentNumber,
  date,
  method = "CASH",
  allocations, // [{ invoiceId, amount }]
}) {
  if (!allocations || allocations.length === 0) return null;

  const ids = allocations.map((a) => a.invoiceId);
  const rows = await sql`
    SELECT i.id, i.invoice_number, i.total_amount, i.paid_amount, i.customer_id, la.id AS ledger_id
    FROM invoices i
    JOIN ledger_accounts la ON la.customer_id = i.customer_id
    WHERE i.company_id = ${companyId} AND i.type = 'SALES' AND i.id = ANY(${sql.array(ids)})
  `;
  if (rows.length === 0) return null;
  const customerId = rows[0].customer_id;
  const customerLedgerId = rows[0].ledger_id;
  // Ensure same customer for all allocations
  for (const r of rows) {
    if (r.customer_id !== customerId) {
      throw new Error("applySalesPayment requires allocations for a single customer");
    }
  }

  const totalAmount = money(
    allocations.reduce((s, a) => s + Number(a.amount || 0), 0)
  );
  const paymentId = crypto.randomUUID();
  await sql`
    INSERT INTO payments (
      id, company_id, payment_number, type, date, customer_id, amount, method, reference, notes
    ) VALUES (
      ${paymentId}, ${companyId}, ${paymentNumber}, 'RECEIVED', ${new Date(date)}, ${customerId}, ${totalAmount}, ${method}, ${null}, ${"Seed payment received"}
    )
  `;

  for (const a of allocations) {
    await sql`
      INSERT INTO payment_allocations (id, payment_id, invoice_id, amount)
      VALUES (${crypto.randomUUID()}, ${paymentId}, ${a.invoiceId}, ${money(a.amount)})
    `;
  }

  // Update each invoice's paid amount and status
  for (const r of rows) {
    const alloc = allocations.find((a) => a.invoiceId === r.id);
    if (!alloc || !alloc.amount) continue;
    const newPaid = money(Number(r.paid_amount || 0) + Number(alloc.amount));
    const status = newPaid + 0.0001 >= Number(r.total_amount)
      ? 'PAID'
      : 'PARTIAL';
    await sql`
      UPDATE invoices
      SET paid_amount = ${newPaid}, status = ${status}, updated_at = NOW()
      WHERE id = ${r.id}
    `;
  }

  // Ledger impact: credit customer, debit cash
  const [{ balance: custBal }] = await sql`
    SELECT balance FROM ledger_accounts WHERE id = ${customerLedgerId}
  `;
  const newCustBal = money(Number(custBal) - totalAmount);
  await sql`
    INSERT INTO ledger_entries (
      id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type, reference_id
    ) VALUES (
      ${crypto.randomUUID()}, ${companyId}, ${financialYearId}, ${customerLedgerId}, ${new Date(date)}, ${`Payment Received ${paymentNumber}`}, 0, ${totalAmount}, ${newCustBal}, 'PAYMENT', ${paymentId}
    )
  `;
  await sql`
    UPDATE ledger_accounts SET balance = ${newCustBal} WHERE id = ${customerLedgerId}
  `;

  const [{ balance: cashBal }] = await sql`
    SELECT balance FROM ledger_accounts WHERE id = ${cashLedgerId}
  `;
  const newCashBal = money(Number(cashBal) + totalAmount);
  await sql`
    INSERT INTO ledger_entries (
      id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type, reference_id
    ) VALUES (
      ${crypto.randomUUID()}, ${companyId}, ${financialYearId}, ${cashLedgerId}, ${new Date(date)}, ${`Payment Received ${paymentNumber}`}, ${totalAmount}, 0, ${newCashBal}, 'PAYMENT', ${paymentId}
    )
  `;
  await sql`
    UPDATE ledger_accounts SET balance = ${newCashBal} WHERE id = ${cashLedgerId}
  `;

  return { paymentId, paymentNumber, totalAmount };
}

// Create a vendor advance payment (MADE) without allocations
async function createPurchaseAdvancePayment({
  companyId,
  financialYearId,
  cashLedgerId,
  vendorId,
  vendorLedgerId,
  paymentNumber,
  date,
  amount,
  method = "CASH",
}) {
  const paymentId = crypto.randomUUID();
  await sql`
    INSERT INTO payments (
      id, company_id, payment_number, type, date, vendor_id, amount, method, reference, notes
    ) VALUES (
      ${paymentId}, ${companyId}, ${paymentNumber}, 'MADE', ${new Date(date)}, ${vendorId}, ${amount}, ${method}, ${null}, ${'Seed advance payment'}
    )
  `;

  const [{ balance: vendBal }] = await sql`
    SELECT balance FROM ledger_accounts WHERE id = ${vendorLedgerId}
  `;
  const newVendBal = money(Number(vendBal) - amount);
  await sql`
    INSERT INTO ledger_entries (
      id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type, reference_id
    ) VALUES (
      ${crypto.randomUUID()}, ${companyId}, ${financialYearId}, ${vendorLedgerId}, ${new Date(date)}, ${`Payment Made ${paymentNumber}`}, ${amount}, 0, ${newVendBal}, 'PAYMENT', ${paymentId}
    )
  `;
  await sql`
    UPDATE ledger_accounts SET balance = ${newVendBal} WHERE id = ${vendorLedgerId}
  `;

  const [{ balance: cashBal }] = await sql`
    SELECT balance FROM ledger_accounts WHERE id = ${cashLedgerId}
  `;
  const newCashBal = money(Number(cashBal) - amount);
  await sql`
    INSERT INTO ledger_entries (
      id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type, reference_id
    ) VALUES (
      ${crypto.randomUUID()}, ${companyId}, ${financialYearId}, ${cashLedgerId}, ${new Date(date)}, ${`Payment Made ${paymentNumber}`}, 0, ${amount}, ${newCashBal}, 'PAYMENT', ${paymentId}
    )
  `;
  await sql`
    UPDATE ledger_accounts SET balance = ${newCashBal} WHERE id = ${cashLedgerId}
  `;

  return { paymentId, paymentNumber, amount };
}

// Record a purchase payment (MADE) against one or more purchase bills and update ledgers and invoice statuses
async function applyPurchasePayment({
  companyId,
  financialYearId,
  cashLedgerId,
  paymentNumber,
  date,
  method = "CASH",
  allocations, // [{ invoiceId, amount }]
}) {
  if (!allocations || allocations.length === 0) return null;

  const ids = allocations.map((a) => a.invoiceId);
  const rows = await sql`
    SELECT i.id, i.invoice_number, i.total_amount, i.paid_amount, i.vendor_id, la.id AS ledger_id
    FROM invoices i
    JOIN ledger_accounts la ON la.vendor_id = i.vendor_id
    WHERE i.company_id = ${companyId} AND i.type = 'PURCHASE' AND i.id = ANY(${sql.array(ids)})
  `;
  if (rows.length === 0) return null;
  const vendorId = rows[0].vendor_id;
  const vendorLedgerId = rows[0].ledger_id;
  for (const r of rows) {
    if (r.vendor_id !== vendorId) {
      throw new Error("applyPurchasePayment requires allocations for a single vendor");
    }
  }

  const totalAmount = money(
    allocations.reduce((s, a) => s + Number(a.amount || 0), 0)
  );
  const paymentId = crypto.randomUUID();
  await sql`
    INSERT INTO payments (
      id, company_id, payment_number, type, date, vendor_id, amount, method, reference, notes
    ) VALUES (
      ${paymentId}, ${companyId}, ${paymentNumber}, 'MADE', ${new Date(date)}, ${vendorId}, ${totalAmount}, ${method}, ${null}, ${"Seed payment made"}
    )
  `;

  for (const a of allocations) {
    await sql`
      INSERT INTO payment_allocations (id, payment_id, invoice_id, amount)
      VALUES (${crypto.randomUUID()}, ${paymentId}, ${a.invoiceId}, ${money(a.amount)})
    `;
  }

  // Update each invoice's paid amount and status
  for (const r of rows) {
    const alloc = allocations.find((a) => a.invoiceId === r.id);
    if (!alloc || !alloc.amount) continue;
    const newPaid = money(Number(r.paid_amount || 0) + Number(alloc.amount));
    const status = newPaid + 0.0001 >= Number(r.total_amount)
      ? 'PAID'
      : 'PARTIAL';
    await sql`
      UPDATE invoices
      SET paid_amount = ${newPaid}, status = ${status}, updated_at = NOW()
      WHERE id = ${r.id}
    `;
  }

  // Ledger impact: debit vendor, credit cash
  const [{ balance: vendBal }] = await sql`
    SELECT balance FROM ledger_accounts WHERE id = ${vendorLedgerId}
  `;
  const newVendBal = money(Number(vendBal) - totalAmount);
  await sql`
    INSERT INTO ledger_entries (
      id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type, reference_id
    ) VALUES (
      ${crypto.randomUUID()}, ${companyId}, ${financialYearId}, ${vendorLedgerId}, ${new Date(date)}, ${`Payment Made ${paymentNumber}`}, ${totalAmount}, 0, ${newVendBal}, 'PAYMENT', ${paymentId}
    )
  `;
  await sql`
    UPDATE ledger_accounts SET balance = ${newVendBal} WHERE id = ${vendorLedgerId}
  `;

  const [{ balance: cashBal }] = await sql`
    SELECT balance FROM ledger_accounts WHERE id = ${cashLedgerId}
  `;
  const newCashBal = money(Number(cashBal) - totalAmount);
  await sql`
    INSERT INTO ledger_entries (
      id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type, reference_id
    ) VALUES (
      ${crypto.randomUUID()}, ${companyId}, ${financialYearId}, ${cashLedgerId}, ${new Date(date)}, ${`Payment Made ${paymentNumber}`}, 0, ${totalAmount}, ${newCashBal}, 'PAYMENT', ${paymentId}
    )
  `;
  await sql`
    UPDATE ledger_accounts SET balance = ${newCashBal} WHERE id = ${cashLedgerId}
  `;

  return { paymentId, paymentNumber, totalAmount };
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

  await sql`
    INSERT INTO company_payment_settings (
      id, company_id, type, label, is_default, upi_id, upi_payee_name,
      bank_account_name, bank_account_number, bank_ifsc, bank_name, bank_branch,
      cheque_payee_name, instructions
    ) VALUES
      (
        ${crypto.randomUUID()}, ${companyId}, 'UPI', 'Primary UPI', true,
        'rkelectronics@okicici', 'RK Electronics',
        null, null, null, null, null,
        null, 'Preferred for quick payments'
      ),
      (
        ${crypto.randomUUID()}, ${companyId}, 'BANK', 'SBI Current', false,
        null, null,
        'RK Electronics Showroom', '32000123456', 'SBIN0001234', 'State Bank of India', 'Chowringhee Branch',
        null, 'NEFT/RTGS supported'
      ),
      (
        ${crypto.randomUUID()}, ${companyId}, 'CHEQUE', 'Cheque', false,
        null, null,
        null, null, null, null, null,
        'RK Electronics Showroom', 'Subject to realisation'
      ),
      (
        ${crypto.randomUUID()}, ${companyId}, 'CASH', 'Cash Counter', false,
        null, null,
        null, null, null, null, null,
        null, 'Pay at showroom counter'
      )
  `;

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
      changedByUserId: owner.id,
    });
    seededBills.push(seeded);
  }

  // Mark some purchase bills as PARTIAL and PAID (same vendor to satisfy allocation constraint)
  const pb1 = seededBills.find((s) => s.invoiceNumber === "BILL-0001"); // samsung
  const pb4 = seededBills.find((s) => s.invoiceNumber === "BILL-0004"); // samsung
  if (pb1) {
    await applyPurchasePayment({
      companyId,
      financialYearId,
      cashLedgerId: systemLedgers.CASH,
      paymentNumber: "PM-0001",
      date: "2025-05-01T12:00:00.000Z",
      method: "CASH",
      allocations: [{ invoiceId: pb1.invoiceId, amount: pb1.totalAmount }],
    });
  }
  if (pb4) {
    await applyPurchasePayment({
      companyId,
      financialYearId,
      cashLedgerId: systemLedgers.BANK,
      paymentNumber: "PM-0002",
      date: "2025-05-20T12:00:00.000Z",
      method: "BANK",
      allocations: [{ invoiceId: pb4.invoiceId, amount: money(pb4.totalAmount * 0.5) }],
    });
  }

  // Additional vendor payments to seed the Payments Made list and scenarios
  const pb2 = seededBills.find((s) => s.invoiceNumber === "BILL-0002"); // lg
  const pb5 = seededBills.find((s) => s.invoiceNumber === "BILL-0005"); // lg
  const pb3 = seededBills.find((s) => s.invoiceNumber === "BILL-0003"); // sony
  const pb9 = seededBills.find((s) => s.invoiceNumber === "BILL-0009"); // havells
  const pb10 = seededBills.find((s) => s.invoiceNumber === "BILL-0010"); // havells

  if (pb2 || pb5) {
    await applyPurchasePayment({
      companyId,
      financialYearId,
      cashLedgerId: systemLedgers.BANK,
      paymentNumber: "PM-0003",
      date: "2025-06-08T12:30:00.000Z",
      method: "UPI",
      allocations: [
        ...(pb2 ? [{ invoiceId: pb2.invoiceId, amount: money(pb2.totalAmount * 0.6) }] : []),
        ...(pb5 ? [{ invoiceId: pb5.invoiceId, amount: money(pb5.totalAmount * 0.5) }] : []),
      ],
    });
  }

  if (pb3) {
    await applyPurchasePayment({
      companyId,
      financialYearId,
      cashLedgerId: systemLedgers.BANK,
      paymentNumber: "PM-0004",
      date: "2025-06-20T14:00:00.000Z",
      method: "CHEQUE",
      allocations: [{ invoiceId: pb3.invoiceId, amount: pb3.totalAmount }],
    });
  }

  if (pb9 || pb10) {
    await applyPurchasePayment({
      companyId,
      financialYearId,
      cashLedgerId: systemLedgers.BANK,
      paymentNumber: "PM-0005",
      date: "2025-08-18T11:15:00.000Z",
      method: "BANK",
      allocations: [
        ...(pb9 ? [{ invoiceId: pb9.invoiceId, amount: money(pb9.totalAmount * 0.3) }] : []),
        ...(pb10 ? [{ invoiceId: pb10.invoiceId, amount: pb10.totalAmount }] : []),
      ],
    });
  }

  // Seed a vendor advance (no allocations) for LG to test advance usage in UI
  if (vendorMap.lg) {
    await createPurchaseAdvancePayment({
      companyId,
      financialYearId,
      cashLedgerId: systemLedgers.BANK,
      vendorId: vendorMap.lg.id,
      vendorLedgerId: vendorMap.lg.ledgerId,
      paymentNumber: "PM-0006",
      date: "2025-06-25T10:30:00.000Z",
      amount: 20000,
      method: "UPI",
    });
  }

  const stockDetailRowsInserted = await rebuildStockDetailsFromPurchases(companyId);

  // Also keep a few DRAFT invoices (no ledger or stock impact)
  await seedPurchaseDraft({
    companyId,
    financialYearId,
    vendorId: vendorMap.lg.id,
    facilityId: facilityMap.showroom.id,
    invoiceNumber: 'BILL-D-0001',
    code: 'BILL-DRAFT-0001',
    date: '2025-09-22T10:00:00.000Z',
    dueDate: '2025-10-07T10:00:00.000Z',
    notes: 'Draft purchase - LG accessories',
    items: [
      { productKey: 'headphones', description: 'boAt Rockerz 450 Headphones - draft', quantity: 5 },
    ],
    productMap,
    changedByUserId: owner.id,
  });
  await seedPurchaseDraft({
    companyId,
    financialYearId,
    vendorId: vendorMap.sony.id,
    facilityId: facilityMap.warehouse.id,
    invoiceNumber: 'BILL-D-0002',
    code: 'BILL-DRAFT-0002',
    date: '2025-09-25T10:00:00.000Z',
    dueDate: '2025-10-10T10:00:00.000Z',
    notes: 'Draft purchase - showroom speakers',
    items: [
      { productKey: 'speaker', description: 'JBL Go 4 Bluetooth Speaker - draft', quantity: 6 },
    ],
    productMap,
    changedByUserId: owner.id,
  });

  await seedSalesDraft({
    companyId,
    financialYearId,
    customerId: customerMap['CUST-002'].id,
    facilityId: facilityMap.showroom.id,
    invoiceNumber: 'INV-D-0001',
    code: 'INV-DRAFT-0001',
    date: '2025-09-22T12:00:00.000Z',
    dueDate: '2025-09-29T12:00:00.000Z',
    notes: 'Draft sale - single speaker',
    items: [
      { productKey: 'speaker', description: 'JBL Go 4 Bluetooth Speaker - draft', quantity: 1 },
    ],
    productMap,
    changedByUserId: owner.id,
  });
  await seedSalesDraft({
    companyId,
    financialYearId,
    customerId: customerMap['CUST-005'].id,
    facilityId: facilityMap.backstore.id,
    invoiceNumber: 'INV-D-0002',
    code: 'INV-DRAFT-0002',
    date: '2025-09-24T12:00:00.000Z',
    dueDate: '2025-10-01T12:00:00.000Z',
    notes: 'Draft sale - chargers',
    items: [
      { productKey: 'charger', description: 'Samsung 25W Charger - draft', quantity: 2 },
    ],
    productMap,
    changedByUserId: owner.id,
  });

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
      changedByUserId: owner.id,
    });
    seededSales.push(seeded);
  }

  // Create a few payments to mark some invoices as PARTIAL and PAID
  const inv1 = seededSales.find((s) => s.invoiceNumber === "INV-0001");
  const inv2 = seededSales.find((s) => s.invoiceNumber === "INV-0002");
  const inv4 = seededSales.find((s) => s.invoiceNumber === "INV-0004");
  if (inv1) {
    await applySalesPayment({
      companyId,
      financialYearId,
      cashLedgerId: systemLedgers.BANK,
      paymentNumber: "PR-0001",
      date: "2025-09-01T12:00:00.000Z",
      method: "UPI",
      allocations: [{ invoiceId: inv1.invoiceId, amount: inv1.totalAmount }],
    });
  }
  if (inv2) {
    await applySalesPayment({
      companyId,
      financialYearId,
      cashLedgerId: systemLedgers.BANK,
      paymentNumber: "PR-0002",
      date: "2025-09-07T12:00:00.000Z",
      method: "BANK",
      allocations: [{ invoiceId: inv2.invoiceId, amount: money(inv2.totalAmount * 0.6) }],
    });
  }
  if (inv4) {
    await applySalesPayment({
      companyId,
      financialYearId,
      cashLedgerId: systemLedgers.CASH,
      paymentNumber: "PR-0003",
      date: "2025-09-20T12:00:00.000Z",
      method: "CASH",
      allocations: [{ invoiceId: inv4.invoiceId, amount: inv4.totalAmount }],
    });
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

  // ===== Seed second company: PHARMA =====
  const companyId2 = crypto.randomUUID();
  await sql`
    INSERT INTO companies (
      id, organization_id, name, gstin, pan, phone, email, address, city, state, pincode
    ) VALUES (
      ${companyId2}, ${org.id}, ${PHARMA.company.name}, ${PHARMA.company.gstin}, ${PHARMA.company.pan}, ${PHARMA.company.phone}, ${PHARMA.company.email}, ${PHARMA.company.address}, ${PHARMA.company.city}, ${PHARMA.company.state}, ${PHARMA.company.pincode}
    )
  `;
  await sql`
    INSERT INTO company_members (id, user_id, company_id, role)
    VALUES (${crypto.randomUUID()}, ${owner.id}, ${companyId2}, 'ADMIN')
  `;

  const financialYearId2 = crypto.randomUUID();
  await sql`
    INSERT INTO financial_years (id, company_id, label, start_date, end_date, is_active)
    VALUES (${financialYearId2}, ${companyId2}, '2025-26', ${fyStart}, ${fyEnd}, true)
  `;

  const systemLedgers2 = await createSystemLedgerAccounts(companyId2);

  await sql`
    INSERT INTO company_payment_settings (
      id, company_id, type, label, is_default, upi_id, upi_payee_name,
      bank_account_name, bank_account_number, bank_ifsc, bank_name, bank_branch,
      cheque_payee_name, instructions
    ) VALUES
      (
        ${crypto.randomUUID()}, ${companyId2}, 'UPI', 'RK Pharma UPI', true,
        'rkpharma@okaxis', 'RK Pharma',
        null, null, null, null, null,
        null, 'Preferred for counter collections'
      ),
      (
        ${crypto.randomUUID()}, ${companyId2}, 'BANK', 'HDFC Current', false,
        null, null,
        'RK Pharma Distributors', '50100123456789', 'HDFC0000456', 'HDFC Bank', 'Park Street',
        null, 'NEFT/RTGS supported'
      ),
      (
        ${crypto.randomUUID()}, ${companyId2}, 'CHEQUE', 'Cheque', false,
        null, null,
        null, null, null, null, null,
        'RK Pharma Distributors', 'Subject to realisation'
      ),
      (
        ${crypto.randomUUID()}, ${companyId2}, 'CASH', 'Cash Counter', false,
        null, null,
        null, null, null, null, null,
        null, 'Pay at medical store counter'
      )
  `;

  const customerMap2 = {};
  for (const customer of PHARMA.customers) {
    const custId = crypto.randomUUID();
    const custLedgerId = crypto.randomUUID();
    customerMap2[customer.code] = { id: custId, ledgerId: custLedgerId };
    await sql`
      INSERT INTO customers (id, company_id, code, name, gstin, phone, credit_limit, opening_balance)
      VALUES (${custId}, ${companyId2}, ${customer.code}, ${customer.name}, ${customer.gstin}, ${customer.phone}, ${customer.creditLimit}, 0)
    `;
    await sql`
      INSERT INTO customer_addresses (id, customer_id, label, line1, city, state, pincode, is_default)
      VALUES (${crypto.randomUUID()}, ${custId}, ${customer.address.label}, ${customer.address.line1}, ${customer.address.city}, ${customer.address.state}, ${customer.address.pincode}, true)
    `;
    await sql`
      INSERT INTO ledger_accounts (id, company_id, code, name, type, customer_id, balance)
      VALUES (${custLedgerId}, ${companyId2}, ${customer.code}, ${customer.name}, 'CUSTOMER', ${custId}, 0)
    `;
  }

  const vendorMap2 = {};
  for (const vendor of PHARMA.vendors) {
    const vendId = crypto.randomUUID();
    const vendLedgerId = crypto.randomUUID();
    vendorMap2[vendor.key] = { id: vendId, ledgerId: vendLedgerId };
    await sql`
      INSERT INTO vendors (id, company_id, code, name, gstin, phone, address, city, state, pincode, opening_balance)
      VALUES (${vendId}, ${companyId2}, ${vendor.code}, ${vendor.name}, ${vendor.gstin}, ${vendor.phone}, ${vendor.address}, ${vendor.city}, ${vendor.state}, ${vendor.pincode}, 0)
    `;
    await sql`
      INSERT INTO ledger_accounts (id, company_id, code, name, type, vendor_id, balance)
      VALUES (${vendLedgerId}, ${companyId2}, ${vendor.code}, ${vendor.name}, 'VENDOR', ${vendId}, 0)
    `;
  }

  const categoryMap2 = {};
  for (const c of PHARMA.categories) {
    const id = crypto.randomUUID();
    categoryMap2[c.name] = id;
    await sql`
      INSERT INTO categories (id, company_id, name, description, is_active)
      VALUES (${id}, ${companyId2}, ${c.name}, ${c.description}, true)
    `;
  }
  const subcategoryMap2 = {};
  for (const sc of PHARMA.subcategories) {
    const id = crypto.randomUUID();
    subcategoryMap2[sc.name] = id;
    await sql`
      INSERT INTO subcategories (id, company_id, category_id, name, description, is_active)
      VALUES (${id}, ${companyId2}, ${categoryMap2[sc.categoryName]}, ${sc.name}, ${sc.description}, true)
    `;
  }

  const productMap2 = {};
  for (const p of PHARMA.products) {
    const id = crypto.randomUUID();
    productMap2[p.key] = { id, ...p };
    await sql`
      INSERT INTO products (
        id, company_id, code, name, description, hsn, sku, unit, tracking_mode, category_id, subcategory_id,
        gst_percent, purchase_rate, selling_rate, opening_stock, current_stock, reorder_level, is_active
      ) VALUES (
        ${id}, ${companyId2}, ${p.code}, ${p.name}, ${p.description}, ${p.hsn}, ${p.sku}, ${p.unit}, ${p.trackingMode}, ${categoryMap2[p.categoryName]}, ${subcategoryMap2[p.subcategoryName]},
        ${p.gstPercent}, ${p.purchaseRate}, ${p.sellingRate}, 0, 0, ${p.reorderLevel}, true
      )
    `;
  }

  const facilityMap2 = {};
  for (const f of PHARMA.facilities) {
    const id = crypto.randomUUID();
    facilityMap2[f.key] = { id };
    await sql`
      INSERT INTO facilities (id, company_id, code, name, address, is_default, is_active)
      VALUES (${id}, ${companyId2}, ${f.code}, ${f.name}, ${f.address}, ${f.isDefault}, true)
    `;
  }

  const seededBills2 = [];
  for (const bill of PHARMA.purchaseBills) {
    const seeded = await seedPurchaseBill({
      companyId: companyId2,
      financialYearId: financialYearId2,
      vendorId: vendorMap2[bill.vendorKey].id,
      vendorLedgerId: vendorMap2[bill.vendorKey].ledgerId,
      purchaseLedgerId: systemLedgers2.PURCHASE,
      facilityId: facilityMap2[bill.facilityKey].id,
      invoiceNumber: bill.invoiceNumber,
      code: bill.code,
      date: bill.date,
      dueDate: bill.dueDate,
      notes: bill.notes,
      items: bill.items,
      productMap: productMap2,
      changedByUserId: owner.id,
    });
    seededBills2.push(seeded);
  }

  const pbp1 = seededBills2.find((s) => s.invoiceNumber === 'BILL-P-0001');
  const pbp2 = seededBills2.find((s) => s.invoiceNumber === 'BILL-P-0002');
  if (pbp1) {
    await applyPurchasePayment({
      companyId: companyId2,
      financialYearId: financialYearId2,
      cashLedgerId: systemLedgers2.BANK,
      paymentNumber: 'PM-P-0001',
      date: '2025-04-28T12:00:00.000Z',
      method: 'CHEQUE',
      allocations: [{ invoiceId: pbp1.invoiceId, amount: money(pbp1.totalAmount * 0.5) }],
    });
  }
  if (pbp2) {
    await applyPurchasePayment({
      companyId: companyId2,
      financialYearId: financialYearId2,
      cashLedgerId: systemLedgers2.BANK,
      paymentNumber: 'PM-P-0002',
      date: '2025-07-02T12:00:00.000Z',
      method: 'BANK',
      allocations: [{ invoiceId: pbp2.invoiceId, amount: pbp2.totalAmount }],
    });
  }

  const stockDetailRowsInserted2 = await rebuildStockDetailsFromPurchases(companyId2);

  // Also keep a few DRAFT invoices for Pharma
  await seedPurchaseDraft({
    companyId: companyId2,
    financialYearId: financialYearId2,
    vendorId: vendorMap2.cipla.id,
    facilityId: facilityMap2['ph-store'].id,
    invoiceNumber: 'BILL-P-D-0001',
    code: 'BILL-P-DRAFT-0001',
    date: '2025-09-20T10:00:00.000Z',
    dueDate: '2025-10-05T10:00:00.000Z',
    notes: 'Draft purchase - bandages',
    items: [
      { productKey: 'bandage', description: 'Surgical Bandage 10cm - draft', quantity: 30 },
    ],
    productMap: productMap2,
    changedByUserId: owner.id,
  });

  await seedSalesDraft({
    companyId: companyId2,
    financialYearId: financialYearId2,
    customerId: customerMap2['PH-CUST-002'].id,
    facilityId: facilityMap2['ph-store'].id,
    invoiceNumber: 'INV-P-D-0001',
    code: 'INV-P-DRAFT-0001',
    date: '2025-09-22T12:00:00.000Z',
    dueDate: '2025-09-30T12:00:00.000Z',
    notes: 'Draft sale - tablets',
    items: [
      { productKey: 'pcm', description: 'Paracetamol 500mg - draft', quantity: 10 },
    ],
    productMap: productMap2,
    changedByUserId: owner.id,
  });

  const seededSales2 = [];
  for (const bill of PHARMA.salesBills) {
    const customer = customerMap2[bill.customerCode];
    const seeded = await seedSalesBill({
      companyId: companyId2,
      financialYearId: financialYearId2,
      customerId: customer.id,
      customerLedgerId: customer.ledgerId,
      salesLedgerId: systemLedgers2.SALES,
      facilityId: facilityMap2[bill.facilityKey].id,
      invoiceNumber: bill.invoiceNumber,
      code: bill.code,
      date: bill.date,
      dueDate: bill.dueDate,
      notes: bill.notes,
      items: bill.items,
      productMap: productMap2,
      changedByUserId: owner.id,
    });
    seededSales2.push(seeded);
  }

  const pinv1 = seededSales2.find((s) => s.invoiceNumber === 'INV-P-0001');
  const pinv2 = seededSales2.find((s) => s.invoiceNumber === 'INV-P-0002');
  if (pinv1) {
    await applySalesPayment({
      companyId: companyId2,
      financialYearId: financialYearId2,
      cashLedgerId: systemLedgers2.CASH,
      paymentNumber: 'PR-P-0001',
      date: '2025-09-06T12:00:00.000Z',
      method: 'CASH',
      allocations: [{ invoiceId: pinv1.invoiceId, amount: pinv1.totalAmount }],
    });
  }
  if (pinv2) {
    await applySalesPayment({
      companyId: companyId2,
      financialYearId: financialYearId2,
      cashLedgerId: systemLedgers2.BANK,
      paymentNumber: 'PR-P-0002',
      date: '2025-09-15T12:00:00.000Z',
      method: 'UPI',
      allocations: [{ invoiceId: pinv2.invoiceId, amount: money(pinv2.totalAmount * 0.5) }],
    });
  }

  const stockSnapshot2 = await sql`
    SELECT p.name, p.opening_stock, p.current_stock
    FROM products p
    WHERE p.company_id = ${companyId2}
    ORDER BY p.code
  `;
  const facilitySnapshot2 = await sql`
    SELECT f.name AS facility_name, p.name AS product_name, fs.current_stock
    FROM facility_stock fs
    JOIN facilities f ON f.id = fs.facility_id
    JOIN products p ON p.id = fs.product_id
    WHERE fs.company_id = ${companyId2}
    ORDER BY f.code, p.code
  `;

  console.log("");
  console.log("Seed complete");
  console.log("-".repeat(72));
  console.log(`Organization : ${org.name}`);
  console.log(`Owner login  : ${owner.email} / owner123`);
  console.log("-".repeat(72));
  console.log(`Company A    : ${ELECTRONICS.company.name}`);
  console.log("Team logins  :");
  for (const user of seededUsers) console.log(`  - ${user}`);
  console.log("Scenario seeded (Electronics):");
  for (const product of ELECTRONICS.products) console.log(`  - ${product.name}: ${product.scenario}`);
  console.log("Historical purchase bills (Electronics):");
  for (const bill of seededBills) console.log(`  - ${bill.invoiceNumber}: ${bill.lineCount} lines, total INR ${bill.totalAmount.toLocaleString('en-IN',{ minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log("Historical sales invoices (Electronics):");
  for (const bill of seededSales) console.log(`  - ${bill.invoiceNumber}: ${bill.lineCount} lines, total INR ${bill.totalAmount.toLocaleString('en-IN',{ minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log("Product stock snapshot (Electronics):");
  for (const row of stockSnapshot) console.log(`  - ${row.name}: opening=${row.opening_stock}, current=${row.current_stock}`);
  console.log("Facility stock snapshot (Electronics):");
  for (const row of facilitySnapshot) console.log(`  - ${row.facility_name} -> ${row.product_name}: ${row.current_stock}`);
  console.log(`Stock detail rows rebuilt (Electronics): ${stockDetailRowsInserted}`);
  console.log("-".repeat(72));
  console.log(`Company B    : ${PHARMA.company.name}`);
  console.log("Scenario seeded (Pharma):");
  for (const product of PHARMA.products) console.log(`  - ${product.name}: ${product.scenario}`);
  console.log("Historical purchase bills (Pharma):");
  for (const bill of seededBills2) console.log(`  - ${bill.invoiceNumber}: ${bill.lineCount} lines, total INR ${bill.totalAmount.toLocaleString('en-IN',{ minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log("Historical sales invoices (Pharma):");
  for (const bill of seededSales2) console.log(`  - ${bill.invoiceNumber}: ${bill.lineCount} lines, total INR ${bill.totalAmount.toLocaleString('en-IN',{ minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log("Product stock snapshot (Pharma):");
  for (const row of stockSnapshot2) console.log(`  - ${row.name}: opening=${row.opening_stock}, current=${row.current_stock}`);
  console.log("Facility stock snapshot (Pharma):");
  for (const row of facilitySnapshot2) console.log(`  - ${row.facility_name} -> ${row.product_name}: ${row.current_stock}`);
  console.log(`Stock detail rows rebuilt (Pharma): ${stockDetailRowsInserted2}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end();
  });
