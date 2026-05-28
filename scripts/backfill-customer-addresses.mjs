// Backfill: copy each customer's existing single billing/shipping/city/state/pincode
// into the new customer_addresses table as one default row per customer.
//
// Run AFTER the additive `drizzle-kit push` (which adds customer_addresses) and
// BEFORE the drop push (which removes the legacy columns from `customers`).
//
//   node scripts/backfill-customer-addresses.mjs
//
// Idempotent: skips customers that already have any rows in customer_addresses.

import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  const customers = await sql`
    SELECT c.id, c.billing_address, c.shipping_address, c.city, c.state, c.pincode
    FROM customers c
    LEFT JOIN customer_addresses ca ON ca.customer_id = c.id
    WHERE ca.id IS NULL
      AND (
        c.billing_address IS NOT NULL OR
        c.shipping_address IS NOT NULL OR
        c.city IS NOT NULL OR
        c.state IS NOT NULL OR
        c.pincode IS NOT NULL
      )
  `;

  console.log(`Found ${customers.length} customers needing backfill.`);

  let inserted = 0;
  for (const c of customers) {
    const line1 = (c.billing_address || c.shipping_address || "").trim();
    if (!line1 && !c.city && !c.state && !c.pincode) continue;

    const id = crypto.randomUUID();
    await sql`
      INSERT INTO customer_addresses
        (id, customer_id, label, line1, city, state, pincode, is_default)
      VALUES
        (${id}, ${c.id}, ${"Primary"}, ${line1 || "—"}, ${c.city}, ${c.state}, ${c.pincode}, true)
    `;
    inserted += 1;
  }

  console.log(`Inserted ${inserted} address rows.`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
