import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/whatsapp";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.WA_VERIFY_TOKEN) {
    return new NextResponse(challenge || "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-hub-signature-256");
  const raw = await req.text();
  const ok = verifyWebhookSignature(raw, signature);
  if (!ok) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  try {
    const body = JSON.parse(raw);
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
