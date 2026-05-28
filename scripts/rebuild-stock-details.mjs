import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

try {
  let companyId = process.argv[2];
  if (!companyId) {
    const [company] = await sql`SELECT id FROM companies ORDER BY created_at ASC LIMIT 1`;
    companyId = company?.id;
  }

  if (!companyId) {
    console.error("No company found to rebuild stock details for");
    process.exit(1);
  }

  const inserted = await sql.begin(async (tx) => {
    await tx`DELETE FROM invoice_item_allocations`;
    await tx`DELETE FROM stock_details`;

    const rows = await tx`
      SELECT
        ii.id AS invoice_item_id,
        ii.product_id,
        ii.batch_no,
        ii.sl_no,
        ii.expiry_date,
        ii.quantity,
        i.id AS invoice_id,
        i.facility_id,
        p.tracking_mode
      FROM invoice_items ii
      JOIN invoices i ON i.id = ii.invoice_id
      JOIN products p ON p.id = ii.product_id
      WHERE i.company_id = ${companyId}
        AND i.type = 'PURCHASE'
        AND ii.product_id IS NOT NULL
      ORDER BY i.date ASC, ii.id ASC
    `;

    let insertedCount = 0;
    for (const row of rows) {
      if (row.tracking_mode === "BATCH") {
        await tx`
          INSERT INTO stock_details (
            id,
            company_id,
            facility_id,
            product_id,
            batch_no,
            expiry_date,
            quantity,
            available_qty,
            status,
            source_invoice_id,
            source_invoice_item_id
          ) VALUES (
            ${crypto.randomUUID()},
            ${companyId},
            ${row.facility_id},
            ${row.product_id},
            ${row.batch_no},
            ${row.expiry_date},
            ${row.quantity},
            ${row.quantity},
            'AVAILABLE',
            ${row.invoice_id},
            ${row.invoice_item_id}
          )
        `;
        insertedCount += 1;
      } else if (row.tracking_mode === "SERIAL") {
        const serials = row.sl_no
          ? String(row.sl_no)
              .split(/[,\n]/)
              .map((serial) => serial.trim())
              .filter(Boolean)
          : [];

        for (const serial of serials) {
          await tx`
            INSERT INTO stock_details (
              id,
              company_id,
              facility_id,
              product_id,
              batch_no,
              serial_no,
              expiry_date,
              quantity,
              available_qty,
              status,
              source_invoice_id,
              source_invoice_item_id
            ) VALUES (
              ${crypto.randomUUID()},
              ${companyId},
              ${row.facility_id},
              ${row.product_id},
              ${row.batch_no},
              ${serial},
              ${row.expiry_date},
              1,
              1,
              'AVAILABLE',
              ${row.invoice_id},
              ${row.invoice_item_id}
            )
          `;
          insertedCount += 1;
        }
      }
    }

    return insertedCount;
  });

  console.log(`Rebuilt stock details: ${inserted}`);
} finally {
  await sql.end();
}
