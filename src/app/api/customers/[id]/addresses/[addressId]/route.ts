import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, customerAddresses } from "@/db/schema";
import { customerAddressSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { eq, and, ne } from "drizzle-orm";

async function ensureAddress(
  addressId: string,
  customerId: string,
  companyId: string
) {
  return db
    .select({ id: customerAddresses.id })
    .from(customerAddresses)
    .innerJoin(customers, eq(customers.id, customerAddresses.customerId))
    .where(
      and(
        eq(customerAddresses.id, addressId),
        eq(customerAddresses.customerId, customerId),
        eq(customers.companyId, companyId)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; addressId: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, addressId } = await params;
  const owned = await ensureAddress(addressId, id, session.user.companyId);
  if (!owned) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = customerAddressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  if (parsed.data.isDefault) {
    await db
      .update(customerAddresses)
      .set({ isDefault: false })
      .where(
        and(
          eq(customerAddresses.customerId, id),
          ne(customerAddresses.id, addressId)
        )
      );
  }

  const [updated] = await db
    .update(customerAddresses)
    .set({
      label: parsed.data.label || null,
      line1: parsed.data.line1,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      pincode: parsed.data.pincode || null,
      isDefault: parsed.data.isDefault ?? false,
      updatedAt: new Date(),
    })
    .where(eq(customerAddresses.id, addressId))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; addressId: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, addressId } = await params;
  const owned = await ensureAddress(addressId, id, session.user.companyId);
  if (!owned) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  await db
    .delete(customerAddresses)
    .where(eq(customerAddresses.id, addressId));

  return NextResponse.json({ message: "Deleted" });
}
