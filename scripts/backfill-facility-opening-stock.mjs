import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);
const EPSILON = 0.0001;

async function main() {
  const facilities = await sql`
    SELECT
      id,
      company_id,
      name,
      is_default,
      is_active,
      created_at
    FROM facilities
    WHERE is_active = true
    ORDER BY company_id, is_default DESC, created_at ASC
  `;

  const facilityByCompany = new Map();
  for (const facility of facilities) {
    if (!facilityByCompany.has(facility.company_id)) {
      facilityByCompany.set(facility.company_id, facility);
    }
  }

  const products = await sql`
    SELECT
      id,
      company_id,
      name,
      opening_stock,
      current_stock,
      tracking_mode
    FROM products
    ORDER BY company_id, created_at ASC
  `;

  const facilitySums = await sql`
    SELECT
      company_id,
      product_id,
      COALESCE(SUM(current_stock), 0) AS facility_total
    FROM facility_stock
    GROUP BY company_id, product_id
  `;

  const facilityTotalByProduct = new Map(
    facilitySums.map((row) => [
      `${row.company_id}:${row.product_id}`,
      Number(row.facility_total),
    ])
  );

  const existingFacilityRows = await sql`
    SELECT
      id,
      company_id,
      facility_id,
      product_id,
      current_stock
    FROM facility_stock
  `;

  const facilityRowByProductAndFacility = new Map(
    existingFacilityRows.map((row) => [
      `${row.company_id}:${row.product_id}:${row.facility_id}`,
      { id: row.id, currentStock: Number(row.current_stock) },
    ])
  );

  const repaired = [];
  const skipped = [];

  for (const product of products) {
    const key = `${product.company_id}:${product.id}`;
    const facilityTotal = facilityTotalByProduct.get(key) ?? 0;
    const currentStock = Number(product.current_stock);
    const gap = currentStock - facilityTotal;

    if (Math.abs(gap) < EPSILON) {
      continue;
    }

    const targetFacility = facilityByCompany.get(product.company_id);
    if (!targetFacility) {
      skipped.push({
        productName: product.name,
        companyId: product.company_id,
        reason: "No active facility available",
        gap,
      });
      continue;
    }

    if (gap < 0) {
      skipped.push({
        productName: product.name,
        companyId: product.company_id,
        reason: "Facility stock already exceeds product total",
        gap,
      });
      continue;
    }

    const facilityKey = `${product.company_id}:${product.id}:${targetFacility.id}`;
    const existingRow = facilityRowByProductAndFacility.get(facilityKey);

    if (existingRow) {
      await sql`
        UPDATE facility_stock
        SET
          current_stock = current_stock + ${gap},
          updated_at = NOW()
        WHERE id = ${existingRow.id}
      `;
      existingRow.currentStock += gap;
    } else {
      const inserted = await sql`
        INSERT INTO facility_stock (
          id,
          company_id,
          facility_id,
          product_id,
          current_stock,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid()::text,
          ${product.company_id},
          ${targetFacility.id},
          ${product.id},
          ${gap},
          NOW(),
          NOW()
        )
        RETURNING id
      `;
      facilityRowByProductAndFacility.set(facilityKey, {
        id: inserted[0].id,
        currentStock: gap,
      });
    }

    facilityTotalByProduct.set(key, facilityTotal + gap);
    repaired.push({
      productName: product.name,
      trackingMode: product.tracking_mode,
      companyId: product.company_id,
      facilityName: targetFacility.name,
      addedQty: gap,
    });
  }

  console.log(`Repaired products: ${repaired.length}`);
  for (const row of repaired) {
    console.log(
      `  + ${row.productName} (${row.trackingMode}) -> ${row.facilityName}: ${row.addedQty}`
    );
  }

  console.log(`Skipped products: ${skipped.length}`);
  for (const row of skipped) {
    console.log(
      `  - ${row.productName} [${row.companyId}] skipped: ${row.reason} (${row.gap})`
    );
  }

  await sql.end();
}

main().catch(async (error) => {
  console.error(error);
  await sql.end();
  process.exit(1);
});
