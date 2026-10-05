# RetroHQ Changelog

## Test 7.4 — CeX Selection + Decision Maths

- Fixed CeX multiple-choice card overlap.
- CeX selections persist by exact catalogue product/SKU rather than restarting identification.
- CeX grade is derived from the actual catalogue title: Boxed / Unboxed / Discounted.
- Fixed Unboxed being misread as Boxed.
- Preserved confirmed PriceCharting identity during CeX selection, including specific revision, storage and colour attributes.
- Fixed maximum-buy percentage maths: 45% is applied as 0.45.
- Blank asking prices remain unknown instead of becoming £0 and producing a false 100% margin.
- RetroHQ UK Market Value uses only identity-validated CeX retail evidence or manual override at this stage.
- Removed obsolete Stage 5 / Hotfix documentation from the current test branch.

## Historical baselines

Earlier test and milestone branches remain in GitHub as rollback/history points. They are not the current test build.
