import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const useSsl =
  !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1");
const sql = postgres(databaseUrl, useSsl ? { ssl: "require" } : {});

try {
  await sql.begin(async (tx) => {
    await tx`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'stock_detail_status'
        ) THEN
          CREATE TYPE stock_detail_status AS ENUM ('AVAILABLE', 'SOLD');
        END IF;
      END
      $$;
    `;

    await tx`
      CREATE TABLE IF NOT EXISTS stock_details (
        id text PRIMARY KEY,
        company_id text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        facility_id text NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
        product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        batch_no text,
        serial_no text,
        expiry_date timestamp,
        quantity real NOT NULL DEFAULT 0,
        available_qty real NOT NULL DEFAULT 0,
        status stock_detail_status NOT NULL DEFAULT 'AVAILABLE',
        source_invoice_id text REFERENCES invoices(id) ON DELETE SET NULL,
        source_invoice_item_id text REFERENCES invoice_items(id) ON DELETE SET NULL,
        sold_invoice_id text REFERENCES invoices(id) ON DELETE SET NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `;

    await tx`
      CREATE INDEX IF NOT EXISTS stock_detail_company_product_idx
      ON stock_details(company_id, product_id)
    `;
    await tx`
      CREATE INDEX IF NOT EXISTS stock_detail_facility_product_idx
      ON stock_details(facility_id, product_id)
    `;
    await tx`
      CREATE INDEX IF NOT EXISTS stock_detail_batch_idx
      ON stock_details(product_id, batch_no)
    `;
    await tx`
      CREATE UNIQUE INDEX IF NOT EXISTS stock_detail_serial_company_product_idx
      ON stock_details(company_id, product_id, serial_no)
      WHERE serial_no IS NOT NULL
    `;

    await tx`
      CREATE TABLE IF NOT EXISTS invoice_item_allocations (
        id text PRIMARY KEY,
        invoice_item_id text NOT NULL REFERENCES invoice_items(id) ON DELETE CASCADE,
        stock_detail_id text NOT NULL REFERENCES stock_details(id) ON DELETE CASCADE,
        quantity real NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `;
    await tx`
      CREATE INDEX IF NOT EXISTS invoice_item_alloc_invoice_item_idx
      ON invoice_item_allocations(invoice_item_id)
    `;
    await tx`
      CREATE INDEX IF NOT EXISTS invoice_item_alloc_stock_detail_idx
      ON invoice_item_allocations(stock_detail_id)
    `;
  });

  console.log("stock detail migration complete.");
} finally {
  await sql.end();
}
