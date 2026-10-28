# Shared inventory and eBay sales trial

Inventory is the common record for Dashboard, Processing, Sales, item history and Reports. One record represents one physical unit. The production connector reads eBay; it does not publish listings, change prices, dispatch orders or issue refunds there.

## Test in the existing workspace

1. Export a current backup. Update the existing test branch, restart the app and refresh the page.
2. Open Production eBay and Sync now. Existing seller authorisation is retained. The first import also saves a browser recovery copy, downloadable using Pre-import recovery copy. If that copy cannot be saved, the import stops.
3. Pick an active listing previously created only on eBay. Its remaining quantity should appear as individual Listed units in Inventory and Dashboard. Purchase/preparation cost, valuation, identity and location remain unknown until supplied. Asking price is not a valuation or purchase cost.
4. Open a unit and Edit prices & details. Enter the actual purchase/preparation costs and location. Check those details in Inventory and the item history.
5. Check a paid eBay order in Sales, Sold inventory and Sale transactions. Historical orders from the current provider window import separately from today's remaining stock. Revenue splits exactly across multi-unit orders. Fulfilled orders enter Dispatched; others await normal local fulfilment. They are recorded sales, not automatically marked delivered or completed.
6. Review Actual costs for an imported sale. Enter purchase/preparation costs, actual fees, postage, packaging, promotion and buyer postage. Confirmed profit should then appear in Reports. Unknown costs never count as zero profit inputs.
7. Sync again and reload. Inventory, sale and receipt counts must remain unchanged. A subsequent paid order uses the same linked unit, retaining its cost/location. Explicit quantity increases can add stock. Quantity reductions without matching order evidence and missing listings require review; they do not delete stock.
8. If an item already exists in RetroHQ, use Link stock for its exact listing/variation. Untouched available import placeholders are replaced by the chosen owned records. For historical imported sales, Match existing stock replaces untouched sold import records while retaining owned purchase history. Never choose solely by a similar title.
9. Review Sync review and order exceptions. Exact same-date, same-total local eBay sales reconcile without a second receipt. Conflicting local sales, ambiguous variations, refunds/cancellations and changed quantity need review. A return restores stock only after explicit confirmation of physical receipt.

## Boundaries

- The provider reads active listings and orders modified within its current 30-day window; this is not a complete historical account import.
- Partial snapshots pause new inventory/sales imports. Previous saved stock is retained on provider or save failure. More than 2,000 newly created units in one sync requires review before import.
- Shared stock remains local to the current browser profile and app address. This release does not add accounts, shared device storage or scheduled background syncing.
- Matching uses exact production listing ID and variation SKU. Sandbox identities remain separate. Unlinked existing stock is never matched by title; explicitly link it to avoid counting the same physical unit twice.
- eBay quantity and order reads are separate observations. Delayed payment, concurrent restocking or mismatched quantities can require physical reconciliation. A quantity difference is shown rather than silently deleting or recreating units.
- Controlled tests verify RetroHQ behaviour. Real account counts and financial evidence still need operator acceptance.

## Module direction

Keep Inventory as the shared foundation. Sales and Market Insights can become optional product modules; eBay and future marketplace connections can be capabilities within Sales. Connectors must use shared inventory/sale records, duplicate protection and cost rules instead of isolated stock copies. Future paid access will require deliberate account permissions and server enforcement. No billing, licensing, subscriptions or retail product launch is implemented in this trial.
