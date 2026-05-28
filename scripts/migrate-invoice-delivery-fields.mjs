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
      ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS delivery_enabled boolean NOT NULL DEFAULT false
    `;

    await tx`
      ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS delivery_mode text
    `;

    await tx`
      ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS delivery_reference text
    `;
  });

  console.log("invoice delivery fields migration complete.");
} finally {
  await sql.end();
}
