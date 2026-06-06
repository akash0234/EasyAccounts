import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { whatsappAuth } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await db.query.whatsappAuth.findFirst({
    where: eq(whatsappAuth.companyId, session.user.companyId),
  });

  return NextResponse.json({ ok: true, credentials: row || null });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const {
    accessToken,
    catalogId,
    businessAccountId,
    phoneNumberId,
    appId,
    appSecret,
  }: {
    accessToken?: string;
    catalogId?: string;
    businessAccountId?: string;
    phoneNumberId?: string;
    appId?: string;
    appSecret?: string;
  } = body || {};

  const nothingProvided = !accessToken && !catalogId && !businessAccountId && !phoneNumberId && !appId && !appSecret;
  if (nothingProvided) {
    return NextResponse.json(
      { ok: false, error: "Provide at least one field to update" },
      { status: 400 }
    );
  }

  const existing = await db.query.whatsappAuth.findFirst({
    where: eq(whatsappAuth.companyId, session.user.companyId),
  });

  if (existing) {
    const patch: any = { updatedAt: new Date() };
    if (accessToken !== undefined) patch.accessToken = accessToken;
    if (catalogId !== undefined) patch.catalogId = catalogId;
    if (businessAccountId !== undefined) patch.businessAccountId = businessAccountId;
    if (phoneNumberId !== undefined) patch.phoneNumberId = phoneNumberId;
    if (appId !== undefined) patch.appId = appId;
    if (appSecret !== undefined) patch.appSecret = appSecret;
    const [updated] = await db.update(whatsappAuth).set(patch).where(eq(whatsappAuth.id, existing.id)).returning();
    return NextResponse.json({ ok: true, credentials: updated });
  }

  if (!appId || !appSecret) {
    return NextResponse.json(
      { ok: false, error: "appId and appSecret are required for first-time setup" },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(whatsappAuth)
    .values({
      companyId: session.user.companyId,
      accessToken: accessToken || null,
      catalogId: catalogId || null,
      businessAccountId: businessAccountId || null,
      phoneNumberId: phoneNumberId || null,
      appId,
      appSecret,
    })
    .returning();

  return NextResponse.json({ ok: true, credentials: created });
}
