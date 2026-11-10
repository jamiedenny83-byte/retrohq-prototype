# Market insights and compact imports — 3 November 2026

Import rows keep description, photos and specifics in a closed Listing information box. Confirm item is consistently the rightmost action. It links checked physical units, or explicitly adds new units if none are selected; the action is described beside the button. Existing remainder confirmation, duplicate safeguards, Later and separate-new-unit option remain.

HQ Market now has Top10 annual trading volume, rising/falling readings and an investment research watchlist. Ten starter game searches work independently of inventory; track up to30 specific items/platforms in Loose, Complete/boxed or New condition. Confirm the exact PriceCharting edition before recording its prices. No automatic US/PAL or edition substitution. Annual volume is PriceCharting's reported figure, not UK sell-through. Investment research requires positive measured PriceCharting movement plus at least20 annual units; it is a screening rule, not a forecast.

## Real data and limits

- PriceCharting uses the existing PRICECHARTING_API_TOKEN and official Prices API. Reference prices stay USD. The API has current values, not historical price/sales series. RetroHQ stores its own dated observations starting with the first check. No historical values are backfilled or simulated.
- eBay uses the existing production Browse market connection, independently of seller OAuth. Median fixed-price GBP keyword asks require five usable sampled listings; exclude postage. These are search-cohort indicators, not exact item valuations, completed sales or sell-through. Bundles, condition and changing sellers can move a search median.
- 7/30/90-day comparisons require an actual baseline on or up to three days before the target date, positive baseline and latest reading no older than three days. Missing/stale/zero baselines do not enter mover rankings. No currency mixing. Separate catalogue/completeness/search identities remain separate series.
- Opening HQ Market checks targets not attempted today, sequentially; explicit Refresh rechecks. Server caches up to100 target responses for six hours, retaining original timestamps, and existing PriceCharting one-call-per-second pacing stays active. No unattended scheduler. Leaving the page stops the queue after the current request. Provider failures retain prior readings and disclose gaps. Credentials are never sent to the browser.
- Daily readings/history are stored in this browser's workspace and exported backups, not shared across devices. Maximum30 targets and1080 observations per target. Export backups regularly. Removing a target explicitly deletes its saved readings. Demo mode makes no provider calls.
- Internal business trial only. PriceCharting's published API licence requires a separate commercial agreement before redistribution; account/subscription setup and future commercial access are outside this change.

Official documentation: [PriceCharting API](https://www.pricecharting.com/api-documentation), [eBay Browse](https://developer.ebay.com/develop/api/buy/browse_api).

## Try in the existing Codespace

Use the same Codespace, private port8006 and branch retrohq-test-8.3. Pull, stop the old server with Ctrl+C, restart using the existing environment/start command, and refresh the browser. No new keys/scopes/callback settings are introduced; the existing market API credentials must be configured. Seller connection success alone does not prove Browse market access.

1. Fetch eBay normally. Check Listing information starts closed; expand/reclose it. Confirm two rows and verify rightmost button positions and correct Inventory counts/links.
2. Open HQ Market. Check provider status and starter searches; confirm exact PriceCharting editions. Check missing-access messages if credentials/API entitlement are unavailable.
3. Track an item plus platform and completeness. Confirm its catalogue record. Read PriceCharting USD and eBay GBP separately. History should initially show Building history, not invented growth.
4. Repeat refresh and reload: no extra same-day readings. Check a failed provider leaves valid history. Export/restore a backup and verify the watchlist/readings remain.
5. Return on later days. As real baselines accumulate, inspect 7/30/90-day changes, date ranges and history tables/charts. Rankings cover only tracked items, not a comprehensive market scan.

## Verification and rollback

115 Node tests pass. Python86 tests ran with85 pass/one POSIX-only Windows skip, including all six new market Python tests. Controlled Edge browser acceptance passes collapse/aligned confirmation/immediate stock, historical-fixture rankings, saving/reload, failed-refresh preservation, phone width and demo isolation. Test provider data is confined to isolated browser fixtures; real Codespace market credentials were not used. Live provider acceptance is still required.

Local rollback retrohq-local-before-market-insights-20261103 preserves the starting commit c47bcc5a3d88b2452a5bf7772fc007e3fe46d3b7. Existing useful remote fallback/bundle retained; no extra remote backup branch, rename or merge. Earlier unpublished guide/pointer edits are excluded from this functional upload. A code rollback does not roll back real business records; export first.
