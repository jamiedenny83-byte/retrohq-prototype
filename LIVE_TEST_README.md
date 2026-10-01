# RetroHQ Live Workflow Test 7 — CeX UK Live Evidence

Preserves Test 6 Console Intelligence and click-to-confirm.

Adds a replaceable CeX UK live provider adapter after RetroHQ identity confirmation.
Displays CeX sell, cash and voucher values when a candidate passes RetroHQ matching checks.
CeX sell can populate a preliminary UK retail benchmark; it is explicitly not yet the final blended RetroHQ UK Market Value.
PriceCharting remains a separate USD/PAL reference. eBay remains pending API approval.

Run with PRICECHARTING_API_TOKEN set, then `python3 server.py`. Default port: 8006.

## Test 7.1 — CeX Accuracy
- Correct CeX semantics: `sellPrice` = CeX retail selling price, `cashPrice` = cash trade-in, `exchangePrice` = voucher trade-in.
- CeX search now starts from RetroHQ's confirmed console identity rather than PriceCharting's returned product title.
- Hard product-type and console-generation filters reject software/accessories/wrong generations.
- Optional Boxed / Unboxed / Discounted selector supports CeX console variant matching.
- CeX prices are evidence only and no longer automatically populate RetroHQ UK Market Value.
- Regression case: Original Xbox + Unboxed should target the CeX Original Xbox console listing rather than System Shock.
