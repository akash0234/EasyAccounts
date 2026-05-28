# Hardening Serial and Batch Stock Integrity

## Summary
Address the remaining runtime and data-integrity risks in the stock-tracking system before broader rollout. The priority is to make stock consumption concurrency-safe, prevent unsafe product tracking-mode edits, and convert database constraint failures into user-facing validation errors.

## Key Changes
- Make sales consumption of `stock_details` safe under concurrent requests.
- Restrict or validate product `trackingMode` edits once stock or transactions exist.
- Convert duplicate-serial purchase failures into clear 4xx validation responses.
- Replace `count(*) + 1` invoice numbering with a concurrency-safe numbering strategy.

## Implementation Changes
- Invoice stock consumption:
  - Wrap batch and serial stock selection in a locking-safe approach.
  - Use row-level locking or conditional updates so a row can only be consumed if still available at update time.
  - For batch sales, recheck remaining quantity after each locked/conditional update and fail transactionally if insufficient.
  - For serial sales, consume each selected serial with an atomic `available -> sold` transition and fail if any selected serial was already consumed.
- Product tracking-mode edits:
  - On product update, block `trackingMode` changes if the product has any invoice items, stock movements, stock details, or non-zero stock.
  - Return a clear validation error explaining that tracking mode cannot change after stock/transactions exist.
  - Optionally still allow edits when the product is completely unused and has zero stock everywhere.
- Purchase duplicate serial handling:
  - Pre-validate serial duplicates within the submitted line and across the company/product before insert, or catch the DB unique-constraint error and map it to a 400 with the exact serial number if available.
  - Ensure purchase API returns actionable error text rather than a generic 500.
- Invoice numbering:
  - Replace `count(*) + 1` with a monotonic per-company/per-type sequence strategy.
  - Store and increment counters transactionally, or derive numbers from a dedicated sequence table keyed by company and invoice type.
  - Preserve existing `SAL-0001` / `PUR-0001` style formatting.

## Test Plan
- Concurrency:
  - Two simultaneous serial sales for the same serial: only one succeeds.
  - Two simultaneous batch sales against the same limited batch quantity: total sold never exceeds available stock.
- Product edit safety:
  - Changing `trackingMode` on a product with stock or transaction history is rejected.
  - Changing `trackingMode` on an unused zero-stock product succeeds.
- Duplicate serial purchase:
  - Reusing an existing serial on purchase returns a 400 with a clear message.
  - Duplicate serials in the same submitted purchase line are rejected cleanly.
- Invoice numbering:
  - Concurrent invoice creation yields unique invoice numbers without collision.
- Regression:
  - Normal purchase and sale flows for `NONE`, `BATCH`, and `SERIAL` still succeed.
  - Summary stock (`products.currentStock`, `facility_stock.currentStock`) remains in sync with detailed stock.

## Public API / Behavior Changes
- Product update API will reject some `trackingMode` changes that are currently allowed.
- Invoice creation API will return clearer stock/serial validation errors instead of generic failures in duplicate/conflict cases.
- Invoice numbers will remain the same format, but the generation mechanism will change internally.

## Assumptions
- Preventing unsafe `trackingMode` changes is preferred over attempting automatic data migration.
- Existing invoice number format should remain unchanged.
- A failed concurrent stock consume should surface as a normal validation-style business error, not as a server error.
- We are not adding returns, cancellations, or reversals in this hardening pass.
