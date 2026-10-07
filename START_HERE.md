# RetroHQ Test 8.2 — Daily Operations + Market Expansion

Test 8.2 is the first daily-operations build. Test 8.1 remains frozen as the rollback baseline.

## Before starting: provider secrets

Keep all API credentials out of ChatGPT and out of the repository.

The server reads:

- `PRICECHARTING_API_TOKEN`
- `EBAY_CLIENT_ID` — eBay App ID / Client ID
- `EBAY_CLIENT_SECRET` — eBay Cert ID / Client Secret
- `EBAY_ENV` — optional; defaults to `production`. Use `sandbox` with Sandbox keys.

For Codespaces, store the eBay values as Codespaces secrets so they are exposed to the running Codespace as environment variables. Never commit them to a file.

## Start it

```bash
git fetch origin
git switch retrohq-test-8.2
git pull

pkill -f "server.py" 2>/dev/null || true
fuser -k 8006/tcp 2>/dev/null || true

export PRICECHARTING_API_TOKEN="YOUR_GENERAL_API_TOKEN_HERE"
export EBAY_ENV="production"

python3 server.py
```

If eBay Codespaces secrets are configured, the terminal should report:

```text
RetroHQ Test 8.2 — Daily Operations + Market Expansion: http://localhost:8006
PriceCharting token: loaded
eBay credentials: loaded · production
```

Open forwarded **port 8006** and hard refresh with **Ctrl + Shift + R**.

## What is new

### 1. One authoritative lifecycle

The item status is now the lifecycle state shown across the workspace. Sale fulfilment no longer overrides the lifecycle bar.

- Listed → Next Stage opens Record Sale rather than creating a fake sale.
- Sold → Previous Stage reverses the sale back to Listed while preserving the original sale in history.
- Packaged / Dispatched / Delivered can move forwards and backwards while keeping sale fulfilment in sync.
- In-store completed sales can also be reversed without deleting their history.

### 2. Customer returns

Customer Return now captures:

- Customer email
- Return reason
- Refund amount
- Notes

The original sale is retained in history. The active sale/listing is cleared, the physical item returns to active stock as **Needs repair**, its location becomes **Repair Queue**, and its valuation is marked for review.

### 3. Stock health dashboard

HQ Today now shows:

- Items in stock
- Current stock market value
- Capital invested in current stock
- Current recorded sold value
- Stock mix by category
- Games/consoles by system
- Low-stock signal for systems with three or fewer active items

### 4. Toys and trading cards

**Trading Card** is now a first-class inventory/acquisition category alongside Toy, Video Game, Console and the existing categories.

The live market lookup is deliberately provider-aware: unsupported evidence is shown as missing rather than fabricated.

### 5. Live HQ Market

HQ Market no longer presents the old demonstration movers as if they were live intelligence.

It now has a live provider lookup using the same market endpoint as Buy Check:

- CeX UK evidence
- PriceCharting reference data and sales volume
- eBay UK active-listing evidence when credentials/access permit

eBay active listings are labelled as **asking-price evidence**, not sold evidence.

### 6. eBay UK adapter

The server now supports eBay Browse API authentication using server-side OAuth client credentials and searches the **EBAY_GB** marketplace.

RetroHQ records a sample count, low/high active asking prices and median active asking price. These figures are evidence only; they are not silently promoted to completed-sale market value.

## Important valuation rule

PriceCharting is already part of RetroHQ's evidence engine for identity, reference prices and sales volume. It is **not blindly averaged into the UK £ valuation**.

For UK games/consoles, territory-appropriate UK evidence remains primary. For cards and supported collectibles, PriceCharting can carry more weight as the category engine develops, but RetroHQ will keep the source and confidence visible.

## Suggested Test 8.2 pass

1. Open Dashboard and check Stock Health and system counts.
2. Open the PS3 Game Bundle and test Previous Stage from Sold. It should return to Listed and preserve the old sale in history.
3. Record a new sale and progress Sold → Packaged → Dispatched → Delivered → Completed, then test reversing stages.
4. Use Customer Return on a sold item. Enter an email, reason, refund and note. Confirm it returns to stock as **Needs repair**.
5. Open HQ Market and search a game, console, trading card and toy.
6. Confirm PriceCharting and CeX evidence behave as before.
7. Once eBay secrets are configured, confirm HQ Market reports **eBay UK LIVE** and shows active UK asking-price evidence.
8. Add a Trading Card and Toy through acquisition/inventory and confirm they appear in Stock Health.
