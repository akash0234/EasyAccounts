import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, customerAddresses } from "@/db/schema";
import { customerAddressSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { eq, and, asc } from "drizzle-orm";

async function ensureCustomer(customerId: string, companyId: string) {
  return db.query.customers.findFirst({
    where: and(eq(customers.id, customerId), eq(customers.companyId, companyId)),
    columns: { id: true },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const customer = await ensureCustomer(id, session.user.companyId);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const rows = await db.query.customerAddresses.findMany({
    where: eq(customerAddresses.customerId, id),
    orderBy: (a, { desc }) => [desc(a.isDefault), asc(a.createdAt)],
  });

  return NextResponse.json(rows);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const customer = await ensureCustomer(id, session.user.companyId);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = customerAddressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const existing = await db.query.customerAddresses.findMany({
    where: eq(customerAddresses.customerId, id),
    columns: { id: true },
  });
  const isFirst = existing.length === 0;
  const wantsDefault = parsed.data.isDefault || isFirst;

  if (wantsDefault) {
    await db
      .update(customerAddresses)
      .set({ isDefault: false })
      .where(eq(customerAddresses.customerId, id));
  }

  const [created] = await db
    .insert(customerAddresses)
    .values({
      customerId: id,
      label: parsed.data.label || null,
      line1: parsed.data.line1,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      pincode: parsed.data.pincode || null,
      isDefault: wantsDefault,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
