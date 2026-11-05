# Refinement trial: photo, games, checkout and inventory

Export an inventory backup before testing. Continue in the existing Codespace on retrohq-test-8.3 and private port 8006.

1. Photo search: a high-confidence result now fills the description and begins market lookup automatically. A visible photo identity and Correct description action remain. Lower-confidence results still ask for review. Exact catalogue edition/platform choices may still be necessary; visual confidence is not proof of an exact catalogue record.
2. Game contents: when market identification says software/game, Box/case is ticked by default. Untick it for loose stock. Your explicit choice survives repeat lookup and acquisition handoff. It is a convenience default, not image verification.
3. Record one sale: choose an available item. Its current RetroHQ market value is loaded and editable, even if a different listing price exists. If the value is unknown, enter the agreed price. Changing channel applies its fee preset; In Store EPOS starts at 0%. Fees remain editable.
4. Basket: choose Add another item. Every physical stock record can appear once. Apply a £ or percentage basket discount, optionally select a trade account and enter credit, then review the remaining amount to pay. Save only after payment has been received. This records payment; it does not take a card payment.
5. Review: a single transaction appears under Sales → Sale transactions. Discount, fees and credit are allocated proportionally in pennies across items. Credit is payment, not a second discount or reduction of revenue. In-store sales complete; online sales enter dispatch workflow. Historical transaction totals remain available after returns.
6. Inventory: live Inventory and its search show available stock only. Sold inventory retains sold/completed items, with access to their full item workspace. Sales still handles fulfilment. Return physical stock through the existing explicit return workflow, not by deleting the sale.
7. Reload, export and restore: inventory, account balance and transaction history must agree. Old backups without transactions remain supported. Demo reset clears demo checkout history too.

Example: two items valued at £10 and £20, £5 overall discount and £10 trade credit produce a £25 sale and £15 remaining payment. A £20 starting credit balance becomes £10, with one redemption entry. Default in-store fees are zero.

Trial boundaries: local browser storage remains; phone/laptop stock is not shared yet. Marketplace publishing/delisting is not implemented by manual checkout. Basket returns preserve historical receipts but do not automatically refund tender or reissue credit. Physical device camera and real provider matching need continued user testing.

## Item editor and preparation — 2026-10-13
Open any available stock record and choose Edit details. Correct purchase price, current market value, area/shelf and notes. Blank value means unknown; purchase price requires an explicit amount, including zero. Save/reload and check Timeline. Existing valuation evidence and acquisition snapshot are retained, with previous details saved in edit history. Changing current value is labelled manual and does not alter listing price or the historical buying estimate.
Processing is now Acquired → Preparing → Ready to list. Existing Needs cleaning/testing/repair/photos/pricing statuses are displayed in Preparing without rewriting history. Listed and sold stock cannot move forward/back through processing. Record sale/import controls Sold or Completed; dispatch steps and physical returns are in the item Sales tab. Dispatch progress is local only, not an eBay update.

At Ready to list, choose Continue to listing to record an existing eBay listing locally, or Record sale for a paid in-store/other sale. Cancel leaves listing state untouched. Processing never marks an item sold.

## Clear workspace trial
Inventory: choose Edit value directly, change market/purchase price and save; reload to verify. Item header also has Edit prices & details. Item holds preparation/condition, photo and notes. Selling & history holds listing, sale and expandable buying/evidence/timeline. Existing links to old tabs route into these two tabs. Record sale and Quick acquisition are always available above the page; item-context sale selects that stock record. Light mode is default; Dark mode remembers your device preference. Check on laptop and phone.
