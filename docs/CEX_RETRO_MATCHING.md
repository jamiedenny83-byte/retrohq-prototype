# CeX retro game matching and grading repair — 23 October 2026

CeX was responding to catalogue searches, but RetroHQ rejected valid retro records containing condition/completeness labels. Reproduced with Krazy Racers GBA and Silent Hill 2 PS2. Existing ordinary Hulk PS2 matching still worked; this was a matching defect, not evidence of a complete provider outage.

The repair recognises known trailing Unboxed, Boxed, Mint and manual labels, plus specific catalogue packaging annotations. A narrow verified Krazy Racers / Konami Krazy Racers alias is included. Accented titles such as Pokémon are normalised conservatively. Meaningful title/sequel words and platform checks remain required. Unknown games, different sequels and other platforms do not acquire prices through looser fuzzy matching.

All matching retro condition/completeness variants remain visible for explicit selection, including standard/collector packaging and records with/without manual. A console Boxed/Unboxed/Discounted default no longer filters game candidates. The existing automatic exact-match shortcut does not use these relaxed metadata rules, so it cannot silently choose a completeness variant.

The selected CeX catalogue grade, product and product ID are retained with the acquisition and valuation. Physical shop condition remains a separate assessment; Excellent never implies CeX Mint. Selecting a game variant also aligns the included-case checkbox with that record. Retail, cash and voucher evidence continues to come from the selected exact record. No stock is revalued automatically by this update.

## Verification

- New regressions reproduced four failures before the fix; all six focused cases pass after the repair.
- Full Python suite: 67 run, 66 passed and one existing POSIX-only Windows skip. All 51 Node tests passed; JavaScript syntax checked.
- Live public CeX checks: Krazy Racers returned four variants; Silent Hill 2 PS2 returned nine; Pokémon Emerald returned four; Incredible Hulk PS2 retained its exact candidate. Selected-record retail/cash/voucher reads succeeded.
- Isolated browser check: all Krazy Racers variants visible; exact boxed-with-manual grade/value saved through acquisition, reload and backup. Good physical condition remained separate. A simulated eBay error did not block CeX evidence.

## User trial

Update the same `retrohq-test-8.3` checkout in the existing Codespace, restart its current server and hard-refresh the same application address. Preserve any local edits and keep a private inventory backup.

Search Krazy Racers GBA, Silent Hill 2 PS2 and Pokémon Emerald GBA. Choose the exact condition, edition and manual/completeness variant. Verify CeX prices against that selected record. Save one test acquisition with its real purchase cost; reload and check the CeX grade and value remain. Do not select Mint unless it actually meets that record's requirements.

Rollback before this repair: `retrohq-rollback-before-cex-retro-variants` at `3d36986e9ffdedc89ca570a07d02f9a6b11ad802`. The earlier pending documentation follow-up is separate and remains preserved locally. No marketplace connection configuration, branch name or app appearance was changed by this repair.
