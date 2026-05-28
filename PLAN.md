# Serial and Batch Wise Stock Management

## Summary
Add product-level stock tracking modes so EasyAccounts can manage:
- Normal stock: quantity only
- Batch stock: quantity per batch
- Serial stock: exact unit-wise serials, optionally grouped under a batch

The system should prevent reselling the same serial-tracked item twice, and should require batch allocation while selling batch-tracked products. Rollout starts only for new tracked purchases after this feature goes live; existing stock totals remain untouched. Newly created tracked products start with zero stock and must receive stock through purchase or a future opening/adjustment entry, not numeric opening stock.

## Key Changes
- Extend product master with a tracking mode field:
  - `NONE`
  - `BATCH`
  - `SERIAL`
- Keep tracking mode per product, not per category or invoice line.
- Add a dedicated lot/serial stock layer instead of relying only on `products.currentStock` and `facility_stock.currentStock`.
- Introduce a stock-detail table for available stock units/lots, scoped by `companyId + facilityId + productId`, with:
  - batch number
  - optional expiry date
  - available quantity for batch-tracked stock
  - serial number for serial-tracked stock
  - status such as available/sold
  - source reference back to purchase/opening entry
- Enforce uniqueness for serial-tracked stock at least within `companyId + productId + serialNo`.
- Keep `products.currentStock` and `facility_stock.currentStock` as summary totals, but derive their updates from the detailed stock rows.

## Implementation Changes
- Product setup:
  - Add tracking mode field to schema, validation, product API, and inventory create/edit form.
  - For `BATCH` and `SERIAL` products, disable free numeric opening stock in product master and store `openingStock = 0`.
- Purchase flow:
  - `NONE`: current behavior remains.
  - `BATCH`: require batch number, allow quantity against that batch, create/update one available batch stock row.
  - `SERIAL`: require exact serial list on the line; quantity must equal serial count; optionally allow one shared batch number for the whole line.
  - Persist purchase invoice item metadata plus detailed stock rows for each batch/serial received.
- Sales flow:
  - `NONE`: current behavior remains.
  - `BATCH`: sales user must allocate quantity from one or more available batches for the chosen facility; if mixed batches are needed, support multi-batch allocation within the same sales line.
  - `SERIAL`: sales user must pick exact available serials from that facility; selected serials become unavailable/sold immediately on invoice creation.
  - Reject sales when requested batch quantity or serial availability is insufficient.
- Invoice/API shape:
  - Expand invoice item payload to support allocation details, not just plain `batchNo` and `slNo`.
  - For batch sales: send an array of batch allocations with `batchNo`, optional expiry, and quantity.
  - For serial purchase/sale: send an array of serial numbers; keep top-level `batchNo` optional for shared grouping.
  - Preserve legacy `batchNo`/`slNo` fields only as display helpers or backward-compatible snapshots if needed, but make detailed allocations the source of truth.
- Inventory visibility:
  - Extend inventory/product detail modal to show facility-wise detailed stock:
    - available batches with quantities
    - available serials count and drilldown
  - Add product detail API enrichment so UI can fetch current batch/serial availability for selling.

## Test Plan
- Product creation:
  - Can create `NONE`, `BATCH`, and `SERIAL` products.
  - `BATCH`/`SERIAL` products cannot start with numeric opening stock.
- Purchase:
  - Batch product purchase increases product total, facility total, and batch availability.
  - Serial product purchase with quantity 3 and 3 serials succeeds.
  - Serial product purchase fails if serial count and quantity differ.
  - Duplicate serial for same product is rejected.
- Sales:
  - Serial sale succeeds only when selecting available serials.
  - Same serial cannot be sold again after first sale.
  - Batch sale succeeds when allocated quantity is within available batch stock.
  - Batch sale fails when allocation exceeds availability.
  - Mixed-batch sale from one invoice line updates each selected batch correctly.
- Totals:
  - Product and facility summary stock stay in sync with detailed stock rows after purchase and sale.
- Rollout/backward compatibility:
  - Existing untracked products and old invoices continue to load normally.
  - Existing total stock remains visible but is not treated as serial/batch-allocatable stock until new tracked purchases are entered.

## Public API / Interface Additions
- Product model/API:
  - add `trackingMode`
- Purchase item payload:
  - add `serialNumbers: string[]`
- Sales item payload:
  - add `batchAllocations: { batchNo: string; quantity: number; expiryDate?: string | null }[]`
  - add `serialNumbers: string[]`
- Product stock detail read API:
  - return available batch/serial options filtered by product and facility for the sales form

## Assumptions
- Tracking modes are exclusive per product: a product is either untracked, batch-tracked, or serial-tracked.
- Serial-tracked products may also carry a batch number on purchase, but sales control is driven by serial selection.
- Existing stock before rollout is not converted automatically into serial/batch detail.
- Editing or reversing old invoices is out of scope for this change unless a separate cancellation/return flow is added later.
- Facility remains mandatory for purchase and sales, and all availability checks are facility-specific.
