# Wider HQ Market and toy identification — 3 November 2026

User requests a market overview independent of tracked items, with best sellers, high-value products and other useful market information. Also reports that the existing inventory identification screen cannot identify a WowWee Homersapien/Homer Simpson toy.

## Wider market, then optional tracking

HQ Market now defaults to **Market overview**, with **My tracked items** as a separate optional view. Existing watchlists/history remain intact. New empty watchlists are genuinely empty; category overview never creates tracked items or uses inventory as its market universe.

The overview provides three sources of information:

1. **eBay UK best sellers:** official Buy Marketing `BEST_SELLING` category products, for Games, Consoles and Toys & games. This uses EBAY_GB and the provider's returned ordering. Sales quantities and ranking window are not supplied; review/rating counts are not treated as sales. Any displayed “From” price is the provider's lowest active asking reference by condition, not sold value.
2. **Highest UK asking prices:** production Browse category results sorted by descending price, filtered to GBP fixed-price UK-located stock. Only safe direct listing URLs are offered. Expensive asks can be unrealistic and can include graded items/bundles; this is not an appraisal or completed-sale ranking. Source times and permission/category errors remain visible. Failed refreshes retain earlier successful data with its original check time.
3. **PriceCharting guide-wide research:** load the original licensed price-guide CSV to rank all its eligible supplied game/console/accessory records by reference value and reported annual volume. Filter by category/platform and Loose/Complete/New. Coverage counts, excluded non-covered rows, duplicate IDs, unknown volume and the user-supplied guide date remain explicit. Prices are decimal USD from CSV, not cents, GBP or an inferred conversion. Reference median and volume coverage give context. No global historical movement or predicted return is fabricated from a current guide.

The normal PriceCharting search API returns only20 matches, so sampling it cannot establish the most valuable products across the guide. The CSV entitlement is part of PriceCharting's existing Legendary plan; this build does not purchase a subscription or assume the operator has it. Without the guide, eBay category research remains independent and guide coverage is clearly unavailable. PriceCharting does not value every toy/resale category.

Raw guide files are processed locally and are not sent to RetroHQ's server. Only compact rankings/coverage are saved in the browser and backups. Limits:80MB source,250,000 rows, up to85 group summaries, top10 per metric/group. The All supplied group covers all eligible parsed rows; platform breakdowns are bounded. Unknown prices/volume do not become zero. Current guide data is internal-business licensed data; existing provider licensing and retention obligations still apply.

## eBay access

Browse and Buy Marketing use separate application-token caches/scopes, sharing the configured production application key selection from the previous repair. The official best-selling endpoint is `/buy/marketing/v1_beta/merchandised_product`, with `buy.marketing` application scope. The current production app may need eBay's Buy Marketing approval, and category coverage can be limited. A functioning seller connection does not guarantee this entitlement. Missing access is reported rather than replaced with invented best sellers. No seller OAuth scope/consent, callback, RuName, refresh-token file or marketplace write operation changed. Category feeds are cached for one hour after complete success; there is no background poll.

## Identify existing toys and other items

The previous inventory dialog consumed only PriceCharting catalogue matches, even when market evidence could contain eBay listings. That was the coverage gap; CeX is not a general toy catalogue.

Inventory identification now defaults toys/other categories to **eBay UK**, with **PriceCharting games catalogue** available separately. eBay result selection fetches the exact Browse item details and suggests its model/MPN, brand/manufacturer and a valid EAN/UPC where supplied. Missing aspects remain blank; no manufacturer/model is guessed. Imported toy category paths can be confirmed as Toy. The source listing is accessible for comparison. These are identification suggestions from seller listings, not authoritative product verification or a sale-price valuation.

The physical-item confirmation checkbox remains mandatory. Only the same item's identity fields and identification history are changed. Purchase/preparation cost, valuation, sale/order association, listing/SKU, ID and stock quantity remain. A reference listing ID is recorded separately under identity provenance and never replaces the owned item's listing link. Editing selected details invalidates the source provenance; manual confirmation remains possible. No new acquisition is created and no stock is linked just by title similarity.

For the user's toy, try the imported title or the shorter query **WowWee Homersapien Homer Simpson**. Select a physically matching model, verify size/accessories, then confirm.

## Update and acceptance

Pull the same `retrohq-test-8.3` branch, stop/restart the existing server on private port8006 and refresh. No replacement Codespace or account reconnection.

- Open HQ Market: category feeds should load without any tracked item. Switch Games/Consoles/Toys. Check source times and actual permission errors if best sellers are unavailable.
- If already entitled, download your PriceCharting current-price CSV through its API/Download page, load it in the guide panel and supply the real guide date. Check coverage, highest references and annual-volume ordering. Track a particular result only if desired. Existing watchlists remain under My tracked items.
- Identify the toy through Inventory. Confirm model/brand from the eBay reference; verify unchanged cost/value/listing and one physical stock record after reload. Also confirm a known game through the retained catalogue path.
- Export/restore a workspace backup and check guide/category/identity research survives. Failed provider reads or failed saves should retain previous data. This remains a single-browser prototype, not shared phone/laptop storage.

## Validation and rollback

123 Node tests pass.107 Python tests run with106 pass/one POSIX-only Windows skip. Six focused overview tests cover scope/cache isolation, official category request, Sandbox rejection, missing approval, exact toy aspects and a search route that never calls PriceCharting/CeX. Controlled Edge acceptance passes an empty-watchlist category overview, guide-wide value/volume ordering, opt-in tracking, failure retention, reload, toy model/brand confirmation with preserved records/costs/listing, unchecked guards, retained game catalogue workflow, watchlist regression and phone width. Provider responses in browser tests are controlled fixtures; no live seller/market credentials or private CSV were read by the agent. Real Buy Marketing entitlement, guide entitlement and physical toy matching require operator acceptance.

Local rollback `retrohq-local-before-overview-and-toys-20261103` preserves9f323a0258896f6b526d21bfc00fc2be19dbdf98. No extra remote backup branch, merge, force push, rename or Codespace change. Earlier unpublished operational-guide/pointer edits remain excluded.

Sources: [eBay Marketing overview](https://developer.ebay.com/api-docs/buy/static/api-marketing.html), [official Marketing OpenAPI](https://developer.ebay.com/api-docs/master/buy/marketing/openapi/3/buy_marketing_v1_beta_oas3.json), [PriceCharting API/CSV documentation](https://www.pricecharting.com/api-documentation).
