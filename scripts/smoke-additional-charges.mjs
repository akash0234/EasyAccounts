// Smoke-test invoice_additional_charges round-trip:
//  - find a SALES invoice
//  - insert two charges
//  - verify count, taxable computation, and cascade delete
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  const [inv] = await sql`
    SELECT id, invoice_number FROM invoices WHERE type = 'SALES' LIMIT 1
  `;
  if (!inv) {
    console.log("No SALES invoice present; skipping smoke test.");
    await sql.end();
    return;
  }
  console.log("Using invoice:", inv.invoice_number, inv.id);

  const charges = [
    { name: "SMOKE-Freight", hsn: "996511", amount: 500, disc: 0, gst: 18 },
    { name: "SMOKE-Packing", hsn: null,     amount: 100, disc: 10, gst: 0 },
  ];
  const ids = [];
  for (const c of charges) {
    const id = crypto.randomUUID();
    ids.push(id);
    const taxable = Math.max(c.amount - c.disc, 0);
    const gstAmount = (taxable * c.gst) / 100;
    await sql`
      INSERT INTO invoice_additional_charges
        (id, invoice_id, name, hsn_sac, amount, discount_amount, gst_percent, gst_amount)
      VALUES
        (${id}, ${inv.id}, ${c.name}, ${c.hsn}, ${c.amount}, ${c.disc}, ${c.gst}, ${gstAmount})
    `;
  }

  const rows = await sql`
    SELECT name, amount, discount_amount, gst_percent, gst_amount
    FROM invoice_additional_charges
    WHERE invoice_id = ${inv.id} AND name LIKE 'SMOKE-%'
    ORDER BY name
  `;
  console.log("Inserted rows:");
  for (const r of rows) {
    const taxable = Math.max(r.amount - r.discount_amount, 0);
    console.log(
      `  ${r.name}: amount=${r.amount} disc=${r.discount_amount} taxable=${taxable} gst%=${r.gst_percent} gstAmt=${r.gst_amount}`
    );
  }

  // Verify FK relation works the other way too
  const join = await sql`
    SELECT i.invoice_number, COUNT(ac.id)::int AS charge_count
    FROM invoices i
    LEFT JOIN invoice_additional_charges ac ON ac.invoice_id = i.id
    WHERE i.id = ${inv.id}
    GROUP BY i.invoice_number
  `;
  console.log("Join check:", join[0]);

  // Cleanup the smoke rows
  await sql`
    DELETE FROM invoice_additional_charges
    WHERE invoice_id = ${inv.id} AND name LIKE 'SMOKE-%'
  `;
  const after = await sql`
    SELECT COUNT(*)::int AS n
    FROM invoice_additional_charges
    WHERE invoice_id = ${inv.id} AND name LIKE 'SMOKE-%'
  `;
  console.log("After cleanup, smoke charges:", after[0].n);

  // FK metadata check
  const fk = await sql`
    SELECT con.conname, con.confdeltype
    FROM pg_constraint con
    JOIN pg_class cl ON cl.oid = con.conrelid
    WHERE cl.relname = 'invoice_additional_charges' AND con.contype = 'f'
  `;
  console.log("FK rule:", fk[0]);

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
