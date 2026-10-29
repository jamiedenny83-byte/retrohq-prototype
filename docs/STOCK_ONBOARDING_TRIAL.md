# First import, daily stock review and eBay listing details

This trial replaces the automatic first-import behaviour in the earlier shared-inventory trial. Existing saved stock, sale ledgers and seller connections are retained. No customer accounts, subscriptions, marketplace writes or shared-device storage are introduced.

## Initial setup

1. Export a current backup, update the existing test workspace, restart the server and refresh RetroHQ.
2. Open Production eBay and Sync now. Initial stock setup shows a preview. Inventory and sales remain unchanged while decisions are saved. Refreshing the browser retains the draft decisions. Fetching a newer snapshot deliberately clears old decisions because quantities or prices may have changed.
3. Review each active listing. Choose Keep current links, Link existing RetroHQ units, Confirm additional units, or Leave for later. Titles are hints only. Use unit numbers, condition, location, listing identity and variation SKU to confirm physical copies.
4. For multiple copies, select that many separate stock records. If some copies are already recorded and others are genuinely missing, select the existing records and tick the explicit permission to add the remaining quantity. The review summary shows exactly how many new available and sold units will be created.
5. Review historical paid orders separately from today's unsold quantity. Link existing physical records, confirm previously unrecorded sold units, or leave the order for later. A partial existing allocation can add only the confirmed missing remainder. The same physical unit cannot supply both available stock and a historical sale.
6. Confirm initial import. A browser recovery copy is saved before changes. The confirmation fails without changing stock if recovery/saving fails, quantities disagree, a selected unit is unavailable, or the snapshot is partial. The Pre-import recovery copy button downloads the protected copy.

If three copies already exist in RetroHQ and the same three appear on eBay, linking them must leave three units, not six. If two are recorded and eBay has three, linking two and confirming one additional unit must leave three available units. Costs and histories of the owned records remain intact.

## Daily use

- Record purchases once in RetroHQ with actual costs and storage location. Listing on eBay does not require entering the same physical stock again.
- Sync now updates exact known links and paid sales. New listings, extra quantities and unmatched orders wait in Day-to-day stock review. Confirm links or genuinely new units before they enter stock. Leave for later remains resumable.
- Historical order identity and line identity prevent duplicate sales/receipts on repeat sync or reload. Missing listings and unexplained quantity differences retain stock and display exceptions.
- An eBay sale moves the same linked unit into Sales and normal local fulfilment. Confirm actual costs for final profit.
- For in-store sales, use Record sale, choose In Store EPOS and edit the agreed price. Expand Channel fees (editable) to enter a percentage or fixed fee. The configured channel default is prefilled. In-store collection completes the local sale.
- If a unit sells elsewhere while eBay still lists it, review the warning and manually adjust/end the eBay listing. This connection remains read-only.

## Imported information and pricing

Imported eBay units use the displayed GBP listing price as their editable market-value estimate, labelled eBay listing asking price. This is the operator-requested estimate, not an independently verified CeX valuation. Existing owned/manual values are preserved; manual overrides of imported values are not overwritten on sync.

The configured eBay percentage or fixed fee attaches automatically as a selling-fee estimate. Actual order-level fee evidence takes precedence when safely attributable. Missing fee evidence uses the default estimate but does not confirm profit. Marketplace fees are separate from preparation/repair costs. Unknown purchase/preparation costs remain unknown until entered.

Available listing data includes title, listing ID, variation SKU, remaining quantity, asking price, start date, description, category, condition and condition notes, brand, item/variation specifics, barcodes/product references, photos and listed shipping/return terms. It is retained as eBay evidence and shown under Imported eBay details and fee estimate; approved eBay-hosted images also appear under Photos. Descriptions are plain text, not executable listing HTML. Buyer/seller contact records are excluded.

The summary call does not contain all details. Read-only GetItem enrichment fetches up to 20 distinct listings per sync and resumes pending listings on subsequent syncs. Loaded details are cached for up to an hour. Missing/unavailable details are disclosed; they do not discard price, quantity or paid-order evidence. Some ended/old listings may no longer return complete details.

## Checks for this trial

1. Preview and save decisions, then reload: stock counts must stay unchanged until confirmation.
2. Link three same-title copies; confirm their purchase costs and locations remain intact.
3. Try two existing copies plus one confirmed additional copy; only one new unit should appear.
4. Confirm one eBay-only listing and check its price-based market estimate, fee default, description, condition, brand, specifics, barcode and available photos.
5. Repeat sync: stock/sale/receipt counts must remain stable. A new listing should wait for review.
6. Check an existing paid order in Sales and Sale transactions. Actual-cost confirmation should control final profit.
7. Record a genuine in-store sale at an edited price/fee; confirm it leaves available stock and enters completed sales. If its eBay listing remains active, verify the warning rather than adding the sold unit again.
8. Leave an item for later; it must remain in the review queue without creating stock. Review unexplained quantity differences and refunds separately.

## Future editable eBay connection

When separately implemented and authorised, local sales should request an eBay quantity reduction for the sold units and end the listing only when remaining quantity is zero. It will need retry/duplicate protection, conflict handling and visible confirmation of success. This release does not request write permission or send those changes.

Inventory remains the foundation for optional future Sales and Market Insights modules. This setup flow runs inside the existing single-browser prototype; it does not create a retail customer account or central multi-device inventory.

Technical references: [GetMyeBaySelling](https://developer.ebay.com/devzone/xml/docs/reference/ebay/getmyebayselling.html), [GetItem](https://developer.ebay.com/devzone/xml/docs/reference/ebay/getitem.html).
