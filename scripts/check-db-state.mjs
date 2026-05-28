import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  const customerCols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'customers'
    ORDER BY ordinal_position
  `;
  console.log("customers columns:", customerCols.map((c) => c.column_name).join(", "));

  const invoiceCols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'invoices'
      AND column_name IN ('billing_address_snapshot', 'shipping_address_snapshot')
  `;
  console.log("invoice snapshot cols present:", invoiceCols.map((c) => c.column_name));

  const addrTable = await sql`
    SELECT to_regclass('customer_addresses') AS exists
  `;
  console.log("customer_addresses table:", addrTable[0].exists ?? "MISSING");

  if (addrTable[0].exists) {
    const cnt = await sql`SELECT COUNT(*)::int AS n FROM customer_addresses`;
    console.log("customer_addresses rows:", cnt[0].n);
  }

  const custCount = await sql`SELECT COUNT(*)::int AS n FROM customers`;
  console.log("customers rows:", custCount[0].n);

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
