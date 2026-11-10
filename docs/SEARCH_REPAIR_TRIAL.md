# UK valuation, photo and barcode repair — 3 November 2026

User reproduction: search `call of duty mw3 xbox`, choose either PriceCharting result, receive no UK valuation.

## Cause and repair

The raw search had no exact Xbox generation and retained an unknown product type. Selecting a PriceCharting edition did not reliably transfer its full title/platform to the CeX search. CeX could therefore be queried using the abbreviated input and wrong matching rules. Barcode-derived descriptions could also disappear on a subsequent grade refresh with a selected catalogue ID.

The confirmed catalogue record now supplies the full software title and platform for CeX matching. Coverage includes additional older Nintendo/Sega/PlayStation platform labels. Software colour/title words no longer become console colour attributes. Xbox Smart Delivery is explicitly recognised for Xbox One and Series X, without admitting Xbox360 or disc use on Series S. Old Modern Warfare3 and newer Modern WarfareIII retain distinct title/platform identities and prices; no global Roman numeral substitution.

Live CeX searches verified the older Xbox360 record5030917096846 at GBP3.50 and newer Smart Delivery record5030917299780 at GBP10 on3November2026. These are dated CeX retail references, not guaranteed resale prices or trade-in payouts. Regression route tests verify each value reaches the UK field, with wrong-release rejection. The current shop price may change.

## Capture and barcodes

- Acquire/Value and Quick Entry have Scan barcode. Live camera scanning starts immediately where permission is granted. The local ZXing reader supports camera and barcode-photo decoding without relying on the browser's optional native BarcodeDetector API. Denied/unavailable camera access leaves barcode-photo and typed-digit options usable.
- Scanned EAN/UPC passes the same length/check-digit validation as typed codes. A valid scan clears stale text/catalogue choices and starts the market search. Barcode frames/photos are not sent to OpenAI or retained as inventory photos. Closing/switching dialogs stops the camera.
- If PriceCharting has no UPC entry, an exact CeX EAN detail record with a known software platform or verified shared Smart Delivery identity can identify the item and supply its GBP benchmark. Mismatched IDs and ambiguous platforms cannot silently substitute another product.
- Photo search remains automatic after capture/file selection, with no administrator PIN. The browser now adapts JPEG quality/size and has an image-decoding fallback for phone files. Unsupported image formats produce an actionable error. The existing OpenAI key/model/billing remains unchanged; its API charge applies to photo identification, not local barcode decoding.
- Barcode/photo recognition does not create or sell stock. Review the identity/value and save acquisition explicitly. Unknown/missing provider evidence stays unknown; no USD conversion, asking-price substitution or manufactured valuation was added.

## Test in the existing Codespace

Pull retrohq-test-8.3, stop the old server and restart on the same private port8006, then refresh. Keep the same Codespace and existing CeX/Sandbox/production OAuth settings. No new secrets or scopes.

1. Search Call of Duty MW3 Xbox. Select the Xbox360 edition and check its UK reference, then repeat for the newer Xbox One/Smart Delivery edition. Confirm the identity/price changes correctly.
2. Scan the printed barcode with the rear camera, or choose a clear close-up barcode image. Check automatic search, correct item/platform and no duplicate acquisition. Enter an invalid barcode and verify no provider lookup/stock change.
3. Try Photo search with a clear cover/label. Check automatic identification and catalogue/UK handoff. If the service reports missing key,401 or429, inspect the existing OpenAI configuration/credit rather than treating it as a CeX match.
4. Change condition/completeness after barcode identification. UK evidence should remain tied to the same edition and refresh without an empty-query error.

## Verification

117 Node tests pass;93 Python tests run with92 pass/one POSIX-only Windows skip. Seven focused Python tests also pass after the exact-EAN endpoint assertion. Controlled Edge checks pass both catalogue choices/UK fields, real EAN-image decoding with the shipped ZXing bundle, invalid-code blocking, camera-permission failure fallback, automatic compressed photo handoff, phone width and no browser errors. Photo-provider and market responses in browser tests are controlled fixtures, not a claimed real OpenAI/device-camera acceptance. Actual camera permissions/focus and live photo recognition still need the user's device trial.

Rollback: local retrohq-local-before-search-repair-20261103 preserves f8a30930576ccf03f89b80ba5c3621edf7c0ba4f. No extra remote backup branch, rename, merge, seller scope/callback change or Codespace replacement. Earlier unpublished guide/pointer edits remain excluded from this release.
