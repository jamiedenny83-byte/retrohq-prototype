# Test 7.4 — CeX Selection + Decision Maths

Built from the Test 7.3 baseline.

## Findings addressed

- **T7.3-01:** CeX option-card overlay / overlapping controls.
- **T7.3-02:** CeX selection did not persist and reverted the workflow.
- **T7.3-03:** CeX grade labels could disagree with the actual product title.
- **T7.3-04:** Maximum Buy was multiplied by 45 rather than 0.45.
- **T7.3-05:** Blank asking price was treated as £0 and created a false 100% margin.

## CeX evidence rules

CeX catalogue records are separate records for Boxed, Unboxed and Discounted. RetroHQ must distinguish:

- **CeX Retail** — CeX selling price; eligible as UK retail evidence only after identity validation.
- **CeX Cash Trade-in** — what CeX pays in cash; never used as Market Value.
- **CeX Voucher Trade-in** — store-credit trade-in value; never used as Market Value.

If there is no sufficiently confident CeX match, RetroHQ should show uncertainty rather than insert a wrong price.
