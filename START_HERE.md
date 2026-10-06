# RetroHQ Test 8.1 — Smart Valuation + Workflow Intelligence

Test 8.1 is the first wider-system test built from the working Test 8 Counter Flow. Test 8 remains frozen as the rollback baseline.

## Start it

```bash
git fetch origin
git switch retrohq-test-8.1
git pull

pkill -f "server.py" 2>/dev/null || true
fuser -k 8006/tcp 2>/dev/null || true

export PRICECHARTING_API_TOKEN="YOUR_GENERAL_API_TOKEN_HERE"

if [ -n "$PRICECHARTING_API_TOKEN" ]; then echo "✓ PriceCharting token loaded"; else echo "✗ Token missing"; fi

python3 server.py
```

Expected terminal line:

```text
RetroHQ Test 8.1 — Smart Valuation + Workflow Intelligence: http://localhost:8006
```

Open forwarded **port 8006** and hard refresh with **Ctrl + Shift + R**.

## What is new

### 1. Smart valuation

CeX remains a UK benchmark, but RetroHQ now values the actual item.

For supported consoles:

- Condition still selects the appropriate CeX catalogue grade.
- Box controls Boxed vs Unboxed where applicable.
- A missing controller triggers a live CeX UK controller replacement lookup when RetroHQ can make a confident platform-specific match.
- Missing cables use the configurable **Missing cable replacement allowance** in Settings.
- Known replacement costs are deducted from the CeX retail benchmark.
- Unresolved replacement evidence is shown rather than silently inventing a figure.
- The full calculation is stored with the item.

### 2. One valuation across RetroHQ

A Test 8.1 item carries the same stored RetroHQ UK Market Value into:

- Inventory
- Item Workspace
- HQ Today
- Processing
- Reports

The old condition multiplier is not applied again to a stored smart valuation.

### 3. HQ Today / workflow intelligence

“What should I do next?” now considers:

- Ready to dispatch
- Needs identification
- Needs valuation
- Missing essential accessories
- Ready to list
- Normal processing stages

Each item gets one highest-priority next action.

### 4. Inventory intelligence

Inventory now shows compact workflow signals and can filter by:

- Needs valuation
- Missing essentials
- Ready to list
- Sold

### 5. Item Workspace

The item record now exposes:

- Stored valuation breakdown
- Completeness
- Missing essentials
- Acquisition value
- Recommended maximum buy
- Expected profit
- Lifecycle strip
- Actual profit after sale

### 6. Buy → Sell feedback loop

Reports now starts comparing:

**valuation when bought → amount paid → sale price → fees/costs → actual profit → days to sell**

This is the first foundation for RetroHQ learning from its own transaction history.

## Suggested wider-system test

1. Buy Check: search **PS3 Slim 320GB Scarlet Red**.
2. Leave Controller and Cables unticked. Confirm that the CeX benchmark is adjusted rather than copied directly.
3. Tick Controller. The controller deduction should disappear.
4. Tick Cables. The cable allowance should disappear.
5. Enter an asking price and check the **BUY / OVER TARGET** answer.
6. Choose **BUY → ACQUIRE**, finish the acquisition and save it.
7. Open **Inventory**. Confirm the same RetroHQ value is shown.
8. Open the **Item Workspace**. Check Overview, Acquisition, Market and Timeline.
9. Unticked essential accessories should surface in **HQ Today** and **Processing**.
10. Use the Inventory workflow filters.
11. Progress the item through lifecycle stages and create a listing.
12. Record a sale. Open **Reports** and check the buy-to-sell feedback information.

## Important Test 8.1 rule

A missing-accessory deduction is only automatic when RetroHQ has a defined evidence source:

- **Controller:** live CeX UK retail replacement evidence where confidently matched.
- **Cables:** configurable RetroHQ business allowance.
- If evidence is not trusted, RetroHQ flags the adjustment as unresolved instead of fabricating a number.
