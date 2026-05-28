// Create the invoice_additional_charges table.
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS invoice_additional_charges (
      id              text PRIMARY KEY,
      invoice_id      text NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      name            text NOT NULL,
      hsn_sac         text,
      amount          real NOT NULL DEFAULT 0,
      discount_amount real NOT NULL DEFAULT 0,
      gst_percent     real NOT NULL DEFAULT 0,
      gst_amount      real NOT NULL DEFAULT 0,
      created_at      timestamp NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS invoice_addl_charge_invoice_idx
      ON invoice_additional_charges(invoice_id)
  `;
  console.log("invoice_additional_charges migration complete.");
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
