# eBay market access and useful HQ readings — 3 November 2026

User confirms production seller imports fetch new listings, while market evidence shows application-token HTTP401 and HQ Market appears empty. Seller consent and market application authentication are separate paths. The previous market path ignored EBAY_LIVE application keys and could fall back to old Sandbox keys despite a working production seller connection.

## Credential selection

Market Browse now selects a complete EBAY_MARKET_CLIENT_ID / EBAY_MARKET_CLIENT_SECRET override first; otherwise it uses EBAY_LIVE_CLIENT_ID / EBAY_LIVE_CLIENT_SECRET against production, independently of EBAY_ENV. Only when neither is configured does the legacy EBAY_CLIENT_ID / EBAY_CLIENT_SECRET / EBAY_ENV path remain available. An incomplete override or production pair is rejected rather than silently choosing different keys. Explicit market overrides are never ignored on failure.

This mints a separate application token with the existing base scope. It does not reuse/alter the seller refresh token, callback, RuName, seller scopes, stored seller token file or user consent. Rotated secrets invalidate the application's in-memory token cache. HTTP401 now identifies the selected environment and setting names, without printing credential values or upstream error bodies. An existing seller token can still work while application credentials are stale; seller import success does not prove Browse entitlement. Browse production access may separately require eBay approval.

If401 remains after this update, follow the named pair in the error: use matching production App ID and Cert ID from the same developer keyset, update the corresponding Codespaces secrets and restart the server. If an intentional EBAY_MARKET override exists, it takes precedence over seller application keys. Do not reconnect the functioning seller account to resolve market authentication.

## HQ Market

- A current-readings table shows PriceCharting USD reference, reported annual units, eBay GBP asking median, sample count/date and edition actions immediately. Provider coverage counts show how many targets have current saved readings. Authentication failures are prominent; missing prices are not represented as zero or as successfully collected history.
- The first check can auto-resolve a unique full-title/platform PriceCharting catalogue match. PAL is preferred for unspecified-region UK research, explicit PAL/UK requests require PAL, and named editions, wrong platforms, competing exact records or other region requests retain deliberate choice. The selected record and match basis remain visible. Existing user-chosen IDs are retained. No auto acquisition or UK valuation substitution.
- Annual-volume rankings can populate from current references. Rising/falling and investment-momentum screens still need actual older readings. No historic series, sold evidence, FX conversion or predicted return is manufactured. eBay values remain keyword asking samples, not exact-item sold prices.
- Existing watchlists with old incomplete status metadata are rechecked on first entry after upgrading; routine checks are once per UTC day on page entry or explicit refresh. Provider warnings and earlier valid readings survive saving/reload/backup. No unattended background job or shared-device storage is added.

## Verify

Pull retrohq-test-8.3, restart the same private-port8006 server and refresh the browser. Seller import should remain connected. Try a market lookup, then open HQ Market and Refresh market data. Look for current readings and dates; use Choose edition where ambiguity remains. A first observation can provide prices/annual volume but cannot prove a30-day rise. If market authentication still fails, inspect only the named secret pair and environment in the safe error.

119 Node tests pass. Python101 tests ran with100 pass and one POSIX-only Windows skip. Targeted tests reproduced credential precedence/error/cache failures before the fix, then passed. Controlled Edge checks pass first-check reference/annual-volume display, exact-match adoption, ambiguous-edition choice, prominent401/coverage, unavailable source versus missing baseline, recovered GBP reads, persistence/daily deduplication, phone layout and unchanged inventory. Real Codespace credentials were not read or exercised by the agent; live market acceptance is the operator's next check.

Local rollback retrohq-local-before-market-access-20261103 preserves dbee9599ce36fdfcf560d2a465b46db2cdb19370. No remote branch proliferation, force push, merge, branch rename or Codespace replacement. Earlier unpublished guide/pointer edits remain separate.

Primary reference: [eBay OAuth client credentials](https://developer.ebay.com/develop/guides/sell/authorization).
