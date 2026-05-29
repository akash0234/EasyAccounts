import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
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

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const membership = await requireCompanyRole("ADMIN");
    const { id } = await context.params;
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
      .update(companyPaymentSettings)
      .set({
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
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(companyPaymentSettings.id, id),
          eq(companyPaymentSettings.companyId, membership.companyId)
        )
      )
      .returning();

    if (!paymentSetting) {
      return NextResponse.json({ error: "Payment setting not found" }, { status: 404 });
    }

    return NextResponse.json(paymentSetting);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const membership = await requireCompanyRole("ADMIN");
    const { id } = await context.params;

    const [paymentSetting] = await db
      .delete(companyPaymentSettings)
      .where(
        and(
          eq(companyPaymentSettings.id, id),
          eq(companyPaymentSettings.companyId, membership.companyId)
        )
      )
      .returning();

    if (!paymentSetting) {
      return NextResponse.json({ error: "Payment setting not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
