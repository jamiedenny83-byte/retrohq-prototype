# Photo identification and barcode lookup

Photo identification means recognising the user's own item photo, not searching reference images. It is available in Quick Capture and Buy Check in the saved workspace. Demo mode deliberately does not contact providers.

## Enable photo identification
1. Create an OpenAI API key privately and add it as a **Codespaces secret** named OPENAI_API_KEY, with access to this repository. Never paste it into chat, a file, or GitHub code.
2. Stop and restart the existing Codespace so its terminal receives the new secret. Start RetroHQ using the existing server command and port 8006. Keep the forwarded port private.
3. Leave existing CeX and eBay secrets, OAuth callback URL and RETROHQ_ADMIN_PIN unchanged. Photo search uses private Codespace access and does not require the administrator PIN; Seller administration still does.
4. Open Quick Capture or Buy Check, choose Photo search and photograph or select one readable item. Identification starts automatically.
5. Review and edit the suggested description, then choose Use this description and find matches. Confirm the exact catalogue/variant and valuation evidence before saving the item.

The default model is gpt-4.1-mini; optional RETROHQ_VISION_MODEL must support image input and structured output through Responses. API usage may incur charges. The key stays on the server. The browser resizes the chosen JPEG/PNG/WebP to JPEG before sending; the server sends it to OpenAI with store:false. RetroHQ retains a compressed reference image locally when the inventory item is saved. This is not a promise of zero provider retention. Photo requests contain no PIN.

Identity is a suggestion, not proof of authenticity, condition, edition or value. Prices come from the existing market providers after user confirmation. The compressed reference photo is saved with inventory; keep original listing-quality photos separately.

## Barcode lookup
Type a barcode or use a keyboard-style scanner, then press Enter or use the search button. EAN/UPC/GTIN lengths 8/12/13/14 and their check digits are validated, including leading zeroes. Camera barcode scanning is not included.

Catalogue resolution uses the existing PRICECHARTING_API_TOKEN and depends on catalogue coverage. A recognised barcode supplies the item title/platform to subsequent searches instead of searching the digits. A conflicting description requires correction. Unknown items and unavailable prices must be reviewed manually; no price is invented.

## Validation and remaining acceptance
Eight offline identification tests pass, including provider request structure and endpoint PIN/origin/size guards. Existing Python suite: 48 tests before the additional endpoint test, 47 passed and one Windows-only permission skip; the added endpoint test passes separately. Nineteen Node regression tests pass. Isolated Edge acceptance passed with mocked providers: preview, review, PIN clearing, cost/location preservation, no automatic stock save, barcode Enter and no guessed price.

Real photo recognition remains unverified until an API key is configured and a real item is tested. Physical mobile camera capture and hardware scanner devices have not been tested. Existing real paid-order eBay Sandbox acceptance remains pending.

References: https://developers.openai.com/api/docs/models/gpt-4.1-mini and https://developers.openai.com/api/docs/guides/structured-outputs and https://www.pricecharting.com/api-documentation

## Connected buying update
The later connected buying build now retains a compressed reference photo on saved inventory and includes it in backups. This supersedes the earlier statement that photos are never persisted. Identification still sends the photo to OpenAI only after the user's action. See CONNECTED_BUYING.md for photo limits, cost estimates and the full trial.
