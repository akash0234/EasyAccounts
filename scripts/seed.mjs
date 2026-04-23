import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
import bcrypt from "bcryptjs";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

// ── Clean existing data ──
await sql`TRUNCATE facility_stock, stock_movements, payment_allocations, invoice_items, invoices, ledger_entries, ledger_accounts, products, subcategories, categories, payments, vendors, customers, facilities, financial_years, company_members, companies, organization_members, organizations, users CASCADE`;

// ── 1. Organization ──
const [org] = await sql`
  INSERT INTO organizations (id, name)
  VALUES (gen_random_uuid(), 'RK & Sons Co.')
  RETURNING id, name
`;

// ── 2. Owner / login user ──
const ownerPassHash = await bcrypt.hash("owner123", 10);
const [owner] = await sql`
  INSERT INTO users (id, name, email, password_hash, phone)
  VALUES (gen_random_uuid(), 'RK Owner', 'owner@rksons.in', ${ownerPassHash}, '9800000000')
  RETURNING id, name, email
`;

await sql`
  INSERT INTO organization_members (id, user_id, organization_id, role)
  VALUES (gen_random_uuid(), ${owner.id}, ${org.id}, 'OWNER')
`;

// ── 3. Companies ──
const companiesData = [
  {
    key: "electronics",
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
  {
    key: "jewellery",
    name: "RK Jewellery",
    gstin: "19AABCR2002J1Z9",
    pan: "AABCR2002J",
    phone: "03322002222",
    email: "jewellery@rksons.in",
    address: "5, Bowbazar Street",
    city: "Kolkata",
    state: "West Bengal",
    pincode: "700012",
  },
];

const entitiesByCompany = {
  electronics: {
    users: [
      { name: "Arjun Admin", email: "arjun.admin@rkelectronics.in", phone: "9810000001", role: "ADMIN", pass: "admin123" },
      { name: "Priya Sales", email: "priya.sales@rkelectronics.in", phone: "9810000002", role: "USER", pass: "user123" },
      { name: "Rohit Cashier", email: "rohit.cashier@rkelectronics.in", phone: "9810000003", role: "USER", pass: "user123" },
      { name: "Neha Stock", email: "neha.stock@rkelectronics.in", phone: "9810000004", role: "USER", pass: "user123" },
      { name: "Karan Support", email: "karan.support@rkelectronics.in", phone: "9810000005", role: "USER", pass: "user123" },
    ],
    customers: [
      { name: "Sen Gupta Household", gstin: null, phone: "9830011111", billing_address: "Flat 3B, 12 Lake Road", city: "Kolkata", state: "West Bengal", pincode: "700029", credit_limit: 0 },
      { name: "Techno Offices Pvt Ltd", gstin: "19AABCT3003O1ZP", phone: "9830022222", billing_address: "Salt Lake Sector V, Block DN-52", city: "Kolkata", state: "West Bengal", pincode: "700091", credit_limit: 200000 },
      { name: "Das Residence", gstin: null, phone: "9830033333", billing_address: "7/1 Gariahat Road", city: "Kolkata", state: "West Bengal", pincode: "700019", credit_limit: 50000 },
      { name: "Bright School Trust", gstin: "19AABCB4004S1ZK", phone: "9830044444", billing_address: "45, Park Circus", city: "Kolkata", state: "West Bengal", pincode: "700017", credit_limit: 100000 },
      { name: "Mitra Electronics Resellers", gstin: "19AABCM5005R1ZL", phone: "9830055555", billing_address: "Chandni Chowk Market", city: "Kolkata", state: "West Bengal", pincode: "700013", credit_limit: 150000 },
    ],
    vendors: [
      { name: "Samsung India Electronics", gstin: "07AAACS1234A1Z1", phone: "01240000001", address: "Gurgaon HQ", city: "Gurgaon", state: "Haryana", pincode: "122002" },
      { name: "LG Electronics India", gstin: "07AAACL5678B1Z2", phone: "01240000002", address: "Greater Noida Plant", city: "Greater Noida", state: "Uttar Pradesh", pincode: "201306" },
      { name: "Sony India Pvt Ltd", gstin: "07AAACS9876C1Z3", phone: "01140000003", address: "A-31 Mohan Coop Estate", city: "New Delhi", state: "Delhi", pincode: "110044" },
      { name: "Voltas Limited", gstin: "27AAACV1122D1Z4", phone: "02266656666", address: "Voltas House, Chinchpokli", city: "Mumbai", state: "Maharashtra", pincode: "400033" },
      { name: "Havells India", gstin: "07AAACH3344E1Z5", phone: "01140000005", address: "QRG Towers, Noida", city: "Noida", state: "Uttar Pradesh", pincode: "201304" },
    ],
    categories: [
      { name: "Televisions", description: "LED, QLED, OLED TVs of all sizes" },
      { name: "Home Appliances", description: "Washing machines, refrigerators, ACs" },
      { name: "Audio & Entertainment", description: "Speakers, home theatres, soundbars" },
      { name: "Mobile & Accessories", description: "Smartphones, chargers, earphones" },
      { name: "Small Kitchen Appliances", description: "Mixers, grinders, microwaves" },
    ],
    // one subcategory per category (5 total) — schema allows many but user asked for 5 of each entity
    subcategories: [
      { catName: "Televisions", name: "Smart LED TV", description: "Internet-enabled LED TVs" },
      { catName: "Home Appliances", name: "Split AC", description: "Inverter split air conditioners" },
      { catName: "Audio & Entertainment", name: "Soundbar", description: "Single-unit soundbars" },
      { catName: "Mobile & Accessories", name: "Smartphone", description: "Android & iOS smartphones" },
      { catName: "Small Kitchen Appliances", name: "Microwave Oven", description: "Convection and grill microwaves" },
    ],
    products: [
      { name: "Samsung 55\" QLED Smart TV", desc: "55 inch 4K QLED Smart TV", hsn: "8528", sku: "SAM-QLED-55", unit: "PCS", catName: "Televisions", subName: "Smart LED TV", gst: 18, purchase: 62000, selling: 74999, reorder: 5 },
      { name: "LG 1.5 Ton Split AC", desc: "5-star inverter split AC", hsn: "8415", sku: "LG-AC-15", unit: "PCS", catName: "Home Appliances", subName: "Split AC", gst: 28, purchase: 38000, selling: 45999, reorder: 10 },
      { name: "Sony HT-S40R Soundbar", desc: "5.1ch real surround soundbar", hsn: "8518", sku: "SONY-HTS40R", unit: "PCS", catName: "Audio & Entertainment", subName: "Soundbar", gst: 18, purchase: 22000, selling: 29990, reorder: 8 },
      { name: "Samsung Galaxy A55 5G", desc: "8GB/256GB smartphone", hsn: "8517", sku: "SAM-A55-256", unit: "PCS", catName: "Mobile & Accessories", subName: "Smartphone", gst: 18, purchase: 32000, selling: 38999, reorder: 15 },
      { name: "LG 28L Convection Microwave", desc: "Convection + grill microwave oven", hsn: "8516", sku: "LG-MC28", unit: "PCS", catName: "Small Kitchen Appliances", subName: "Microwave Oven", gst: 18, purchase: 13000, selling: 16499, reorder: 10 },
    ],
    facilities: [
      { name: "Chowringhee Showroom Floor", address: "21, Chowringhee Road, Kolkata", isDefault: true },
      { name: "Chowringhee Back Storage", address: "21, Chowringhee Road (Rear), Kolkata", isDefault: false },
      { name: "Howrah Warehouse", address: "Plot 12, Kona Expressway, Howrah", isDefault: false },
      { name: "Salt Lake Service Centre", address: "Sector V, Block EP, Kolkata", isDefault: false },
      { name: "Behala Stock Point", address: "Diamond Harbour Road, Behala", isDefault: false },
    ],
  },
  jewellery: {
    users: [
      { name: "Rina Admin", email: "rina.admin@rkjewellery.in", phone: "9820000001", role: "ADMIN", pass: "admin123" },
      { name: "Suman Sales", email: "suman.sales@rkjewellery.in", phone: "9820000002", role: "USER", pass: "user123" },
      { name: "Aditi Billing", email: "aditi.billing@rkjewellery.in", phone: "9820000003", role: "USER", pass: "user123" },
      { name: "Vikram Valuer", email: "vikram.valuer@rkjewellery.in", phone: "9820000004", role: "USER", pass: "user123" },
      { name: "Meera Counter", email: "meera.counter@rkjewellery.in", phone: "9820000005", role: "USER", pass: "user123" },
    ],
    customers: [
      { name: "Banerjee Wedding Family", gstin: null, phone: "9831011111", billing_address: "14, Ballygunge Place", city: "Kolkata", state: "West Bengal", pincode: "700019", credit_limit: 0 },
      { name: "Kothari Jewels (Reseller)", gstin: "19AABCK6006J1ZM", phone: "9831022222", billing_address: "Burrabazar Jewellery Lane", city: "Kolkata", state: "West Bengal", pincode: "700007", credit_limit: 500000 },
      { name: "Ms. Anita Roy", gstin: null, phone: "9831033333", billing_address: "22, Dover Lane", city: "Kolkata", state: "West Bengal", pincode: "700029", credit_limit: 100000 },
      { name: "Chatterjee & Co. HNI", gstin: "19AABCC7007H1ZN", phone: "9831044444", billing_address: "Alipore Estate", city: "Kolkata", state: "West Bengal", pincode: "700027", credit_limit: 1000000 },
      { name: "Walk-in Retail Counter", gstin: null, phone: null, billing_address: "5, Bowbazar Street", city: "Kolkata", state: "West Bengal", pincode: "700012", credit_limit: 0 },
    ],
    vendors: [
      { name: "MMTC-PAMP India", gstin: "06AAACM8008P1ZO", phone: "01244000001", address: "Udyog Vihar, Phase V", city: "Gurgaon", state: "Haryana", pincode: "122016" },
      { name: "Rajesh Exports Ltd", gstin: "29AAACR9009E1ZP", phone: "08025599999", address: "Whitefield", city: "Bengaluru", state: "Karnataka", pincode: "560066" },
      { name: "Titan Company Ltd", gstin: "33AAACT1010T1ZQ", phone: "04466642222", address: "Golden Enclave, Airport Road", city: "Bengaluru", state: "Karnataka", pincode: "560017" },
      { name: "PC Jeweller Wholesale", gstin: "07AAACP1111P1ZR", phone: "01140001111", address: "Karol Bagh", city: "New Delhi", state: "Delhi", pincode: "110005" },
      { name: "Kundan Diamonds Surat", gstin: "24AAACK1212D1ZS", phone: "02612222222", address: "Mahidharpura Market", city: "Surat", state: "Gujarat", pincode: "395003" },
    ],
    categories: [
      { name: "Gold Jewellery", description: "22K and 24K gold ornaments" },
      { name: "Diamond Jewellery", description: "Certified diamond-studded pieces" },
      { name: "Silver Articles", description: "Silver ornaments and utensils" },
      { name: "Gemstones", description: "Precious and semi-precious stones" },
      { name: "Bullion & Coins", description: "Gold/silver bars and coins" },
    ],
    subcategories: [
      { catName: "Gold Jewellery", name: "Necklaces", description: "Gold chains and neckpieces" },
      { catName: "Diamond Jewellery", name: "Rings", description: "Diamond-studded rings" },
      { catName: "Silver Articles", name: "Payals", description: "Silver anklets" },
      { catName: "Gemstones", name: "Loose Stones", description: "Certified loose gemstones" },
      { catName: "Bullion & Coins", name: "Gold Coins", description: "Minted gold coins 1g-50g" },
    ],
    products: [
      { name: "22K Gold Necklace 20g", desc: "Hallmarked 22K gold chain-style necklace", hsn: "7113", sku: "GOLD-NK-22K-20", unit: "PCS", catName: "Gold Jewellery", subName: "Necklaces", gst: 3, purchase: 115000, selling: 138000, reorder: 3 },
      { name: "Solitaire Diamond Ring 0.5ct", desc: "IGI certified solitaire in 18K gold", hsn: "7113", sku: "DIA-RING-05", unit: "PCS", catName: "Diamond Jewellery", subName: "Rings", gst: 3, purchase: 85000, selling: 115000, reorder: 2 },
      { name: "Silver Payal Pair 50g", desc: "92.5 pure silver anklet pair", hsn: "7113", sku: "SIL-PAYAL-50", unit: "PAIR", catName: "Silver Articles", subName: "Payals", gst: 3, purchase: 4500, selling: 6200, reorder: 10 },
      { name: "Blue Sapphire 2ct (Certified)", desc: "Natural Ceylon blue sapphire, GIA certified", hsn: "7103", sku: "GEM-BS-2CT", unit: "PCS", catName: "Gemstones", subName: "Loose Stones", gst: 3, purchase: 28000, selling: 42000, reorder: 2 },
      { name: "MMTC 10g Gold Coin 999.9", desc: "10 gram 24K gold coin, tamper-proof pack", hsn: "7108", sku: "GOLD-COIN-10G", unit: "PCS", catName: "Bullion & Coins", subName: "Gold Coins", gst: 3, purchase: 68000, selling: 72000, reorder: 5 },
    ],
    facilities: [
      { name: "Bowbazar Main Showroom", address: "5, Bowbazar Street, Kolkata", isDefault: true },
      { name: "Bowbazar Strongroom", address: "5, Bowbazar Street (Basement Vault), Kolkata", isDefault: false },
      { name: "Park Street Boutique", address: "Park Mansions, Park Street, Kolkata", isDefault: false },
      { name: "New Alipore Counter", address: "Block K, New Alipore", isDefault: false },
      { name: "Locker — HDFC Park Street", address: "HDFC Bank Locker, Park Street Branch", isDefault: false },
    ],
  },
};

// ── 4. Financial Year dates (shared) ──
const fyStart = new Date(2025, 3, 1);
const fyEnd = new Date(2026, 2, 31, 23, 59, 59);

const summary = { org: org.name, owner: owner.email, companies: [] };

for (const c of companiesData) {
  // company
  const [companyRow] = await sql`
    INSERT INTO companies (id, organization_id, name, gstin, pan, phone, email, address, city, state, pincode)
    VALUES (gen_random_uuid(), ${org.id}, ${c.name}, ${c.gstin}, ${c.pan}, ${c.phone}, ${c.email}, ${c.address}, ${c.city}, ${c.state}, ${c.pincode})
    RETURNING id, name
  `;

  const data = entitiesByCompany[c.key];

  // owner is also a member (admin) of every company
  await sql`
    INSERT INTO company_members (id, user_id, company_id, role)
    VALUES (gen_random_uuid(), ${owner.id}, ${companyRow.id}, 'ADMIN')
  `;

  // 5 users (1 admin + 4 users)
  const companyUserSummary = [];
  for (const u of data.users) {
    const pwHash = await bcrypt.hash(u.pass, 10);
    const [userRow] = await sql`
      INSERT INTO users (id, name, email, password_hash, phone)
      VALUES (gen_random_uuid(), ${u.name}, ${u.email}, ${pwHash}, ${u.phone})
      RETURNING id, email
    `;
    // add to org (as USER) and to company
    await sql`
      INSERT INTO organization_members (id, user_id, organization_id, role)
      VALUES (gen_random_uuid(), ${userRow.id}, ${org.id}, 'USER')
    `;
    await sql`
      INSERT INTO company_members (id, user_id, company_id, role)
      VALUES (gen_random_uuid(), ${userRow.id}, ${companyRow.id}, ${u.role})
    `;
    companyUserSummary.push(`${u.email} / ${u.pass} (${u.role})`);
  }

  // financial year
  await sql`
    INSERT INTO financial_years (id, company_id, label, start_date, end_date, is_active)
    VALUES (gen_random_uuid(), ${companyRow.id}, '2025-26', ${fyStart}, ${fyEnd}, true)
  `;

  // system ledger accounts
  const sysAccounts = [
    { name: "Cash Account", type: "CASH" },
    { name: "Bank Account", type: "BANK" },
    { name: "Sales Account", type: "SALES" },
    { name: "Purchase Account", type: "PURCHASE" },
    { name: "GST Account", type: "GST" },
  ];
  for (const a of sysAccounts) {
    await sql`
      INSERT INTO ledger_accounts (id, company_id, name, type)
      VALUES (gen_random_uuid(), ${companyRow.id}, ${a.name}, ${a.type})
    `;
  }

  // 5 customers
  for (let i = 0; i < data.customers.length; i++) {
    const cust = data.customers[i];
    const code = `CUST-${String(i + 1).padStart(3, "0")}`;
    const [custRow] = await sql`
      INSERT INTO customers (id, company_id, code, name, gstin, phone, billing_address, city, state, pincode, credit_limit, opening_balance)
      VALUES (gen_random_uuid(), ${companyRow.id}, ${code}, ${cust.name}, ${cust.gstin}, ${cust.phone}, ${cust.billing_address}, ${cust.city}, ${cust.state}, ${cust.pincode}, ${cust.credit_limit}, 0)
      RETURNING id
    `;
    await sql`
      INSERT INTO ledger_accounts (id, company_id, code, name, type, customer_id, balance)
      VALUES (gen_random_uuid(), ${companyRow.id}, ${code}, ${cust.name}, 'CUSTOMER', ${custRow.id}, 0)
    `;
  }

  // 5 vendors
  for (let i = 0; i < data.vendors.length; i++) {
    const v = data.vendors[i];
    const code = `VEND-${String(i + 1).padStart(3, "0")}`;
    const [vendRow] = await sql`
      INSERT INTO vendors (id, company_id, code, name, gstin, phone, address, city, state, pincode, opening_balance)
      VALUES (gen_random_uuid(), ${companyRow.id}, ${code}, ${v.name}, ${v.gstin}, ${v.phone}, ${v.address}, ${v.city}, ${v.state}, ${v.pincode}, 0)
      RETURNING id
    `;
    await sql`
      INSERT INTO ledger_accounts (id, company_id, code, name, type, vendor_id, balance)
      VALUES (gen_random_uuid(), ${companyRow.id}, ${code}, ${v.name}, 'VENDOR', ${vendRow.id}, 0)
    `;
  }

  // 5 categories
  const categoryMap = {};
  for (const cat of data.categories) {
    const [row] = await sql`
      INSERT INTO categories (id, company_id, name, description)
      VALUES (gen_random_uuid(), ${companyRow.id}, ${cat.name}, ${cat.description})
      RETURNING id
    `;
    categoryMap[cat.name] = row.id;
  }

  // 5 subcategories
  const subcategoryMap = {};
  for (const sub of data.subcategories) {
    const catId = categoryMap[sub.catName];
    const [row] = await sql`
      INSERT INTO subcategories (id, company_id, category_id, name, description)
      VALUES (gen_random_uuid(), ${companyRow.id}, ${catId}, ${sub.name}, ${sub.description})
      RETURNING id
    `;
    subcategoryMap[sub.name] = row.id;
  }

  // 5 products
  for (let i = 0; i < data.products.length; i++) {
    const p = data.products[i];
    const code = `PRD-${String(i + 1).padStart(3, "0")}`;
    const catId = categoryMap[p.catName] || null;
    const subId = subcategoryMap[p.subName] || null;
    await sql`
      INSERT INTO products (id, company_id, code, name, description, hsn, sku, unit, category_id, subcategory_id, gst_percent, purchase_rate, selling_rate, opening_stock, current_stock, reorder_level, is_active)
      VALUES (gen_random_uuid(), ${companyRow.id}, ${code}, ${p.name}, ${p.desc}, ${p.hsn}, ${p.sku}, ${p.unit}, ${catId}, ${subId}, ${p.gst}, ${p.purchase}, ${p.selling}, 0, 0, ${p.reorder}, true)
    `;
  }

  // 5 facilities
  for (let i = 0; i < data.facilities.length; i++) {
    const f = data.facilities[i];
    const code = `FAC-${String(i + 1).padStart(3, "0")}`;
    await sql`
      INSERT INTO facilities (id, company_id, code, name, address, is_default, is_active)
      VALUES (gen_random_uuid(), ${companyRow.id}, ${code}, ${f.name}, ${f.address}, ${f.isDefault}, true)
    `;
  }

  summary.companies.push({
    name: companyRow.name,
    id: companyRow.id,
    users: companyUserSummary,
  });
}

// ── Done ──
console.log("\n✅ Seed complete (no transactions)");
console.log("─".repeat(60));
console.log(`Organization : ${summary.org}`);
console.log(`Login (owner): ${summary.owner} / owner123`);
console.log("─".repeat(60));
for (const c of summary.companies) {
  console.log(`\nCompany: ${c.name}`);
  console.log(`  id: ${c.id}`);
  console.log(`  users:`);
  for (const u of c.users) console.log(`    - ${u}`);
  console.log(`  entities: 5 customers, 5 vendors, 5 categories, 5 subcategories, 5 products, 5 facilities`);
}
console.log("\n(No invoices, payments, ledger entries, or stock movements were seeded.)");
console.log("─".repeat(60));

await sql.end();
