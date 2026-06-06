import { db } from "@/db";
import { whatsappAuth } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const GRAPH_BASE = "https://graph.facebook.com/v19.0";

type Creds = {
  accessToken: string;
  phoneNumberId: string;
};

async function getCreds(companyId: string): Promise<Creds | null> {
  const row = await db.query.whatsappAuth.findFirst({
    where: eq(whatsappAuth.companyId, companyId),
  });
  if (!row) return null;
  return { accessToken: row.accessToken!, phoneNumberId: row.phoneNumberId! };
}

async function fbFetch(path: string, accessToken: string, init: RequestInit) {
  const url = `${GRAPH_BASE}/${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  const res = await fetch(url, { ...init, headers: { ...headers, ...(init.headers as any) } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof json === "object" ? JSON.stringify(json) : String(json));
  }
  return json;
}

export async function sendText(companyId: string, to: string, body: string) {
  const creds = await getCreds(companyId);
  if (!creds) throw new Error("WA creds not found for company");
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  } as const;
  return fbFetch(`${creds.phoneNumberId}/messages`, creds.accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null) {
  const appSecret = process.env.WA_APP_SECRET || "";
  if (!signatureHeader) return false;
  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");
  const received = signatureHeader.replace(/^sha256=/i, "");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}
