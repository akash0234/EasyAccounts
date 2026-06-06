# WhatsApp Integration: Plan and Sandbox

## Objectives
- Enable companies to:
  - Sync ERP inventory with WhatsApp Business Catalog (Commerce Manager) and send product messages.
  - Send custom selling messages (text, media, interactive) with a message builder.
- Provide a sandbox for safe development and testing before production rollout.
- Multi-tenant by default: per-company WABA credentials and Catalog linkage from day one.
- Common WhatsApp module to be reused across APIs, background jobs, and UI.
- Two-way messaging (send and receive) included in MVP scope.

## Recommended Stack & Approach
- WhatsApp Business Platform: WhatsApp Cloud API (Meta) for direct integration.
- Catalog: Facebook Commerce Manager Catalog linked to the WhatsApp phone number for product messages (single and multi-product messages).
- Runtime: Next.js app routes for webhooks and outbound messaging (keep APIs in `src/app/api/…`).
- Persistence: Reuse existing DB (Drizzle) for WhatsApp entities (contacts, messages, templates, catalog mapping, auth tokens).
- Security: Webhook signature verification, secret management via `.env.local`.
- Common module: `src/lib/whatsapp` (tenant-aware service) used by API routes, background jobs, and UI screens.

Notes
- A BSP (Twilio/MessageBird/Gupshup) is optional. Given you already have a WhatsApp Business account, Cloud API is recommended for full catalog/product messaging support via Meta Graph APIs.

---

## Multi-tenant Design & Tenant Resolution
- Per-company credentials are stored in DB (`whatsapp_auth`) including: `phone_number_id`, `access_token`, `business_account_id`, `catalog_id`. If multiple Meta Apps are used, also store `app_id` and `app_secret` per company.
- Outbound tenant resolution: APIs invoke a service instantiated with `company_id`, which fetches that company’s credentials from `whatsapp_auth`.
- Inbound tenant resolution (webhook): Use `metadata.phone_number_id` from the webhook payload to look up the `company_id` in `whatsapp_auth`.
- Credential protection: Encrypt tokens at rest; use an env key for encryption/decryption.
- Catalog mapping: `whatsapp_catalog_map` is always keyed by `company_id` + `retailer_id`.
- Two-way scope: Store inbound messages, maintain 24-hour sessions per `wa_id` per company, and support outbound replies within session or via templates.

## Common WhatsApp Module (Spec)
- Location: `src/lib/whatsapp/`
- Factory: `getService(companyId)` returns a tenant-aware service.
- Service methods: `sendText`, `sendMedia`, `sendInteractive`, `sendTemplate`, `uploadMedia`, `verifyWebhookSignature`.
- Catalog methods: `upsertItem(companyId, product)`, `batchUpsert(companyId, products)`.
- Tenant lookup: by `companyId` (outbound) or by `phone_number_id` (webhook inbound).

---

## Sandbox Setup (Cloud API)
This section outlines a local developer sandbox using Meta’s test number and temporary access token.

1) Create/Use a Meta App and Link WABA
- In Meta for Developers, create an app and add the “WhatsApp” product.
- Create or link a WhatsApp Business Account (WABA) and a test phone number (provided by Meta for sandbox).

2) Generate Temporary Access Token
- In the WhatsApp > Getting Started section, generate a temporary access token for quick tests.
- For long-term, create a system user + permanent token in Business Manager and store it in `.env.local`.

3) Add Test Recipient Numbers
- In the WhatsApp Getting Started page, add up to 5 recipient phone numbers (E.164) permitted for sandbox messages.

4) Webhook Configuration
- Expose your local Next.js server via a tunnel (e.g., ngrok or Cloudflared) to receive webhooks.
- Set the webhook callback URL in the app dashboard and verify token.
- Subscribe to WhatsApp Webhooks (messages, message_status, etc.).

5) Next.js Endpoints (to implement)
- `POST /api/whatsapp/webhook` — receives events (messages and statuses). Must validate `X-Hub-Signature-256` with the app secret.
- `GET /api/whatsapp/webhook` — webhook verification (echoes `hub.challenge` when `hub.verify_token` matches configured token).
- `POST /api/whatsapp/send` — internal endpoint to send messages via Cloud API.

6) First Message Test
- Use cURL or Postman to call `https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages` with the access token.
- Start with a session text message to one of your whitelisted test numbers.

References
- Cloud API docs: https://developers.facebook.com/docs/whatsapp/cloud-api
- Webhooks: https://developers.facebook.com/docs/graph-api/webhooks/getting-started
- Product messages: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/product-messages

---

## High-Level Architecture (ERP Integration)
- Client (ERP Admin/Dashboard):
  - Message Builder UI for ad-hoc session messages and approved template messages.
  - Catalog management screen: show link status to Commerce Manager, sync states, product mappings.
- Server (Next.js API Routes):
  - WhatsAppService for outbound calls to Cloud API.
  - Webhook handler to ingest messages and delivery receipts, log conversations, and update 24-hour session windows.
  - CatalogSyncService to upsert items to Commerce Manager via Graph API.
- Database (Drizzle):
  - whatsapp_auth (per company)
  - whatsapp_contacts
  - whatsapp_messages
  - whatsapp_templates
  - whatsapp_catalog_map (ERP product ↔ catalog item retailer_id)

---

## Inventory ↔ WhatsApp Catalog Sync
Goal: Mirror ERP products to a Commerce Manager Catalog and enable product messages referencing those items.

Prerequisites
- A Commerce Manager Catalog owned by your Business.
- Catalog linked to your WhatsApp phone number for product messages.

Data Mapping (example fields)
- ERP Product: id, sku, name, description, price, currency, image_url, in_stock, brand, category.
- Catalog Item: retailer_id (unique), name, description, price (amount + currency), availability, image_urls[], additional_image_urls[], brand, category.

Sync Strategy
- ERP is the source of truth; one-way push from ERP to WhatsApp Catalog.
- Use `retailer_id` = ERP product id or stable SKU to ensure idempotent upserts.
- On product create/update:
  - Upsert item in the Catalog (Graph API). Batch where possible.
  - Update `whatsapp_catalog_map` with Graph IDs if needed.
- On delete or discontinued:
  - Mark item as `out_of_stock` or remove based on policy.
- Stock Updates
  - On stock changes, push availability and price updates.
- Media
  - Prefer hosting images on your CDN; provide image URLs to Commerce Manager.

Key Endpoints (Graph API)
- Catalog items: `POST /{catalog_id}/items`, `POST /{catalog_id}/items_batch`
- Product sets/feeds (optional for large catalogs)

Edge Cases
- Price/availability rules by country; ensure currency codes match.
- Catalog policies and data quality checks (Meta may reject invalid data).

---

## Messaging Capabilities & Builder
Message Types to Support (MVP → Advanced)
- Text (session messages within 24-hour window)
- Media: image, document (PDF), video (via Cloud API media upload -> media id)
- Interactive: quick reply buttons, call-to-action buttons
- List messages (structured menus)
- Product messages: single-product and multi-product (requires linked Catalog)
- Template messages (HSM) for business-initiated conversations outside 24h window

24-Hour Session Window
- Free-form messages allowed within 24 hours of user’s last message.
- Outside 24 hours, only approved templates can initiate a new conversation.

Template Management
- Create/approve templates in Business Manager or via Graph API.
- Store template definitions (name, language, category, components, placeholders).

Message Builder UI (MVP)
- Compose text with variables (e.g., {{customer_name}}, {{invoice_total}})
- Attach media (image, pdf) — upload to Cloud API or use URLs
- Choose recipients/segments (from ERP customers filtered by tags, purchase history, dues)
- Preview (mobile-like preview), test send to admin number
- Send now / Schedule later

Message Builder UI (Future)
- Interactive components (buttons, lists)
- Product message composer (search catalog, add products/sections)
- Template composer with placeholder filling and language variants
- A/B testing and performance analytics

---

## Webhook Handling
Events to Ingest
- Message inbound: store message, link to contact (create if not exists), update session window
- Message status: delivered, read, failed — update `whatsapp_messages`
- Template status updates (optional)

Security
- Verify `X-Hub-Signature-256` using app secret on every webhook POST
- Verify token handshake during webhook setup (GET)

Observability
- Structured logs with message_id, phone_number_id, wa_id, company_id
- Error logging and retry strategy for transient errors

---

## Data Model Sketch (tables/collections)
- whatsapp_auth: { company_id, waba_id, phone_number_id, app_id, app_secret, access_token, verify_token, webhook_subscriptions[] }
- whatsapp_contacts: { id, company_id, wa_id (E.164), name, opt_in_status, last_session_at }
- whatsapp_messages: { id, company_id, direction, to_wa_id, from_wa_id, type, payload_json, status, error, message_ts, template_name?, media_id? }
- whatsapp_templates: { id, company_id, name, language, category, components_json, status }
- whatsapp_catalog_map: { id, company_id, erp_product_id, retailer_id, catalog_item_id?, last_synced_at, status }

---

## Environment & Configuration
- Global env (app-wide):
  - WA_APP_ID=
  - WA_APP_SECRET=
  - WA_VERIFY_TOKEN=
  - WA_WEBHOOK_BASE_URL= (public https URL for webhook)
  - WA_CRED_ENC_KEY= (key to encrypt/decrypt per-company access tokens)

- Per-company credentials in DB (`whatsapp_auth`):
  - access_token, business_account_id, phone_number_id, catalog_id, app_id?, app_secret?

Store env in `.env.local` (dev) and in your secret manager for prod. Populate per-company rows via an admin UI or a secure script.

---

## MVP Scope (2–3 iterations)
1) Multi-tenant Outbound & Inbound Basics
- Admin inserts per-company creds in DB. Send session text + image via service instantiated with `company_id`.
- Webhook online (GET + POST) with signature validation. Inbound messages resolve `company_id` by `phone_number_id`.
- Persist inbound/outbound and status updates. Two-way messaging active within 24h session.

2) Catalog Link & Minimal Sync (Per Company)
- Link each company’s WABA to its Catalog in Commerce Manager.
- Minimal sync: upsert a small set of ERP products into the Catalog per company.
- Send a single-product message from the builder for a chosen company.

3) Message Builder v1
- Basic composer with variables, media attach, single/multiple recipients, preview, test-send.
- Company switcher in the UI to operate on a chosen tenant.

---

## Future Improvements Backlog
- Full catalog sync with batch upserts and delta detection
- Multi-product messages with dynamic sections per customer segment
- Template lifecycle in-app (create, submit for approval, status tracking)
- Segmentation UI: RFM, outstanding dues, product affinity
- Broadcast with throttling, rate-limit awareness, retry/backoff
- Conversation analytics: delivered/read rates, template performance, opt-out tracking
- Opt-in capture flows (QR codes, short links), double opt-in
- Media library with CDN integration and deduplication
- Tenant admin tools (credential rotation, token refresh flows, catalog health)
- Automated stock status updates to Catalog on inventory changes
- Failover channels (SMS/Email) when WA window closed or errors occur

---

## Risks, Policies, and Compliance
- Opt-in requirement: ensure customers have valid opt-in before marketing messages.
- Template approval timelines: plan lead time for new templates.
- Quality rating/tier limits may throttle outbound volumes; monitor and improve quality.
- Data protection: handle PII securely, encrypt secrets, limit retention per policy.
- Pricing: conversation-based pricing varies by country; monitor cost.

---

## Rollout Plan
- Dev Sandbox: local + test number + temporary token
- Staging: system user token, permanent phone number, limited internal recipients
- Production: verified business assets, monitoring/alerts, gradual segment rollouts

---

## Quick Test Snippets (reference)
Send Text (Cloud API)
- POST `https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages`
- Body:
```json
{
  "messaging_product": "whatsapp",
  "to": "+91XXXXXXXXXX",
  "type": "text",
  "text": { "body": "Hello from EasyAccounts sandbox!" }
}
```

Send Single Product Message (after Catalog link)
- POST `https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages`
- Body:
```json
{
  "messaging_product": "whatsapp",
  "to": "+91XXXXXXXXXX",
  "type": "interactive",
  "interactive": {
    "type": "product",
    "body": { "text": "Recommended for you" },
    "footer": { "text": "EasyAccounts" },
    "action": {
      "catalog_id": "{WA_CATALOG_ID}",
      "product_retailer_id": "{ERP_OR_SKU_AS_RETAILER_ID}"
    }
  }
}
```

---

## Next Steps (Actionable)
- Confirm choice: Cloud API vs BSP (default: Cloud API).
- Share your Business Manager access (or confirm existing app/WABA setup) to obtain `WA_*` IDs.
- I’ll scaffold API routes for webhook and sending, plus a minimal message builder UI (behind a feature flag).
- I’ll prepare a small Catalog sync script to upsert a few products and test a product message.
