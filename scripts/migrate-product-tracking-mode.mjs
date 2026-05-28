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
          SELECT 1
          FROM pg_type
          WHERE typname = 'stock_tracking_mode'
        ) THEN
          CREATE TYPE stock_tracking_mode AS ENUM ('NONE', 'BATCH', 'SERIAL');
        END IF;
      END
      $$;
    `;

    await tx`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS tracking_mode stock_tracking_mode NOT NULL DEFAULT 'NONE'
    `;
  });

  console.log("product tracking mode migration complete.");
} finally {
  await sql.end();
}
