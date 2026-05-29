import 'dotenv/config';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const sql = postgres(databaseUrl, { max: 1 });

await sql.begin(async (tx) => {
  await tx`
    CREATE TABLE IF NOT EXISTS company_payment_settings (
      id text PRIMARY KEY,
      company_id text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      type payment_method NOT NULL,
      label text NOT NULL,
      is_default boolean NOT NULL DEFAULT false,
      upi_id text,
      upi_payee_name text,
      qr_image_url text,
      bank_account_name text,
      bank_account_number text,
      bank_ifsc text,
      bank_name text,
      bank_branch text,
      cheque_payee_name text,
      instructions text,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `;

  await tx`
    CREATE INDEX IF NOT EXISTS company_payment_settings_company_idx
      ON company_payment_settings(company_id)
  `;

  const legacyPaymentColumn = await tx`
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'companies'
      AND column_name = 'invoice_payment_method'
  `;

  if (legacyPaymentColumn.length > 0) {
    await tx`
      INSERT INTO company_payment_settings (
        id,
        company_id,
        type,
        label,
        is_default,
        upi_id,
        upi_payee_name,
        bank_account_name,
        bank_account_number,
        bank_ifsc,
        bank_name,
        bank_branch,
        cheque_payee_name,
        instructions
      )
      SELECT
        gen_random_uuid()::text,
        id,
        invoice_payment_method,
        CASE invoice_payment_method
          WHEN 'UPI' THEN 'Default UPI'
          WHEN 'BANK' THEN 'Default Bank'
          WHEN 'CHEQUE' THEN 'Default Cheque'
          ELSE 'Default Cash'
        END,
        true,
        upi_id,
        upi_payee_name,
        bank_account_name,
        bank_account_number,
        bank_ifsc,
        bank_name,
        bank_branch,
        cheque_payee_name,
        payment_instructions
      FROM companies c
      WHERE invoice_payment_method IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM company_payment_settings cps
          WHERE cps.company_id = c.id
        )
    `;
  }
});

await sql.end();
console.log('Company payment settings migration completed');
