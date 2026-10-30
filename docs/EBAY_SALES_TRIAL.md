# eBay sales import test

Use the existing `retrohq-test-8.3` branch, Codespace and private port 8006. Pull the update, restart the Python server, then refresh RetroHQ. Keep the same browser profile and app address so your saved inventory remains available.

1. Export a workspace backup before your first test.
2. Open **Sales**, enter the private administrator PIN and click **Import eBay sales**. The default range is 90 days; 30 days, one year and two years are also available.
3. Compare several paid orders against eBay Seller Hub: title, sold date, quantity and item revenue. Sales history uses order creation dates; the regular inventory fetch still checks orders modified in the last 30 days.
4. Older orders should appear in Sales with a normal receipt without reducing today's available stock. A new sale with an exact existing listing/SKU link uses that physical record and retains its costs. Unmatched sales create sold-only records with unknown acquisition/preparation costs. Use **Stock links & order review** to explicitly match an imported sold record to an existing owned record when needed.
5. Import the same range again. Sales, receipts and available stock must not duplicate. Refresh and check again.
6. Check the payment/order exceptions section. Unpaid, cancelled, refunded and non-GBP orders are not automatically counted as new paid sales. Previously imported orders that later change remain flagged for review; physical stock is never automatically restored.
7. Check **All saved sales** for lifetime saved totals. A normal import selects this view; Today, 7 days and 30 days still provide shorter totals. Already dispatched orders remain in Sales but do not fill the pick/pack queue.
8. Test the existing inline inventory import as usual. Accepted listing lines still appear immediately in Inventory. Its fetch now imports eligible paid orders directly into Sales too.

Sale revenue is the line-item amount, not seller payout. Actual fees are used only where safely attributable; business-default estimates remain labelled as estimates. Purchase costs, preparation, postage and packaging may still need confirmation before profit is reliable. A pre-sales recovery copy is saved before the first new import and can be downloaded with the existing pre-import recovery control.

The direct sales reader makes no listing-detail calls. Reads are limited to 1,000 orders per request; if the range exceeds that, choose a shorter range and no partial sales import is committed. There are no eBay listing writes. Existing CeX and OAuth settings are retained.

Technical cause: eBay's documented no-cancellation value is `NONE_REQUESTED`. The previous eligibility checks accepted only `NONE` and `NOT_REQUESTED`, so genuine paid orders were excluded. See the [official Fulfillment API schema](https://developer.ebay.com/api-docs/master/sell/fulfillment/openapi/3/sell_fulfillment_v1_oas3.json), `CancelStatus.cancelState`.

Validation: 101 Node tests pass. Python: 80 tests, 79 pass and one Windows-only POSIX permissions skip. Controlled browser checks cover direct sales import, historical/current stock separation, repeat imports, receipt creation, unpaid exceptions, reload, failed-read preservation, recovery copy, and the existing inline inventory workflow across all three themes. Real-account acceptance remains the operator's next test; the agent has not pulled private live sales into the workspace.
