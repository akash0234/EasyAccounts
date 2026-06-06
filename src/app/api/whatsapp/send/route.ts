import { NextRequest, NextResponse } from "next/server";
import { sendText } from "@/lib/whatsapp";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { to, body } = await req.json();
  if (!to || !body) {
    return NextResponse.json({ error: "to and body are required" }, { status: 400 });
  }
  try {
    const r = await sendText(session.user.companyId, to, body);
    return NextResponse.json(r, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Send failed" }, { status: 400 });
  }
}
