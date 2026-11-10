# Test 8.4 — eBay sales import and reconciliation

## Offline sales demo (2026-10-13)
After updating the existing Codespace, click **Try offline sales demo**. Alternatively append `?demo=1` to the existing app address. No eBay account, listing, purchase or administrator PIN is needed.

The entry link is inside **Backup and practice tools**. Each scenario now shows only its own order with an item description and expected outcome. Switching scenarios preserves progress; revisiting Paid sale does not undo a refund or import. The full sample sales table is expandable. Order IDs, provider statuses and physical return controls are inside **Order details and return options**.

The full app uses fictional inventory in a separate browser storage record and a separate tab lock. It never loads your saved inventory into the demo. All app provider requests are blocked in demo mode; seller connection controls are hidden. **Return to saved workspace** opens the normal app at the same address, with its original storage and connection configuration.

1. Click **Paid sale**, then **Review match and import**. Confirm the Silent Hill 2 demo stock record.
2. Open **Actual costs / profit**. Enter fees 10, postage 4, packaging 1 and buyer shipping 3. Sample revenue 80 minus acquisition 35 and processing 2 produces confirmed profit 31 GBP.
3. Click **Repeat sync**, then reload. The order and sale must remain single entries.
4. Click **Refund** or **Cancellation** after importing the paid sale. Stock stays sold and profit requires review. Use **Review / restore stock** to simulate a physically received return.
5. Try **Unmatched sale** and select Nintendo 64 manually. **Two-unit sale** matches both PS3 stock records and allocates 30.01 GBP across them.
6. **Connection error** displays a simulated failure while retaining stock and the last successful sync.
7. **Reset demo samples** resets only fictional data after confirmation. Demo exports are named `retrohq-DEMO-backup-*`.

Fixtures use the normalized order shape from the eBay adapter and the unchanged `sales-sync.js` engine. These tests verify RetroHQ behaviour, not eBay API availability, permissions or real checkout completion. A genuine paid Sandbox order remains a later integration acceptance check. Demo state, like current normal state, is local to one browser profile and site address.

## Scope delivered for Sandbox trial
- Sales → eBay sales: PIN-protected read-only Fulfillment order retrieval with bounded pagination (up to 1,000 orders within eBay's default order window). A later-page failure offers no partial import. A capped result is disclosed; older orders require Seller Hub verification.
- Order/line identifiers, SKU, listing ID, paid status, cancellation/refund signals, quantity, line revenue and order-level fee/shipping evidence. No buyer names, addresses or credentials in the browser response.
- Exact SKU/listing links from Item Workspace → Listing. No fuzzy-title stock matching, no Inventory API dependency, and no writes to eBay listings or orders.
- Review exact matches or explicitly allocate unmatched lines before confirming stock changes. One inventory record equals one physical unit. Multi-unit lines require that many distinct records; price allocation preserves the total down to the penny.
- Atomic browser save of inventory and the import ledger. External identity prevents duplicate import, including after refresh or a reversal. One active tab per origin, enforced using browser Web Locks. Storage failure stops editing; saved data is not silently reset.
- Imported sales appear in Sales, inventory, item history and fulfilment queues with existing Area/Shelf. Already fulfilled orders enter Dispatched. Later remote fulfilment status is displayed without reversing local packing/dispatch progress.
- Order-level fees are preserved as evidence. For a single-unit, single-line order they prefill the costs form. Actual seller postage and packaging require confirmation; buyer shipping revenue is a separate amount. Multi-line fee allocation requires review. Unconfirmed/reviewed imports are excluded from confirmed-profit totals.
- A cancellation/refund/identity/quantity/amount change flags review, not an automatic stock restoration. Confirm corrected revenue/fee evidence for unchanged stock allocation. Refunds/quantity changes stay under review. Restore stock only after all allocated units are physically available; retain original sale/history and the duplicate-protection record.

## Existing Codespace update
Use the SAME existing Codespace. Do not click “Create codespace.” Keep its existing private port 8006, environment, secrets and eBay Developer Portal configuration.

First check the terminal:

```bash
git status --short --branch
git branch --show-current
```

If there are local edits, preserve and review them before updating. Do not reset or discard them. If the branch is `retrohq-test-8.3` and the worktree is clean:

```bash
git fetch origin
git pull --ff-only origin retrohq-test-8.3
```

Stop the old server with Ctrl+C in its terminal and restart:

```bash
export EBAY_ENV=sandbox
python3 server.py
```

Open the same forwarded private port 8006 URL and refresh. The header should show Test 8.4. Settings should show the same `/ebay/oauth/callback` URL and the retained seller connection. Do not alter RuName or scopes. If a pull refuses to fast-forward, stop and inspect divergence rather than resetting.

## Sandbox acceptance checks
1. Recheck Settings → Test seller APIs with the existing administrator PIN. Verify the exact current callback and connection.
2. Repeat the verified Silent Hill 2 PS2 CeX lookup and a known hardware lookup. Confirm actual UK retail/cash/voucher values and identity; no live pricing is fabricated by offline tests.
3. Create/acquire a physical test stock record. Under its Listing tab, link the Sandbox order's exact SKU or listing ID. Do not enter real customer details.
4. In Sales, enter PIN and Fetch / resync orders. Review the paid order and confirm the intended physical item(s). Check price, quantity, original buy/processing costs, Area/Shelf and stock status.
5. Resync and reload. Confirm exactly one imported line and the same sold units.
6. Try an unlinked order and a duplicate/conflicting link. Both must require manual matching; unrelated stock stays available.
7. Confirm actual costs, including explicit zero where verified. Unknown costs must remain unconfirmed; do not treat whole-order fees as each item's fee.
8. Verify cancellation/refund review. A refund does not itself prove that a physical return arrived. Restore only verified stock; repeat sync must not resell those units.
9. Export a browser inventory backup. Keep this file privately; it can contain business records. Do not commit it to GitHub.

## Trial limits
This remains a single-browser, single-Sandbox-seller prototype, not a shared or production inventory database. Browser data is scoped to the exact site address and browser profile. Other devices do not share this ledger. Clearing site data loses it; use the exported backup and retain the original profile. Server OAuth tokens remain outside the repository at their unchanged private path.

Import is user-triggered and captures sale details automatically; stock updates require review. There is no unattended background polling or stored browser administrator PIN. Returns outside Fulfillment evidence, older orders outside the default window, and partial-return financial settlement require Seller Hub review. No automated Finances/returns API or production seller permission is added.

## Rollback and branch name
- Verified 8.3 code: `retrohq-rollback-8.3-verified` → `887f40d13b1bf450ae458c5140b3a053e64ec872`.
- Exact pre-session code (including two early 8.4 retrieval commits): `retrohq-rollback-before-8.4` → `34399a0da48c4a3d02f8d3384582c047f6ddaf58`.
- Working branch remains `retrohq-test-8.3`. `current` rename is deferred: GitHub closes an open PR when its head branch is renamed, and the Codespace's local tracking would need updating. Draft PR #47 remains open; `main` remains untouched.
- A code rollback does not reverse real business events or erase browser state. Export first, stop the server, verify a clean checkout, and switch to the chosen rollback ref in the SAME Codespace. 8.3 does not understand the 8.4 browser ledger; do not record overlapping sales in both versions. Preserve browser data to return to 8.4.

References: [8.4 scope](https://github.com/jamiedenny83-byte/retrohq-prototype/issues/50), [staged Flipwise backlog](https://github.com/jamiedenny83-byte/retrohq-prototype/issues/51), [GitHub branch rename effects](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-branches-in-your-repository/renaming-a-branch), [eBay fee evidence](https://developer.ebay.com/develop/api/fulfillment-api/release-notes).
