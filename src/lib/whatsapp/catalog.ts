import { db } from "@/db";
import { whatsappAuth } from "@/db/schema";
import { eq } from "drizzle-orm";

const GRAPH_BASE = "https://graph.facebook.com/v25.0";
const DEFAULT_IMAGE_URL = "https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg";

function productUrlFor(id: string) {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.WA_WEBHOOK_BASE_URL ||
    "https://example.com"
  ).replace(/\/$/, "");
  return `${base}/product/${encodeURIComponent(id)}`;
}

export type CatalogItemInput = {
  retailer_id: string;
  name: string;
  description?: string;
  price_amount: number; // e.g., 199.0
  currency: string; // e.g., "INR"
  availability: "in stock" | "out of stock" | "preorder";
  image_url?: string;
  image?: { url: string }[];
  sku?: string | null;
};

async function getCatalogCreds(companyId: string) {
  const row = await db.query.whatsappAuth.findFirst({
    where: eq(whatsappAuth.companyId, companyId),
  });
  if (!row) throw new Error("WhatsApp/Catalog credentials not found for company");
  if (!row.accessToken) throw new Error("Missing access_token for company");
  if (!row.catalogId) throw new Error("Missing catalog_id for company");
  return { accessToken: row.accessToken, catalogId: row.catalogId };
}

async function graphPost(path: string, accessToken: string, body: any) {
  const url = `${GRAPH_BASE}/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof json === "object" ? JSON.stringify(json) : String(json));
  }
  return json;
}

export async function pushItemsBatch(companyId: string, items: CatalogItemInput[]) {
  const { accessToken, catalogId } = await getCatalogCreds(companyId);
  if (!items.length) return { success: true, message: "No items to sync" } as const;

  // Deduplicate by retailer_id so batch has unique items
  const unique = new Map<string, CatalogItemInput>();
  for (const it of items) {
    unique.set(it.retailer_id, it); // last wins
  }
  const deduped = Array.from(unique.values());

  // Legacy items_batch payload (no item_type)
  const legacyRequests = deduped.map((i) => ({
    method: "CREATE" as const,
    retailer_id: i.retailer_id,
    data: {
      name: i.name,
      description: i.description || "",
      price: Number(i.price_amount.toFixed(2)),
      currency: i.currency,
      availability: i.availability,
      image_url: i.image_url || DEFAULT_IMAGE_URL,
      url: productUrlFor(i.retailer_id),
      additional_variant_attributes: i.sku ? { sku: i.sku } : undefined,
      condition: "new",
    },
  }));
  const legacyPayload = { allow_upsert: true, requests: legacyRequests };

  // Commerce batch payload (requires item_type)
  const batchRequests = deduped.map((i) => ({
    method: "CREATE" as const,
    item_type: "PRODUCT_ITEM",
    retailer_id: i.retailer_id,
    data: {
      name: i.name,
      description: i.description || "",
      price: Number(i.price_amount.toFixed(2)),
      currency: i.currency,
      availability: i.availability,
      image_url: i.image_url || DEFAULT_IMAGE_URL,
      url: productUrlFor(i.retailer_id),
      additional_variant_attributes: i.sku ? { sku: i.sku } : undefined,
      condition: "new",
    },
  }));
  const batchPayload = { allow_upsert: true, requests: batchRequests };

  console.log("requests:", legacyPayload);

  try {
    // Try legacy items_batch first
    return await graphPost(`${catalogId}/items_batch`, accessToken, legacyPayload);
  } catch (e: any) {
    const msg = e?.message ?? "";
    let parsed: any = null;
    try { parsed = JSON.parse(msg); } catch {}
    const errMsg: string = parsed?.error?.message || String(msg);
    const needsBatch = errMsg.includes("item_type is required") || errMsg.includes("Unsupported post request");
    if (!needsBatch) throw e;

    // Fallback to /batch with item_type
    console.log("fallback:/batch requests:", batchPayload);
    return await graphPost(`${catalogId}/batch`, accessToken, batchPayload);
  }
}
