// Final migration step: drop legacy address columns from customers, now that
// data has been backfilled into customer_addresses.
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  const cols = [
    "billing_address",
    "shipping_address",
    "city",
    "state",
    "pincode",
  ];
  for (const c of cols) {
    await sql.unsafe(`ALTER TABLE customers DROP COLUMN IF EXISTS ${c}`);
    console.log(`Dropped customers.${c}`);
  }
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
