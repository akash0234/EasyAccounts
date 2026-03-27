# GST SaaS - Milestone-Based Roadmap (Distributor & Pharmacy Focus)

## 🎯 Strategy
Start as a Ledger + Billing App, then evolve into:
→ GST Filing Platform  
→ Full Accounting SaaS  

Primary ICP:
- Distributors
- Medicine shops (high invoice frequency, GST heavy)

---

# 🧱 PHASE 0 - Foundation (Week 0–1)

## Goals:
- Multi-tenant SaaS base
- Auth + Company setup

## Modules:
- Authentication (JWT / NextAuth)
- Company / Tenant setup
- Financial Year handling
- Basic dashboard shell

## Output:
- User can create company & login
- Tenant isolation ready

---

# 🧩 PHASE 1 - Customer & Vendor Core (Week 1–3)

## 🎯 THIS IS YOUR PIVOT PHASE

## Modules:

### 1. Customer Management
- Add / Edit / Delete customers
- GSTIN validation
- Credit limit
- Billing + shipping address
- Ledger auto-create

### 2. Vendor Management
- Same structure as customers
- Purchase-side ledger

### 3. Ledger System (IMPORTANT CORE)
- Unified ledger engine:
  - Customer ledger
  - Vendor ledger
- Transactions:
  - Debit / Credit entries
- Running balance
- Opening balance support

## Key Features:
- Search + filters
- Ledger statement export (PDF)
- Aging report (very important for distributors)

## Output:
You now have a usable business tool
→ Can be sold as "Udhar / Ledger App for Shops"

---

# 💰 PHASE 2 - Transactions Layer (Week 3–6)

## Modules:

### 1. Sales Module
- Create sales invoice (basic)
- Link customer
- Add items manually (no inventory yet)
- Auto ledger entry

### 2. Purchase Module
- Vendor bills
- Purchase entry
- Ledger integration

### 3. Payment Module
- Record payments:
  - Cash / Bank / UPI
- Partial payments
- Auto-adjust against invoices

## Key Features:
- Outstanding tracking
- Payment reminders (basic)

## Output:
Now it's a billing + udhar system
→ Very useful for medicine shops

---

# 🧾 PHASE 3 - Product & GST Basics (Week 6–9)

## Modules:

### 1. Product Management
- Product name
- HSN/SAC
- GST %
- Unit (strip, box, pcs for pharmacy)

### 2. GST Engine (Basic)
- CGST / SGST / IGST calculation
- Tax breakdown in invoice

### 3. Invoice Upgrade
- Proper GST invoice format
- PDF generation
- Print-friendly layout

## Pharmacy-specific:
- Batch number
- Expiry date (important for medicine shops)

## Output:
Now it's a GST billing software (entry-level)

---

# 📊 PHASE 4 - Reports & Business Insights (Week 9–12)

## Modules:

### Reports:
- Sales report
- Purchase report
- Customer outstanding
- Vendor payable
- GST summary

### Key Features:
- Date filters
- Download (Excel/PDF)

## Output:
Business owners start depending on your app daily

---

# 🔄 PHASE 5 - GST Filing Readiness (Week 12–16)

## Modules:

### GST Reports:
- GSTR-1 data prep
- GSTR-3B summary

### Features:
- JSON export
- Error validation (GSTIN, tax mismatch)

## Output:
CA-friendly system  
→ Start targeting accountants

---

# 🚀 PHASE 6 - SaaS Monetization (Parallel after Phase 3)

## Modules:

### Subscription System
- Plans:
  - Free (limited invoices)
  - Pro (GST + reports)
  - Enterprise

### Billing:
- Razorpay / Stripe
- Auto renewal

## Output:
Revenue starts here

---

# ⚙️ PHASE 7 - Advanced Features (Post Product-Market Fit)

## Add gradually:

### 1. Inventory
- Stock tracking
- Batch tracking (critical for pharmacy)
- Expiry alerts

### 2. Automation
- Payment reminders (WhatsApp)
- Recurring invoices

### 3. Bank Integration
- Statement import
- Auto reconciliation

### 4. Multi-user roles
- Staff login for shops

---

# 🧠 PRODUCT POSITIONING (IMPORTANT)

## Phase 1–2:
"Simple Udhar + Ledger App for Shops"

## Phase 3–4:
"GST Billing Software for Distributors & Medicine Shops"

## Phase 5+:
"Complete GST + Accounting SaaS"

---

# 🔥 CRITICAL DESIGN DECISIONS

## 1. Ledger-first architecture
Everything should hit ledger:
- Sales → Debit customer
- Payment → Credit customer
- Purchase → Credit vendor

## 2. Keep UI fast
Your users:
- Shop owners
- Not tech-savvy
→ Speed > features

## 3. Offline-first mindset (later)
- Medicine shops need reliability

---

# 📈 SUCCESS METRICS

- Daily active users (shops)
- Invoices created per day
- Payment entries per day
- Retention after 7 days

---

# 🛣️ FASTEST PATH TO MARKET

1. Build Phase 1 + 2 only
2. Launch locally (Kolkata distributors)
3. Get feedback
4. Then build GST

---

# ⚠️ COMMON MISTAKES

- Starting with full GST filing  
- Overbuilding inventory early  
- Ignoring ledger correctness  
- Complex UI  

---

# 🧩 NEXT STEP (Recommended)

Design DB schema for:
- Ledger
- Transactions
- Customer/Vendor

This is your backbone.
