// Smoke test the address feature directly against the DB.
// Picks a customer, lists their addresses, adds a temp address, sets it
// default, then deletes it. Cleans up so it can run repeatedly.
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  const [cust] = await sql`SELECT id, name FROM customers LIMIT 1`;
  if (!cust) {
    console.log("No customers in DB, skipping smoke test.");
    await sql.end();
    return;
  }
  console.log("Customer:", cust.name, cust.id);

  const before = await sql`
    SELECT id, label, line1, is_default
    FROM customer_addresses
    WHERE customer_id = ${cust.id}
    ORDER BY is_default DESC, created_at ASC
  `;
  console.log("Existing addresses:");
  for (const a of before) {
    console.log(`  - ${a.is_default ? "[DEF] " : "      "}${a.label ?? "(no label)"}: ${a.line1}`);
  }

  const tmpId = crypto.randomUUID();
  await sql`
    INSERT INTO customer_addresses
      (id, customer_id, label, line1, city, state, pincode, is_default)
    VALUES
      (${tmpId}, ${cust.id}, 'SMOKE-TEST', 'Test Lane 1', 'Kolkata', 'WB', '700001', false)
  `;

  const after = await sql`
    SELECT COUNT(*)::int AS n FROM customer_addresses WHERE customer_id = ${cust.id}
  `;
  console.log("After insert, address count:", after[0].n);

  // Promote tmp address to default.
  await sql`
    UPDATE customer_addresses
    SET is_default = false
    WHERE customer_id = ${cust.id} AND id <> ${tmpId}
  `;
  await sql`
    UPDATE customer_addresses SET is_default = true WHERE id = ${tmpId}
  `;
  const def = await sql`
    SELECT id FROM customer_addresses
    WHERE customer_id = ${cust.id} AND is_default = true
  `;
  console.log("Default count:", def.length, def[0]?.id === tmpId ? "(matches tmp ✔)" : "(MISMATCH ✘)");

  // Cleanup: delete tmp address and restore the previous default if any.
  await sql`DELETE FROM customer_addresses WHERE id = ${tmpId}`;
  if (before.length) {
    const prevDefault = before.find((a) => a.is_default) ?? before[0];
    await sql`
      UPDATE customer_addresses SET is_default = true WHERE id = ${prevDefault.id}
    `;
  }
  const final = await sql`
    SELECT COUNT(*)::int AS n FROM customer_addresses WHERE customer_id = ${cust.id}
  `;
  console.log("After cleanup, address count:", final[0].n);

  // Verify cascade by checking FK
  const fk = await sql`
    SELECT confdeltype FROM pg_constraint
    WHERE conname LIKE '%customer_addresses%customer_id%'
  `;
  console.log("FK delete rule:", fk[0]?.confdeltype, "(c = CASCADE)");

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
