// Create the reusable additional_charge_catalog table.
import "dotenv/config";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
const useSsl =
  databaseUrl &&
  !databaseUrl.includes("localhost") &&
  !databaseUrl.includes("127.0.0.1");

const sql = postgres(databaseUrl, useSsl ? { ssl: "require" } : {});

try {
  await sql.begin(async (tx) => {
    await tx`
      CREATE TABLE IF NOT EXISTS additional_charge_catalog (
        id text PRIMARY KEY,
        company_id text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name text NOT NULL,
        hsn_sac text,
        default_amount real NOT NULL DEFAULT 0,
        default_discount_amount real NOT NULL DEFAULT 0,
        gst_percent real NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `;

    await tx`
      CREATE INDEX IF NOT EXISTS additional_charge_catalog_company_idx
      ON additional_charge_catalog(company_id)
    `;

    await tx`
      CREATE UNIQUE INDEX IF NOT EXISTS additional_charge_catalog_name_company_idx
      ON additional_charge_catalog(company_id, name)
    `;
  });

  console.log("additional_charge_catalog migration complete.");
} finally {
  await sql.end();
}
