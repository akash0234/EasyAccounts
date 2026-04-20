import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
import bcrypt from "bcryptjs";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

// ── Clean existing data ──
await sql`TRUNCATE facility_stock, stock_movements, payment_allocations, invoice_items, invoices, ledger_entries, ledger_accounts, products, subcategories, categories, payments, vendors, customers, facilities, financial_years, company_members, companies, users CASCADE`;

// ── 1. Users ──
const adminPassHash = await bcrypt.hash("admin123", 10);
const userPassHash = await bcrypt.hash("user123", 10);

const [admin] = await sql`INSERT INTO users (id, name, email, password_hash, phone) VALUES (gen_random_uuid(), 'Amitava (Admin)', 'admin@pharmaretail.in', ${adminPassHash}, '9876543210') RETURNING id`;
const [staff] = await sql`INSERT INTO users (id, name, email, password_hash, phone) VALUES (gen_random_uuid(), 'Staff User', 'staff@pharmaretail.in', ${userPassHash}, '9876500000') RETURNING id`;

// ── 2. Company ──
const [company] = await sql`INSERT INTO companies (id, name, gstin, pan, phone, email, address, city, state, pincode) VALUES (gen_random_uuid(), 'Sunrise Pharma Distributors', '19AABCS1429B1ZS', 'AABCS1429B', '03322001234', 'sunrise@pharmacy.in', '12/A, College Street', 'Kolkata', 'West Bengal', '700012') RETURNING id`;

// ── 3. Company Members ──
await sql`INSERT INTO company_members (id, user_id, company_id, role) VALUES (gen_random_uuid(), ${admin.id}, ${company.id}, 'ADMIN')`;
await sql`INSERT INTO company_members (id, user_id, company_id, role) VALUES (gen_random_uuid(), ${staff.id}, ${company.id}, 'USER')`;

// ── 4. Financial Year ──
const fyStart = new Date(2025, 3, 1);
const fyEnd = new Date(2026, 2, 31, 23, 59, 59);
const [fy] = await sql`INSERT INTO financial_years (id, company_id, label, start_date, end_date, is_active) VALUES (gen_random_uuid(), ${company.id}, '2025-26', ${fyStart}, ${fyEnd}, true) RETURNING id`;

// ── 5. Ledger Accounts (system) ──
const sysAccounts = [
  { name: "Cash Account", type: "CASH" },
  { name: "Bank Account", type: "BANK" },
  { name: "Sales Account", type: "SALES" },
  { name: "Purchase Account", type: "PURCHASE" },
  { name: "GST Account", type: "GST" },
];
const ledgers = {};
for (const a of sysAccounts) {
  const [row] = await sql`INSERT INTO ledger_accounts (id, company_id, name, type) VALUES (gen_random_uuid(), ${company.id}, ${a.name}, ${a.type}) RETURNING id`;
  ledgers[a.type] = row.id;
}

// ── 6. Customers ──
const customersData = [
  { name: "Raj Medical Store", gstin: "19AABCR9876B1Z5", phone: "9830012345", billing_address: "45, MG Road", city: "Kolkata", state: "West Bengal", pincode: "700007", credit_limit: 50000, opening_balance: 12500 },
  { name: "Shree Health Point", gstin: "19BBDCS5432A1ZX", phone: "9831054321", billing_address: "78, Park Street", city: "Kolkata", state: "West Bengal", pincode: "700016", credit_limit: 100000, opening_balance: 0 },
  { name: "New Life Chemist", gstin: null, phone: "9832098765", billing_address: "22, Gariahat Road", city: "Kolkata", state: "West Bengal", pincode: "700029", credit_limit: 25000, opening_balance: 5000 },
];
const customers = [];
for (let i = 0; i < customersData.length; i++) {
  const c = customersData[i];
  const code = `CUST-${String(i + 1).padStart(3, "0")}`;
  const [row] = await sql`INSERT INTO customers (id, company_id, code, name, gstin, phone, billing_address, city, state, pincode, credit_limit, opening_balance) VALUES (gen_random_uuid(), ${company.id}, ${code}, ${c.name}, ${c.gstin}, ${c.phone}, ${c.billing_address}, ${c.city}, ${c.state}, ${c.pincode}, ${c.credit_limit}, ${c.opening_balance}) RETURNING id, name`;
  // Customer ledger account
  const [la] = await sql`INSERT INTO ledger_accounts (id, company_id, code, name, type, customer_id, balance) VALUES (gen_random_uuid(), ${company.id}, ${code}, ${c.name}, 'CUSTOMER', ${row.id}, ${c.opening_balance}) RETURNING id`;
  customers.push({ ...row, ledgerId: la.id, opening_balance: c.opening_balance });
}

// ── 7. Vendors ──
const vendorsData = [
  { name: "Sun Pharmaceutical", gstin: "27AADCS0472N1ZY", phone: "02228888888", address: "Sun House, Andheri", city: "Mumbai", state: "Maharashtra", pincode: "400053", opening_balance: 0 },
  { name: "Cipla Limited", gstin: "27AABCC7895M1Z4", phone: "02226826826", address: "Mumbai Central", city: "Mumbai", state: "Maharashtra", pincode: "400008", opening_balance: 18000 },
  { name: "Intas Pharma", gstin: "24AABCI1234P1ZQ", phone: "07926580461", address: "SG Highway", city: "Ahmedabad", state: "Gujarat", pincode: "380054", opening_balance: 0 },
];
const vendors = [];
for (let i = 0; i < vendorsData.length; i++) {
  const v = vendorsData[i];
  const code = `VEND-${String(i + 1).padStart(3, "0")}`;
  const [row] = await sql`INSERT INTO vendors (id, company_id, code, name, gstin, phone, address, city, state, pincode, opening_balance) VALUES (gen_random_uuid(), ${company.id}, ${code}, ${v.name}, ${v.gstin}, ${v.phone}, ${v.address}, ${v.city}, ${v.state}, ${v.pincode}, ${v.opening_balance}) RETURNING id, name`;
  const balance = v.opening_balance > 0 ? -v.opening_balance : 0;
  const [la] = await sql`INSERT INTO ledger_accounts (id, company_id, code, name, type, vendor_id, balance) VALUES (gen_random_uuid(), ${company.id}, ${code}, ${v.name}, 'VENDOR', ${row.id}, ${balance}) RETURNING id`;
  vendors.push({ ...row, ledgerId: la.id, opening_balance: v.opening_balance });
}

// ── 8. Products ──
// ── Categories & Subcategories ──
const categoriesData = [
  {
    name: "Oral Dosage Forms",
    description: "Medicines taken by mouth",
    subcategories: [
      { name: "Tablets", description: "Solid oral dosage - compressed tablets" },
      { name: "Capsules", description: "Gelatin-enclosed oral dosage" },
      { name: "Syrups", description: "Liquid oral preparations" },
      { name: "Sachets", description: "Powder/granule sachets for oral use" },
      { name: "Drops", description: "Oral drops and solutions" },
    ],
  },
  {
    name: "Topical & External",
    description: "Applied on skin or external surfaces",
    subcategories: [
      { name: "Ointments", description: "Semi-solid topical preparations" },
      { name: "Creams", description: "Topical cream formulations" },
      { name: "Gels", description: "Topical gel formulations" },
      { name: "Lotions", description: "Liquid topical preparations" },
      { name: "Sprays", description: "Topical spray formulations" },
    ],
  },
  {
    name: "Injectables",
    description: "Parenteral preparations for injection",
    subcategories: [
      { name: "Vials", description: "Single/multi-dose injection vials" },
      { name: "Ampoules", description: "Single-dose sealed glass ampoules" },
      { name: "Pre-filled Syringes", description: "Ready-to-use injection syringes" },
      { name: "IV Fluids", description: "Intravenous fluid bottles/bags" },
    ],
  },
  {
    name: "Medical Devices & Consumables",
    description: "Non-drug healthcare products",
    subcategories: [
      { name: "Surgical Consumables", description: "Gloves, masks, gauze, bandages" },
      { name: "Diagnostic Devices", description: "Thermometers, BP monitors, glucometers" },
      { name: "Syringes & Needles", description: "Disposable syringes and needles" },
      { name: "Orthopaedic Aids", description: "Braces, supports, crepe bandages" },
    ],
  },
  {
    name: "Hygiene & Personal Care",
    description: "OTC hygiene and wellness products",
    subcategories: [
      { name: "Sanitizers", description: "Hand and surface sanitizers" },
      { name: "Oral Care", description: "Toothpaste, mouthwash, dental products" },
      { name: "Skin Care", description: "Moisturizers, sunscreen, lip balm" },
      { name: "Baby Care", description: "Diapers, wipes, baby skincare" },
    ],
  },
  {
    name: "Ayurvedic & Herbal",
    description: "Traditional and herbal medicine products",
    subcategories: [
      { name: "Churna & Powder", description: "Herbal powders and churnas" },
      { name: "Kwath & Decoctions", description: "Herbal liquid preparations" },
      { name: "Herbal Tablets", description: "Ayurvedic/herbal tablet formulations" },
      { name: "Herbal Oils", description: "Therapeutic herbal oils" },
    ],
  },
  {
    name: "Nutraceuticals & Supplements",
    description: "Health supplements and vitamins",
    subcategories: [
      { name: "Vitamins & Minerals", description: "Vitamin/mineral supplements" },
      { name: "Protein Supplements", description: "Protein powders and drinks" },
      { name: "Probiotics", description: "Probiotic and gut health supplements" },
      { name: "Health Drinks", description: "Nutritional health beverages" },
    ],
  },
  {
    name: "Ophthalmic & ENT",
    description: "Eye, ear, nose and throat preparations",
    subcategories: [
      { name: "Eye Drops", description: "Ophthalmic solutions and suspensions" },
      { name: "Ear Drops", description: "Otic preparations" },
      { name: "Nasal Sprays", description: "Nasal spray and drop formulations" },
    ],
  },
];

const categoryMap = {}; // name -> id
const subcategoryMap = {}; // name -> id
for (const cat of categoriesData) {
  const [row] = await sql`INSERT INTO categories (id, company_id, name, description) VALUES (gen_random_uuid(), ${company.id}, ${cat.name}, ${cat.description}) RETURNING id`;
  categoryMap[cat.name] = row.id;
  for (const sub of cat.subcategories) {
    const [srow] = await sql`INSERT INTO subcategories (id, company_id, category_id, name, description) VALUES (gen_random_uuid(), ${company.id}, ${row.id}, ${sub.name}, ${sub.description}) RETURNING id`;
    subcategoryMap[sub.name] = srow.id;
  }
}

// ── Products ──
const productsData = [
  { name: "Paracetamol 500mg", desc: "Strip of 10 tablets", hsn: "3004", sku: "PARA-500", unit: "STRIP", catName: "Oral Dosage Forms", subName: "Tablets", gst: 12, purchase: 18.5, selling: 25, stock: 500, reorder: 100 },
  { name: "Amoxicillin 250mg", desc: "Strip of 10 capsules", hsn: "3004", sku: "AMOX-250", unit: "STRIP", catName: "Oral Dosage Forms", subName: "Capsules", gst: 12, purchase: 42, selling: 65, stock: 300, reorder: 50 },
  { name: "Cough Syrup 100ml", desc: "Bottle 100ml", hsn: "3004", sku: "COSY-100", unit: "BOTTLE", catName: "Oral Dosage Forms", subName: "Syrups", gst: 12, purchase: 55, selling: 85, stock: 200, reorder: 40 },
  { name: "Betadine Ointment", desc: "Tube 20g", hsn: "3004", sku: "BETA-20", unit: "TUBE", catName: "Topical & External", subName: "Ointments", gst: 18, purchase: 38, selling: 58, stock: 150, reorder: 30 },
  { name: "Insulin Vial 10ml", desc: "Refrigerated vial", hsn: "3004", sku: "INS-10", unit: "VIAL", catName: "Injectables", subName: "Vials", gst: 5, purchase: 320, selling: 450, stock: 50, reorder: 10 },
  { name: "Surgical Gloves", desc: "Box of 100, medium", hsn: "4015", sku: "GLOVE-M", unit: "BOX", catName: "Medical Devices & Consumables", subName: "Surgical Consumables", gst: 18, purchase: 280, selling: 380, stock: 80, reorder: 20 },
  { name: "ORS Sachets", desc: "Pack of 10 sachets", hsn: "3004", sku: "ORS-10", unit: "PCS", catName: "Oral Dosage Forms", subName: "Sachets", gst: 12, purchase: 8, selling: 15, stock: 1000, reorder: 200 },
  { name: "Hand Sanitizer 500ml", desc: "Bottle pump 500ml", hsn: "3808", sku: "HSANI-500", unit: "BOTTLE", catName: "Hygiene & Personal Care", subName: "Sanitizers", gst: 18, purchase: 95, selling: 145, stock: 120, reorder: 25 },
];
const products = [];
for (let i = 0; i < productsData.length; i++) {
  const p = productsData[i];
  const code = `PRD-${String(i + 1).padStart(3, "0")}`;
  const catId = categoryMap[p.catName] || null;
  const subId = subcategoryMap[p.subName] || null;
  const [row] = await sql`INSERT INTO products (id, company_id, code, name, description, hsn, sku, unit, category_id, subcategory_id, gst_percent, purchase_rate, selling_rate, opening_stock, current_stock, reorder_level, is_active) VALUES (gen_random_uuid(), ${company.id}, ${code}, ${p.name}, ${p.desc}, ${p.hsn}, ${p.sku}, ${p.unit}, ${catId}, ${subId}, ${p.gst}, ${p.purchase}, ${p.selling}, ${p.stock}, ${p.stock}, ${p.reorder}, true) RETURNING id, name`;
  products.push(row);
}

// ── 8b. Facilities ──
const facilitiesData = [
  { name: "Main Godown", address: "12/A, College Street, Kolkata", isDefault: true },
  { name: "Cold Storage", address: "45, Salt Lake Sector V, Kolkata", isDefault: false },
  { name: "Shop Floor", address: "12/A, College Street (Ground Floor), Kolkata", isDefault: false },
];
const facilityRows = [];
for (let i = 0; i < facilitiesData.length; i++) {
  const f = facilitiesData[i];
  const code = `FAC-${String(i + 1).padStart(3, "0")}`;
  const [row] = await sql`INSERT INTO facilities (id, company_id, code, name, address, is_default, is_active) VALUES (gen_random_uuid(), ${company.id}, ${code}, ${f.name}, ${f.address}, ${f.isDefault}, true) RETURNING id, name`;
  facilityRows.push(row);
}

// ── 8c. Facility Stock (initial distribution) ──
// Distribute product stock across facilities: Main Godown 60%, Cold Storage 25%, Shop Floor 15%
const stockSplits = [0.6, 0.25, 0.15];
for (const p of products) {
  const prod = productsData.find(pd => pd.name === p.name);
  if (!prod) continue;
  for (let fi = 0; fi < facilityRows.length; fi++) {
    const qty = Math.round(prod.stock * stockSplits[fi]);
    if (qty <= 0) continue;
    await sql`INSERT INTO facility_stock (id, company_id, facility_id, product_id, current_stock) VALUES (gen_random_uuid(), ${company.id}, ${facilityRows[fi].id}, ${p.id}, ${qty})`;
  }
}

// ── 9. Opening Balance Ledger Entries ──
for (const c of customers) {
  if (c.opening_balance > 0) {
    await sql`INSERT INTO ledger_entries (id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type) VALUES (gen_random_uuid(), ${company.id}, ${fy.id}, ${c.ledgerId}, ${fyStart}, ${"Opening Balance — " + c.name}, ${c.opening_balance}, 0, ${c.opening_balance}, 'OPENING_BALANCE')`;
  }
}
for (const v of vendors) {
  if (v.opening_balance > 0) {
    await sql`INSERT INTO ledger_entries (id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type) VALUES (gen_random_uuid(), ${company.id}, ${fy.id}, ${v.ledgerId}, ${fyStart}, ${"Opening Balance — " + v.name}, 0, ${v.opening_balance}, ${-v.opening_balance}, 'OPENING_BALANCE')`;
  }
}

// ── Opening balances for Cash & Bank ──
await sql`INSERT INTO ledger_entries (id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type) VALUES (gen_random_uuid(), ${company.id}, ${fy.id}, ${ledgers.CASH}, ${fyStart}, 'Opening Balance — Cash', 50000, 0, 50000, 'OPENING_BALANCE')`;
await sql`INSERT INTO ledger_entries (id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type) VALUES (gen_random_uuid(), ${company.id}, ${fy.id}, ${ledgers.BANK}, ${fyStart}, 'Opening Balance — Bank', 200000, 0, 200000, 'OPENING_BALANCE')`;

// ── 10. Sales Invoices ──
const salesInvoices = [
  {
    number: "INV-2025-001", date: new Date(2025, 5, 10), due: new Date(2025, 6, 10),
    customerIdx: 0, facilityIdx: 2, subtotal: 5000, tax: 600, total: 5600, paid: 5600, status: "PAID",
    notes: "First sale to Raj Medical",
    items: [
      { desc: "Paracetamol 500mg", productIdx: 0, qty: 100, rate: 25, amount: 2500, gst: 12, gstAmt: 300, batchNo: "SP-PARA-2025-A", slNo: null, expiry: new Date(2027, 3, 30) },
      { desc: "Cough Syrup 100ml", productIdx: 2, qty: 20, rate: 85, amount: 1700, gst: 12, gstAmt: 204, batchNo: "SP-COSY-2025-B", slNo: null, expiry: new Date(2026, 11, 31) },
      { desc: "ORS Sachets", productIdx: 6, qty: 100, rate: 8, amount: 800, gst: 12, gstAmt: 96, batchNo: "SP-ORS-2025-C", slNo: null, expiry: new Date(2027, 5, 30) },
    ],
  },
  {
    number: "INV-2025-002", date: new Date(2025, 6, 15), due: new Date(2025, 7, 15),
    customerIdx: 1, facilityIdx: 0, subtotal: 12000, tax: 1440, total: 13440, paid: 6000, status: "PARTIAL",
    notes: "Bulk order — Shree Health Point",
    items: [
      { desc: "Amoxicillin 250mg", productIdx: 1, qty: 100, rate: 65, amount: 6500, gst: 12, gstAmt: 780, batchNo: "CIP-AMOX-2025-D", slNo: "SL-002", expiry: new Date(2027, 6, 31) },
      { desc: "Betadine Ointment", productIdx: 3, qty: 50, rate: 58, amount: 2900, gst: 18, gstAmt: 522, batchNo: "CIP-BETA-2025-E", slNo: null, expiry: new Date(2026, 8, 30) },
      { desc: "Surgical Gloves", productIdx: 5, qty: 10, rate: 380, amount: 3800, gst: 18, gstAmt: 684, batchNo: "GLV-MED-2025-F", slNo: null, expiry: new Date(2028, 2, 28) },
    ],
  },
  {
    number: "INV-2025-003", date: new Date(2025, 8, 1), due: new Date(2025, 9, 1),
    customerIdx: 2, facilityIdx: 2, subtotal: 2200, tax: 264, total: 2464, paid: 0, status: "UNPAID",
    notes: "New Life Chemist order",
    items: [
      { desc: "Paracetamol 500mg", productIdx: 0, qty: 40, rate: 25, amount: 1000, gst: 12, gstAmt: 120, batchNo: "SP-PARA-2025-A", slNo: null, expiry: new Date(2027, 3, 30) },
      { desc: "Hand Sanitizer 500ml", productIdx: 7, qty: 8, rate: 145, amount: 1160, gst: 18, gstAmt: 208.80, batchNo: "HSANI-2025-G", slNo: null, expiry: new Date(2027, 0, 31) },
    ],
  },
];

const savedSalesInvoices = [];
for (const inv of salesInvoices) {
  const cust = customers[inv.customerIdx];
  const fac = facilityRows[inv.facilityIdx];
  const [row] = await sql`INSERT INTO invoices (id, company_id, financial_year_id, invoice_number, type, date, due_date, customer_id, facility_id, subtotal, tax_amount, total_amount, paid_amount, status, notes) VALUES (gen_random_uuid(), ${company.id}, ${fy.id}, ${inv.number}, 'SALES', ${inv.date}, ${inv.due}, ${cust.id}, ${fac.id}, ${inv.subtotal}, ${inv.tax}, ${inv.total}, ${inv.paid}, ${inv.status}, ${inv.notes}) RETURNING id`;
  savedSalesInvoices.push(row);
  for (const item of inv.items) {
    const prodId = products[item.productIdx]?.id || null;
    await sql`INSERT INTO invoice_items (id, invoice_id, product_id, description, quantity, rate, amount, gst_percent, gst_amount, batch_no, sl_no, expiry_date) VALUES (gen_random_uuid(), ${row.id}, ${prodId}, ${item.desc}, ${item.qty}, ${item.rate}, ${item.amount}, ${item.gst}, ${item.gstAmt}, ${item.batchNo}, ${item.slNo}, ${item.expiry})`;
  }
  // Ledger: debit customer, credit sales, credit GST
  await sql`INSERT INTO ledger_entries (id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type, reference_id) VALUES (gen_random_uuid(), ${company.id}, ${fy.id}, ${cust.ledgerId}, ${inv.date}, ${"Sales Invoice " + inv.number}, ${inv.total}, 0, 0, 'INVOICE', ${row.id})`;
  await sql`INSERT INTO ledger_entries (id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type, reference_id) VALUES (gen_random_uuid(), ${company.id}, ${fy.id}, ${ledgers.SALES}, ${inv.date}, ${"Sales Invoice " + inv.number}, 0, ${inv.subtotal}, 0, 'INVOICE', ${row.id})`;
  await sql`INSERT INTO ledger_entries (id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type, reference_id) VALUES (gen_random_uuid(), ${company.id}, ${fy.id}, ${ledgers.GST}, ${inv.date}, ${"GST on " + inv.number}, 0, ${inv.tax}, 0, 'INVOICE', ${row.id})`;
}

// ── 11. Purchase Invoices ──
const purchaseInvoices = [
  {
    number: "BILL-2025-001", date: new Date(2025, 4, 20), due: new Date(2025, 5, 20),
    vendorIdx: 0, facilityIdx: 0, subtotal: 25000, tax: 3000, total: 28000, paid: 28000, status: "PAID",
    notes: "Sun Pharma bulk purchase",
    items: [
      { desc: "Paracetamol 500mg", productIdx: 0, qty: 500, rate: 18.5, amount: 9250, gst: 12, gstAmt: 1110, batchNo: "SP-PARA-2025-A", slNo: null, expiry: new Date(2027, 3, 30) },
      { desc: "Cough Syrup 100ml", productIdx: 2, qty: 200, rate: 55, amount: 11000, gst: 12, gstAmt: 1320, batchNo: "SP-COSY-2025-B", slNo: null, expiry: new Date(2026, 11, 31) },
      { desc: "ORS Sachets", productIdx: 6, qty: 1000, rate: 8, amount: 8000, gst: 12, gstAmt: 960, batchNo: "SP-ORS-2025-C", slNo: null, expiry: new Date(2027, 5, 30) },
    ],
  },
  {
    number: "BILL-2025-002", date: new Date(2025, 7, 5), due: new Date(2025, 8, 5),
    vendorIdx: 1, facilityIdx: 1, subtotal: 15000, tax: 1800, total: 16800, paid: 0, status: "UNPAID",
    notes: "Cipla monthly stock",
    items: [
      { desc: "Amoxicillin 250mg", productIdx: 1, qty: 200, rate: 42, amount: 8400, gst: 12, gstAmt: 1008, batchNo: "CIP-AMOX-2025-D", slNo: "SL-001", expiry: new Date(2027, 6, 31) },
      { desc: "Betadine Ointment", productIdx: 3, qty: 100, rate: 38, amount: 3800, gst: 18, gstAmt: 684, batchNo: "CIP-BETA-2025-E", slNo: null, expiry: new Date(2026, 8, 30) },
    ],
  },
];

const savedPurchaseInvoices = [];
for (const inv of purchaseInvoices) {
  const vend = vendors[inv.vendorIdx];
  const fac = facilityRows[inv.facilityIdx];
  const [row] = await sql`INSERT INTO invoices (id, company_id, financial_year_id, invoice_number, type, date, due_date, vendor_id, facility_id, subtotal, tax_amount, total_amount, paid_amount, status, notes) VALUES (gen_random_uuid(), ${company.id}, ${fy.id}, ${inv.number}, 'PURCHASE', ${inv.date}, ${inv.due}, ${vend.id}, ${fac.id}, ${inv.subtotal}, ${inv.tax}, ${inv.total}, ${inv.paid}, ${inv.status}, ${inv.notes}) RETURNING id`;
  savedPurchaseInvoices.push(row);
  for (const item of inv.items) {
    const prodId = products[item.productIdx]?.id || null;
    await sql`INSERT INTO invoice_items (id, invoice_id, product_id, description, quantity, rate, amount, gst_percent, gst_amount, batch_no, sl_no, expiry_date) VALUES (gen_random_uuid(), ${row.id}, ${prodId}, ${item.desc}, ${item.qty}, ${item.rate}, ${item.amount}, ${item.gst}, ${item.gstAmt}, ${item.batchNo}, ${item.slNo}, ${item.expiry})`;
  }
  // Ledger: credit vendor, debit purchase, debit GST
  await sql`INSERT INTO ledger_entries (id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type, reference_id) VALUES (gen_random_uuid(), ${company.id}, ${fy.id}, ${vend.ledgerId}, ${inv.date}, ${"Purchase Invoice " + inv.number}, 0, ${inv.total}, 0, 'INVOICE', ${row.id})`;
  await sql`INSERT INTO ledger_entries (id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type, reference_id) VALUES (gen_random_uuid(), ${company.id}, ${fy.id}, ${ledgers.PURCHASE}, ${inv.date}, ${"Purchase Invoice " + inv.number}, ${inv.subtotal}, 0, 0, 'INVOICE', ${row.id})`;
  await sql`INSERT INTO ledger_entries (id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type, reference_id) VALUES (gen_random_uuid(), ${company.id}, ${fy.id}, ${ledgers.GST}, ${inv.date}, ${"GST on " + inv.number}, ${inv.tax}, 0, 0, 'INVOICE', ${row.id})`;
}

// ── 12. Payments ──
// Payment received from Raj Medical (full against SI-001)
const [pr1] = await sql`INSERT INTO payments (id, company_id, payment_number, type, date, customer_id, amount, method, reference, notes) VALUES (gen_random_uuid(), ${company.id}, 'PR-2025-001', 'RECEIVED', ${new Date(2025, 5, 20)}, ${customers[0].id}, 5600, 'UPI', 'UPI-REF-78234', 'Full payment via UPI') RETURNING id`;
await sql`INSERT INTO payment_allocations (id, payment_id, invoice_id, amount) VALUES (gen_random_uuid(), ${pr1.id}, ${savedSalesInvoices[0].id}, 5600)`;
await sql`INSERT INTO ledger_entries (id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type, reference_id) VALUES (gen_random_uuid(), ${company.id}, ${fy.id}, ${customers[0].ledgerId}, ${new Date(2025, 5, 20)}, 'Payment Received PR-2025-001', 0, 5600, 0, 'PAYMENT', ${pr1.id})`;
await sql`INSERT INTO ledger_entries (id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type, reference_id) VALUES (gen_random_uuid(), ${company.id}, ${fy.id}, ${ledgers.BANK}, ${new Date(2025, 5, 20)}, 'Payment Received PR-2025-001', 5600, 0, 0, 'PAYMENT', ${pr1.id})`;

// Partial payment from Shree Health Point
const [pr2] = await sql`INSERT INTO payments (id, company_id, payment_number, type, date, customer_id, amount, method, reference, notes) VALUES (gen_random_uuid(), ${company.id}, 'PR-2025-002', 'RECEIVED', ${new Date(2025, 7, 1)}, ${customers[1].id}, 6000, 'BANK', 'NEFT-445566', 'Partial against INV-2025-002') RETURNING id`;
await sql`INSERT INTO payment_allocations (id, payment_id, invoice_id, amount) VALUES (gen_random_uuid(), ${pr2.id}, ${savedSalesInvoices[1].id}, 6000)`;
await sql`INSERT INTO ledger_entries (id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type, reference_id) VALUES (gen_random_uuid(), ${company.id}, ${fy.id}, ${customers[1].ledgerId}, ${new Date(2025, 7, 1)}, 'Payment Received PR-2025-002', 0, 6000, 0, 'PAYMENT', ${pr2.id})`;
await sql`INSERT INTO ledger_entries (id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type, reference_id) VALUES (gen_random_uuid(), ${company.id}, ${fy.id}, ${ledgers.BANK}, ${new Date(2025, 7, 1)}, 'Payment Received PR-2025-002', 6000, 0, 0, 'PAYMENT', ${pr2.id})`;

// Payment made to Sun Pharma (full against PI-001)
const [pm1] = await sql`INSERT INTO payments (id, company_id, payment_number, type, date, vendor_id, amount, method, reference, notes) VALUES (gen_random_uuid(), ${company.id}, 'PM-2025-001', 'MADE', ${new Date(2025, 5, 18)}, ${vendors[0].id}, 28000, 'BANK', 'NEFT-112233', 'Sun Pharma full settlement') RETURNING id`;
await sql`INSERT INTO payment_allocations (id, payment_id, invoice_id, amount) VALUES (gen_random_uuid(), ${pm1.id}, ${savedPurchaseInvoices[0].id}, 28000)`;
await sql`INSERT INTO ledger_entries (id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type, reference_id) VALUES (gen_random_uuid(), ${company.id}, ${fy.id}, ${vendors[0].ledgerId}, ${new Date(2025, 5, 18)}, 'Payment Made PM-2025-001', 28000, 0, 0, 'PAYMENT', ${pm1.id})`;
await sql`INSERT INTO ledger_entries (id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type, reference_id) VALUES (gen_random_uuid(), ${company.id}, ${fy.id}, ${ledgers.BANK}, ${new Date(2025, 5, 18)}, 'Payment Made PM-2025-001', 0, 28000, 0, 'PAYMENT', ${pm1.id})`;

// Cash advance to Cipla
const [pm2] = await sql`INSERT INTO payments (id, company_id, payment_number, type, date, vendor_id, amount, method, notes) VALUES (gen_random_uuid(), ${company.id}, 'PM-2025-002', 'MADE', ${new Date(2025, 7, 20)}, ${vendors[1].id}, 5000, 'CASH', 'Advance to Cipla') RETURNING id`;
await sql`INSERT INTO ledger_entries (id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type, reference_id) VALUES (gen_random_uuid(), ${company.id}, ${fy.id}, ${vendors[1].ledgerId}, ${new Date(2025, 7, 20)}, 'Payment Made PM-2025-002', 5000, 0, 0, 'PAYMENT', ${pm2.id})`;
await sql`INSERT INTO ledger_entries (id, company_id, financial_year_id, ledger_account_id, date, description, debit, credit, balance_after, reference_type, reference_id) VALUES (gen_random_uuid(), ${company.id}, ${fy.id}, ${ledgers.CASH}, ${new Date(2025, 7, 20)}, 'Payment Made PM-2025-002', 0, 5000, 0, 'PAYMENT', ${pm2.id})`;

// ── 13. Stock Movements ──
// Sales out (SI-001) — Shop Floor
await sql`INSERT INTO stock_movements (id, company_id, product_id, facility_id, type, quantity, batch_no, reference_type, reference_id, notes) VALUES (gen_random_uuid(), ${company.id}, ${products[0].id}, ${facilityRows[2].id}, 'OUT', 100, 'SP-PARA-2025-A', 'INVOICE', ${savedSalesInvoices[0].id}, 'INV-2025-001 Paracetamol')`;
await sql`INSERT INTO stock_movements (id, company_id, product_id, facility_id, type, quantity, batch_no, reference_type, reference_id, notes) VALUES (gen_random_uuid(), ${company.id}, ${products[2].id}, ${facilityRows[2].id}, 'OUT', 20, 'SP-COSY-2025-B', 'INVOICE', ${savedSalesInvoices[0].id}, 'INV-2025-001 Cough Syrup')`;
await sql`INSERT INTO stock_movements (id, company_id, product_id, facility_id, type, quantity, batch_no, reference_type, reference_id, notes) VALUES (gen_random_uuid(), ${company.id}, ${products[6].id}, ${facilityRows[2].id}, 'OUT', 100, 'SP-ORS-2025-C', 'INVOICE', ${savedSalesInvoices[0].id}, 'INV-2025-001 ORS Sachets')`;

// Sales out (SI-002) — Main Godown
await sql`INSERT INTO stock_movements (id, company_id, product_id, facility_id, type, quantity, batch_no, reference_type, reference_id, notes) VALUES (gen_random_uuid(), ${company.id}, ${products[1].id}, ${facilityRows[0].id}, 'OUT', 100, 'CIP-AMOX-2025-D', 'INVOICE', ${savedSalesInvoices[1].id}, 'INV-2025-002 Amoxicillin')`;
await sql`INSERT INTO stock_movements (id, company_id, product_id, facility_id, type, quantity, batch_no, reference_type, reference_id, notes) VALUES (gen_random_uuid(), ${company.id}, ${products[3].id}, ${facilityRows[0].id}, 'OUT', 50, 'CIP-BETA-2025-E', 'INVOICE', ${savedSalesInvoices[1].id}, 'INV-2025-002 Betadine')`;
await sql`INSERT INTO stock_movements (id, company_id, product_id, facility_id, type, quantity, batch_no, reference_type, reference_id, notes) VALUES (gen_random_uuid(), ${company.id}, ${products[5].id}, ${facilityRows[0].id}, 'OUT', 10, 'GLV-MED-2025-F', 'INVOICE', ${savedSalesInvoices[1].id}, 'INV-2025-002 Surgical Gloves')`;

// Sales out (SI-003) — Shop Floor
await sql`INSERT INTO stock_movements (id, company_id, product_id, facility_id, type, quantity, batch_no, reference_type, reference_id, notes) VALUES (gen_random_uuid(), ${company.id}, ${products[0].id}, ${facilityRows[2].id}, 'OUT', 40, 'SP-PARA-2025-A', 'INVOICE', ${savedSalesInvoices[2].id}, 'INV-2025-003 Paracetamol')`;
await sql`INSERT INTO stock_movements (id, company_id, product_id, facility_id, type, quantity, batch_no, reference_type, reference_id, notes) VALUES (gen_random_uuid(), ${company.id}, ${products[7].id}, ${facilityRows[2].id}, 'OUT', 8, 'HSANI-2025-G', 'INVOICE', ${savedSalesInvoices[2].id}, 'INV-2025-003 Hand Sanitizer')`;

// Purchase in (PI-001) — Main Godown
await sql`INSERT INTO stock_movements (id, company_id, product_id, facility_id, type, quantity, batch_no, reference_type, reference_id, notes) VALUES (gen_random_uuid(), ${company.id}, ${products[0].id}, ${facilityRows[0].id}, 'IN', 500, 'SP-PARA-2025-A', 'INVOICE', ${savedPurchaseInvoices[0].id}, 'BILL-2025-001 Paracetamol')`;
await sql`INSERT INTO stock_movements (id, company_id, product_id, facility_id, type, quantity, batch_no, reference_type, reference_id, notes) VALUES (gen_random_uuid(), ${company.id}, ${products[2].id}, ${facilityRows[0].id}, 'IN', 200, 'SP-COSY-2025-B', 'INVOICE', ${savedPurchaseInvoices[0].id}, 'BILL-2025-001 Cough Syrup')`;
await sql`INSERT INTO stock_movements (id, company_id, product_id, facility_id, type, quantity, batch_no, reference_type, reference_id, notes) VALUES (gen_random_uuid(), ${company.id}, ${products[6].id}, ${facilityRows[0].id}, 'IN', 1000, 'SP-ORS-2025-C', 'INVOICE', ${savedPurchaseInvoices[0].id}, 'BILL-2025-001 ORS Sachets')`;

// Purchase in (PI-002) — Cold Storage
await sql`INSERT INTO stock_movements (id, company_id, product_id, facility_id, type, quantity, batch_no, reference_type, reference_id, notes) VALUES (gen_random_uuid(), ${company.id}, ${products[1].id}, ${facilityRows[1].id}, 'IN', 200, 'CIP-AMOX-2025-D', 'INVOICE', ${savedPurchaseInvoices[1].id}, 'BILL-2025-002 Amoxicillin')`;
await sql`INSERT INTO stock_movements (id, company_id, product_id, facility_id, type, quantity, batch_no, reference_type, reference_id, notes) VALUES (gen_random_uuid(), ${company.id}, ${products[3].id}, ${facilityRows[1].id}, 'IN', 100, 'CIP-BETA-2025-E', 'INVOICE', ${savedPurchaseInvoices[1].id}, 'BILL-2025-002 Betadine')`;

// ── 14. Fix ledger_accounts.balance and ledger_entries.balance_after ──
// Update balance_after on each entry using running total per account ordered by date
await sql`
  WITH running AS (
    SELECT id, ledger_account_id,
      SUM(debit - credit) OVER (PARTITION BY ledger_account_id ORDER BY date, created_at ROWS UNBOUNDED PRECEDING) AS running_bal
    FROM ledger_entries
  )
  UPDATE ledger_entries le SET balance_after = running.running_bal
  FROM running WHERE le.id = running.id
`;

// Update ledger_accounts.balance to match final running balance
await sql`
  UPDATE ledger_accounts la SET balance = COALESCE(sub.bal, 0)
  FROM (
    SELECT ledger_account_id, SUM(debit - credit) AS bal
    FROM ledger_entries GROUP BY ledger_account_id
  ) sub
  WHERE la.id = sub.ledger_account_id
`;

console.log("\n✅ Seed complete!");
console.log("─".repeat(50));
console.log("Admin :", admin.id, "| admin@pharmaretail.in | admin123");
console.log("Staff :", staff.id, "| staff@pharmaretail.in | user123");
console.log("Company:", company.id);
console.log("FY     :", fy.id, "| 2025-26");
console.log(`Categories: ${categoriesData.length} | Subcategories: ${Object.keys(subcategoryMap).length} | Customers: ${customers.length} | Vendors: ${vendors.length} | Products: ${products.length}`);
console.log(`Sales Invoices: ${salesInvoices.length} | Purchase Invoices: ${purchaseInvoices.length}`);
console.log(`Facilities: ${facilityRows.length} | Payments: 4 | Ledger Entries: seeded`);
console.log("─".repeat(50));

await sql.end();
