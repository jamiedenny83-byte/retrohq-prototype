# Inline stock import and unified Sales

This release replaces the earlier popup/draft/whole-import confirmation workflow. It preserves existing stock, costs, histories, seller authorisation and return ledgers. Inventory remains local to the current browser profile and app address.

## Test the revised workflow

1. Export a backup, update the existing test workspace and restart the server. Refresh RetroHQ.
2. Open Production eBay, enter the existing private PIN and click **Fetch eBay once**. Listing/order evidence is fetched once; missing description/photo/detail batches continue automatically with progress. **Stop loading details** stops optional fetching while retaining available prices/quantities. Individual unavailable listings are disclosed rather than retried indefinitely.
3. Check the inline listing price / market-value figure, quantity, condition, fee estimate, description, specifics and available photos. GBP listing prices fill blank market values, including previously linked stock with a blank manual-value record. Real manual/CeX values remain intact.
4. Confirm the preselected suggested physical units, then **Link selected & update inventory**. Suggestions use SKU/title similarity for ordering only; the explicit button confirms the chosen unit IDs. Titles never link stock automatically. Select different copies inline if condition/location/cost differs.
5. If some copies are genuinely unrecorded, tick the missing-remainder checkbox when linking. For wholly new stock, use **Add N new units to inventory**. Each accepted line updates Inventory immediately; there is no decision popup or second whole-import confirmation. Other draft rows are not executed accidentally.
6. Open Inventory. Accepted units should be visible immediately. Multiple physical copies share an expandable listing/stock group with a quantity; expand it for per-unit costs, locations and history. Search continues to work.
7. Fetch again. Previously linked/imported listing identities move to the expandable **Already imported, duplicate or deferred records** area and refresh in place. They are not offered as new stock again. Repeated source rows with the same listing ID and variation SKU are held outside new inventory; distinct variation SKUs remain distinct.
8. Excess untouched eBay import placeholders are held outside available inventory if they exceed the provider quantity. Purchase data and histories are retained. Valuable/edited owned records are not silently deleted or guessed away. **Check existing links inline** lets an operator select the correct linked units: currently linked units left unselected move into review. **Confirm separate unlisted unit** releases a genuinely different physical copy without claiming it is listed on eBay.
9. **Later** moves a pending line into the expandable review area. **Review inline** brings it back without a popup. Advanced connection evidence and order exceptions are collapsed beneath the main work area.
10. Verify a known paid eBay order in the single **Sales** page. Sold stock, search, receipts, fulfilment, actual costs and legacy sold records are together. The old Sold inventory navigation links redirect to Sales; no sale data is deleted. In-store checkout still accepts edited prices and percentage/fixed fees.

The first revised sync protects a pre-import browser recovery copy before changing linked values or holding duplicate placeholders. Saving failure retains the prior workspace. A current backup can still be exported separately.

## Optional new-user stock CSV

The expandable setup area provides an account/stock checklist and optional CSV preview. No EPOS is required. This is a generic current-stock importer with explicit column mapping, not a verified SumUp/Goodtill account connector or a sales-history importer. Specific provider adapters need real sample exports before acceptance.

- Choose a current-stock CSV under 2 MB with at most 1,000 rows and 2,000 proposed units. Map title, quantity, SKU, barcode, unit purchase cost, market/selling price, condition, location, optional eBay listing ID and currency. Only mapped stock fields are retained; customer contact columns and the raw source file are not saved.
- Prices must be GBP with decimal points. Ambiguous decimal commas, invalid quantities and unsupported currencies are rejected. An unmapped quantity column means one physical unit per row; a mapped-but-blank quantity is an error. Missing purchase/preparation costs remain unknown.
- Preview the proposed rows and counts before importing. Accepted stock appears in Inventory. An exact repeated file is blocked by SHA-256 identity. Repeated SKUs or already-linked listing identities enter CSV duplicate review rather than creating stock.
- Confirm duplicate CSV rows as separate physical units only after verifying they are genuinely additional copies. These are released as unlisted units; the original row and import ledger remain available.
- Initial CSV import protects a separate browser recovery copy. Existing inventory is not reset to start onboarding.

## Limits

The eBay connection remains read-only. Local sales do not yet reduce/end an eBay listing; warnings require manual eBay verification. The current provider history window and quantity/return review rules remain. Asking-price market values and default marketplace fees are estimates, not proof of sold value or final profit. Unknown purchase/preparation/actual selling costs remain excluded from confirmed profit. No retail account system, subscriptions or cross-device stock database is introduced.

Validation uses isolated provider/CSV fixtures. Real account acceptance should check a known listing, a multi-copy product, a historical paid order and repeat-fetch counts before relying on the revised workflow.
