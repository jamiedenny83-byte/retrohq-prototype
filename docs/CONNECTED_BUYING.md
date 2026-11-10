# Connected buying trial

Use the existing Codespace, branch retrohq-test-8.3 and private port 8006. Export a backup before testing with real items. The app still stores stock in this browser/site address; this build is not shared server storage.

## Test one complete journey
1. Open Acquisitions and Buy Check. Select Photo search (requires the private OpenAI key described in PHOTO_BARCODE.md), or enter a barcode/description.
2. Confirm or edit the photo suggestion. Choose the exact catalogue item/variant in the provider results. CeX retail is a reference, not a guaranteed eBay selling price. Existing eBay research links remain available for checking selling evidence.
3. Enter the asking price and estimated fees, seller postage, packaging and preparation. Enter zero deliberately if none. Missing amounts leave profit unknown. The maximum buy is the lower of the configured buying percentage and break-even after these costs; it is not a guarantee of profit.
4. Select BUY → ACQUIRE. Confirm purchase price, title, condition and location. The photo, identity, evidence and cost estimates travel with the item. Save once.
5. Find the item in Inventory. Overview shows the historical buying estimate; Photos shows the compressed reference image and a download link.
6. Reload and confirm the record and photo remain. Export a backup; it includes the reference image. Test restoration in a suitable workspace with its existing replacement confirmation.

Example: selling estimate £80, purchase £20, fees 10%, postage £4, packaging £1 and preparation £2 gives estimated profit £45. The 45% configured buying target gives maximum buy £36 (lower than £65 break-even). Actual sale profit remains separate and uses actual costs.

Quick Capture also supports the photo and cost fields for items already purchased. It permits saving unknown valuation/costs, flags unknown value and retains the incomplete buying snapshot. A purchase amount is required; enter 0 for a free item.

## Trial boundaries
- Reference photo: one JPEG, resized to at most 900 pixels and 250,000 encoded characters. Larger results need a closer crop. Retain your original listing-quality photos.
- Images are retained in local inventory and exported backups only after saving; selecting/identifying does not itself add stock.
- Local browser capacity and the existing 5 MB backup limit restrict trial size. If saving fails, the last saved inventory remains intact and editing stops. Keep backups and trial a small batch.
- Recognition requires a private OpenAI API key and real-item acceptance. Browser acceptance uses mocked provider responses.
- No listing publishing/crosslisting or OAuth changes in this build. Those extend the same record in later work. Real eBay paid-order acceptance remains pending.
