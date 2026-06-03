import fs from "fs";
import path from "path";
import postgres from "postgres";

function loadEnv() {
  const root = process.cwd();
  const candidates = [
    path.join(root, ".env.local"),
    path.join(root, ".env"),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      const text = fs.readFileSync(file, "utf8");
      for (const line of text.split(/\r?\n/)) {
        if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
        const idx = line.indexOf("=");
        const key = line.slice(0, idx).trim();
        let value = line.slice(idx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
}

async function main() {
  loadEnv();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("ERROR: DATABASE_URL environment variable is not set.");
    process.exit(1);
  }

  const sql = postgres(connectionString, { max: 1 });
  try {
    console.log("Connecting to database...");
    await sql`SELECT 1`;

    console.log("Dropping column qr_image_url from company_payment_settings (if exists)...");
    await sql`ALTER TABLE company_payment_settings DROP COLUMN IF EXISTS qr_image_url`;

    console.log("Success: Column dropped (or it did not exist).");
  } catch (err) {
    console.error("Failed to drop column:", err);
    process.exitCode = 1;
  } finally {
    try {
      await sql.end({ timeout: 5 });
    } catch {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
