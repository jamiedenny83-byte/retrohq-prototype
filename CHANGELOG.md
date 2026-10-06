# RetroHQ Changelog

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
