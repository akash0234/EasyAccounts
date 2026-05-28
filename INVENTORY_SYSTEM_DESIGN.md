# Inventory Interaction System

## Goal
Make stock-heavy workflows predictable across inventory, purchase, and sales when products can be:
- `NONE`: quantity-only stock
- `BATCH`: quantity allocated from one or more batches
- `SERIAL`: exact unit selection by serial number

The backend model already supports this. This document makes the UI/system contract concrete so future screens reuse the same mental model.

## Canonical Concepts
- `Facility`: the required stock context for purchase and sales.
- `Current Stock`: the available quantity for the selected facility.
- `Allocation`: the user-selected stock source for a sales line.
- `Suggestion`: a selectable batch or serial chip shown from live facility availability.
- `Remaining`: requested quantity minus already allocated quantity.

## Required Interaction Rules
- Users cannot add or select line items until a facility is chosen.
- Every line shows stock in a dedicated `Current Stock` column, not buried in dropdown labels.
- `NONE` products allow free quantity entry with stock visibility only.
- `BATCH` products allocate quantity from one or more available batches in the same facility.
- `SERIAL` products allocate exact serial numbers; selected serial count must equal quantity.
- Changing facility clears all batch/serial allocations because availability is facility-specific.
- Changing product clears old batch/serial data because allocation belongs to that product only.

## Reusable UI Primitives
- `StockCell`
  - Purpose: show current stock for one product in one facility.
  - Output:
    - `NONE`/`BATCH`: `12 PCS`
    - `SERIAL`: `5 PCS`
- `AllocationField`
  - Purpose: editable allocation value for `batchNo` or `slNo`.
  - Behavior:
    - free text remains allowed
    - selection chips append to the value in canonical invoice format
- `SuggestionPanel`
  - Purpose: show available batches or serials from facility stock.
  - Includes:
    - clickable chips
    - `Auto Fill`
    - selected vs requested summary
- `AllocationSummary`
  - Purpose: compact summary for inventory/detail/report screens.
  - Examples:
    - `PB-JUL-A:30, PB-AUG-B:6`
    - `IMEI001, IMEI002, IMEI003`

## Screen Contracts
### Sales
- Facility selection comes before items.
- Product dropdown shows product identity and tracking mode only.
- A `Current Stock` column always appears beside product.
- `BATCH` lines show:
  - allocation input
  - batch suggestion chips
  - allocated vs requested footer
- `SERIAL` lines show:
  - serial input
  - serial suggestion chips
  - selected vs requested footer

### Purchase
- Facility remains mandatory.
- `BATCH` purchase lines capture incoming lot number and optional expiry.
- `SERIAL` purchase lines capture exact serial list and optional shared batch.
- Purchases are the primary source of tracked stock creation.

### Inventory Detail
- Facility cards show summary stock.
- Tracked products expose drilldowns:
  - batches with available quantity
  - serial count and serial list

## Canonical Data Shapes
### Batch allocation
```ts
batchAllocations: Array<{
  batchNo: string;
  quantity: number;
  expiryDate?: string | null;
}>
```

### Serial allocation
```ts
serialNumbers: string[]
```

### Legacy display fields
- `batchNo`
- `slNo`

These remain valid as UI snapshots, but allocation arrays and serial arrays are the source of truth.

## Seed Data Requirements
The demo dataset must include:
- at least one pure bulk product with stock in multiple facilities
- at least one serial product with remaining available serials after some seeded sales
- at least one batch product with multiple live batches in the same facility
- at least one seeded mixed-batch sale to exercise allocation chips
- at least one seeded serial sale to exercise remaining serial suggestions

## Seeded Journeys
- `TV / Phone`: serial pickers with remaining IMEIs/chassis numbers after sales.
- `Microwave / Power Bank`: multi-batch allocation with partial batch depletion.
- `Soundbar / Headphones / Charger`: normal quantity-only stock with facility stock column.

## Decision
All future inventory-facing screens should reuse this interaction model rather than invent page-specific stock widgets.
