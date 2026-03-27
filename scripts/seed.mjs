import dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcryptjs";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

const adminPassHash = await bcrypt.hash("admin123", 10);
const userPassHash = await bcrypt.hash("user123", 10);

const [admin] = await sql`INSERT INTO users (id, name, email, password_hash) VALUES (gen_random_uuid(), 'Amitava (Admin)', 'admin@pharmaretail.in', ${adminPassHash}) RETURNING id`;

const [staff] = await sql`INSERT INTO users (id, name, email, password_hash) VALUES (gen_random_uuid(), 'Staff User', 'staff@pharmaretail.in', ${userPassHash}) RETURNING id`;

const [company] = await sql`INSERT INTO companies (id, name, city, state) VALUES (gen_random_uuid(), 'Pharma Retail', 'Kolkata', 'West Bengal') RETURNING id`;

await sql`INSERT INTO company_members (id, user_id, company_id, role) VALUES (gen_random_uuid(), ${admin.id}, ${company.id}, 'ADMIN')`;
await sql`INSERT INTO company_members (id, user_id, company_id, role) VALUES (gen_random_uuid(), ${staff.id}, ${company.id}, 'USER')`;

const fyStart = new Date(2025, 3, 1);
const fyEnd = new Date(2026, 2, 31);
await sql`INSERT INTO financial_years (id, company_id, label, start_date, end_date, is_active) VALUES (gen_random_uuid(), ${company.id}, '2025-26', ${fyStart}, ${fyEnd}, true)`;

for (const a of [{ n: "Cash", t: "CASH" }, { n: "Bank", t: "BANK" }, { n: "Sales", t: "SALES" }, { n: "Purchase", t: "PURCHASE" }, { n: "GST", t: "GST" }]) {
  await sql`INSERT INTO ledger_accounts (id, company_id, name, type) VALUES (gen_random_uuid(), ${company.id}, ${a.n}, ${a.t})`;
}

console.log("Done!");
console.log("Admin:", admin.id, "| email: admin@pharmaretail.in | pass: admin123");
console.log("Staff:", staff.id, "| email: staff@pharmaretail.in | pass: user123");
console.log("Company:", company.id);
await sql.end();
