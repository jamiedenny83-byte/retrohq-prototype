# RetroHQ Test 8 — Counter Flow Notes

## Goal

Make Buy Check feel like a counter tool rather than a provider workflow.

**Normal target:** type or scan the item, press Enter, get the answer.

RetroHQ should perform provider matching in the background and only ask a question when identity is genuinely ambiguous.

## Grading model

RetroHQ now uses three user-facing condition grades:

- Excellent
- Good
- Poor

Completeness is recorded separately with simple inclusion flags:

- Box
- Controller
- Cables

For console CeX evidence, RetroHQ maps these automatically:

| RetroHQ state | CeX comparison |
| --- | --- |
| Poor | Discounted |
| Good / Excellent, no box | Unboxed |
| Good / Excellent, box included | Boxed |

Controller and cable flags do not invent a replacement-cost deduction. If essentials are missing, RetroHQ warns that the CeX benchmark assumes required accessories.

## Important valuation rule

When the CeX catalogue grade already represents the item's condition, RetroHQ must not apply a second condition multiplier to the CeX retail price.

Example:

- CeX Discounted retail = £70
- RetroHQ condition = Poor
- RetroHQ UK Market Value = £70, not £38.50
- 45% maximum-buy rule = £31.50

## Identification behaviour

A clearly dominant PriceCharting identity can auto-lock.

If credible candidates are close, RetroHQ still asks the user to choose the item.

Broad searches such as "Xbox" must still ask for generation rather than guessing.

## Evidence presentation

After a successful search, detailed provider evidence is collapsed under **Why this value?**.

CeX Retail remains the current validated UK benchmark. CeX Cash and Voucher are evidence only and are never treated as market value.

## Rollback

Test 7.4 is the frozen baseline immediately before this workflow change.
