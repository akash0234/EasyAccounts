import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companyPaymentSettings } from "@/db/schema";
import { requireCompanyRole } from "@/lib/organization";
import { companyPaymentSettingSchema } from "@/lib/validations";

function nullable(value: string | undefined) {
  return value?.trim() || null;
}

async function clearDefault(companyId: string) {
  await db
    .update(companyPaymentSettings)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(eq(companyPaymentSettings.companyId, companyId));
}

export async function POST(req: NextRequest) {
  try {
    const membership = await requireCompanyRole("ADMIN");
    const body = await req.json();
    const parsed = companyPaymentSettingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    if (parsed.data.isDefault) {
      await clearDefault(membership.companyId);
    }

    const [paymentSetting] = await db
      .insert(companyPaymentSettings)
      .values({
        companyId: membership.companyId,
        type: parsed.data.type,
        label: parsed.data.label.trim(),
        isDefault: parsed.data.isDefault,
        upiId: nullable(parsed.data.upiId),
        upiPayeeName: nullable(parsed.data.upiPayeeName),
        qrImageUrl: nullable(parsed.data.qrImageUrl),
        bankAccountName: nullable(parsed.data.bankAccountName),
        bankAccountNumber: nullable(parsed.data.bankAccountNumber),
        bankIfsc: nullable(parsed.data.bankIfsc),
        bankName: nullable(parsed.data.bankName),
        bankBranch: nullable(parsed.data.bankBranch),
        chequePayeeName: nullable(parsed.data.chequePayeeName),
        instructions: nullable(parsed.data.instructions),
      })
      .returning();

    return NextResponse.json(paymentSetting, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
