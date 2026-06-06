import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { whatsappAuth } from "@/db/schema";
import { eq } from "drizzle-orm";

const GRAPH_BASE = "https://graph.facebook.com";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await db.query.whatsappAuth.findFirst({
    where: eq(whatsappAuth.companyId, session.user.companyId),
  });

  if (!row) {
    return NextResponse.json({ ok: false, error: "No whatsapp_auth credentials for company" }, { status: 400 });
  }
  if (!row.appId || !row.appSecret) {
    return NextResponse.json({ ok: false, error: "Missing appId/appSecret" }, { status: 400 });
  }

  try {
    // Generate application access token using client_credentials
    const url = `${GRAPH_BASE}/oauth/access_token?client_id=${encodeURIComponent(row.appId)}&client_secret=${encodeURIComponent(row.appSecret)}&grant_type=client_credentials`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || !data?.access_token) {
      throw new Error(typeof data === "object" ? JSON.stringify(data) : String(data));
    }
    const appAccessToken: string = data.access_token;
    return NextResponse.json({ ok: true, appAccessToken, hasSavedAccessToken: !!row.accessToken });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 400 });
  }
}
