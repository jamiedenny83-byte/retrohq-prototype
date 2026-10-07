# RetroHQ Changelog

## Test 8.2 — Daily Operations + Market Expansion

- Created the daily-operations test branch from Test 8.1.
- Made item status the authoritative lifecycle state across the workspace.
- Added safe sale reversal from Sold / completed in-store sales while preserving sale history.
- Listed → Next Stage now opens the sale form instead of inventing a sale.
- Added a proper Customer Return workflow with email, reason, refund and notes.
- Returned items re-enter active stock as **Needs repair** and are flagged for revaluation.
- Replaced the cluttered Lifecycle-at-a-glance dashboard card with Stock Health.
- Added Items in Stock, Current Stock Value, Capital in Stock and Sold Value.
- Added stock mix and games/consoles by system with a low-stock signal.
- Added Trading Card as a first-class stock category and expanded collectible manufacturers.
- Replaced demonstration HQ Market movers with a live provider lookup.
- Added server-side eBay Browse API adapter for **EBAY_GB** active listings.
- eBay active asking prices are retained as evidence and are not misrepresented as sold prices.
- PriceCharting remains live for identity, reference pricing and sales volume; it is not blindly averaged into UK valuation.
- Test 8.1 remains frozen as the rollback baseline.


## Test 8.1 — Smart Valuation + Workflow Intelligence

### Lifecycle hotfix

- Fixed the Processing lifecycle bar incorrectly jumping visually back to Acquired for stages omitted from the shortened display.
- Lifecycle display now represents the full processing path, including repair, pricing, packaging and delivery.
- New Buy Check / Quick Capture inventory records now receive an explicit Acquired starting status.
- Offer received is treated as an event while Listed rather than a compulsory lifecycle stage.
- Existing items already at Offer received progress correctly to Sold instead of visually resetting.


- Added item-specific Smart Valuation on top of the Test 8 Counter Flow.
- Missing controller can now deduct a live, confidently matched CeX UK replacement benchmark.
- Missing cables use a transparent configurable business allowance.
- Smart valuation calculations and unresolved adjustments are retained with the inventory item.
- One stored RetroHQ Market Value now flows through Inventory, Item Workspace, HQ Today, Processing and Reports.
- HQ Today now chooses one highest-priority next action per item.
- Added Needs Valuation and Missing Essentials workflow states/signals.
- Added Inventory workflow filters without adding more permanent columns.
- Expanded Item Workspace with valuation breakdown, completeness, expected profit and clearer lifecycle.
- Added first acquisition-to-sale feedback loop: acquisition valuation, sale outcome, actual profit and days-to-sell data.
- Added clearer BUY / OVER TARGET decision output in Buy Check.
- Test 8 remains frozen as the rollback baseline.


## Test 8 — Counter Flow

- Reworked Buy Check around the target flow: **type / scan → Enter → answer**.
- Removed the separate CeX grade choice from normal use.
- Reduced RetroHQ condition choices to **Excellent / Good / Poor**.
- Added simple **Box / Controller / Cables** inclusion checks.
- Added automatic console CeX mapping: Poor → Discounted; Good/Excellent + no box → Unboxed; Good/Excellent + box → Boxed.
- CeX evidence refreshes automatically when condition or completeness changes.
- Added confidence-based PriceCharting auto-locking so a clearly dominant match does not require a redundant confirmation click.
- Ambiguous identities still require one user confirmation.
- Live provider evidence is collapsed under **Why this value?** after a successful search.
- Removed the double condition adjustment from Buy Check when the selected CeX grade already represents the item's condition.
- Buy Check carries condition, accessories and the selected CeX grade into acquisition.
- Test 7.4 remains available as the frozen rollback baseline.

## Test 7.4 — CeX Selection + Decision Maths

- Fixed CeX multiple-choice card overlap.
- CeX selections persist by exact catalogue product/SKU rather than restarting identification.
- CeX grade is derived from the actual catalogue title: Boxed / Unboxed / Discounted.
- Fixed Unboxed being misread as Boxed.
- Preserved confirmed PriceCharting identity during CeX selection, including specific revision, storage and colour attributes.
- Fixed maximum-buy percentage maths: 45% is applied as 0.45.
- Blank asking prices remain unknown instead of becoming £0 and producing a false 100% margin.
- RetroHQ UK Market Value uses only identity-validated CeX retail evidence or manual override at this stage.
- Removed obsolete milestone/hotfix documentation from the current test branch.

## Historical baselines

Earlier test and milestone branches remain in GitHub as rollback/history points. They are not the current test build.
