// Additive migration step: create customer_addresses table and add invoice
// address-snapshot columns. Does NOT touch the legacy customer columns yet —
// run the backfill script next, then `drizzle-kit push` to drop them.
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS customer_addresses (
      id            text PRIMARY KEY,
      customer_id   text NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      label         text,
      line1         text NOT NULL,
      city          text,
      state         text,
      pincode       text,
      is_default    boolean NOT NULL DEFAULT false,
      created_at    timestamp NOT NULL DEFAULT now(),
      updated_at    timestamp NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS customer_address_customer_idx
      ON customer_addresses(customer_id)
  `;

  await sql`
    ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS billing_address_snapshot text
  `;
  await sql`
    ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS shipping_address_snapshot text
  `;

  console.log("Additive migration complete.");
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
