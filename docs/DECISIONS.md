# RetroHQ decision record

## 2026-10-23 — Production reads and evidence-gated sourcing

User explicitly authorises finishing/uploading the isolated production read and resale-opportunity work. This supersedes the historical Sandbox-only scope in AGENTS/older issues; no listing writes, automatic purchases, main merge, branch rename or new Codespace. Production has separate settings/RuName/callback/cache/token store while EBAY_ENV may stay sandbox. Existing physical stock must be explicitly linked; remote listings never imply zero-cost acquisitions. Production returns retain their duplicate ledger. Manual sync now; server/shared storage and unattended multi-channel selling remain later work.

Top10 is a per-category ranking of reviewed real offers, not an invented or guaranteed bargain feed. Exact platform/condition/completeness and direct CeX cash quote are required along with every landed cost and fresh availability confirmation. Use a configurable lower cash-profit threshold for reseller trades. When production Browse lacks credentials/access, show the real limitation and allow manual eBay offer research; do not treat Sandbox data or unverified Vinted access as live opportunities.

## 2026-10-13 — buying and inventory first; clearer screens
- User clarified that eBay and crosslisting remain central development priorities. Establish daily use of the core system, then build marketplace selling on that same inventory; do not interpret the core-first sequence as deprioritising marketplace integration.
- User wants RetroHQ usable for buying and physical stock management now; eBay remains important but optional and must not block that workflow. Prioritise acquisition, valuation, locations, processing, inventory accuracy and recoverable records before more marketplace breadth.
- User found the sales screen cluttered and scenario buttons confusing. Show only the chosen scenario's order, preserve accumulated progress, explain fictional items and expected outcomes, and put technical evidence and return controls behind expandable details.
- The current product is still a single-browser prototype. Backup export exists; restore UI and shared durable storage remain gaps before reliance as a sole operational stock system. Do not imply a full operational acceptance test has passed.

## 2026-10-13 — offline acceptance first
- User approved isolated demo mode for 8.4 to stop Sandbox website errors blocking RetroHQ development. Use the same normalized order model and reconciliation engine as the preserved eBay integration.
- Keep fictional inventory in separate storage, label every demo screen, block provider requests and make returning to the original workspace explicit. Reset/export must target only the current workspace.
- Pause Sandbox checkout troubleshooting. Connectivity and zero-order retrieval are verified by user reports; no paid order has completed. Revisit that small integration acceptance test later; do not claim simulated acceptance proves eBay end-to-end readiness.
- This changes the earlier strict sequencing gate: useful app development/testing may proceed using offline acceptance while the real paid-order check remains outstanding. Further milestones still need their implementation scope scheduled.

## 2026-10-11 — confirmed roadmap
- 8.4: automatic capture of eBay sale details, inventory matching, prices, available fee evidence, stock updates and fulfilment review. Read-only Sandbox seller calls; explicit review before stock changes. Sources: issues #50 and #51, confirmed by the user in the development chat.
- 8.5: complete item history, stock ageing, processing priorities, bulk-buy profitability and inventory accuracy.
- 8.6+: reassess read-only listing visibility and other marketplace integrations.
- Listing creation/publishing/crosslisting is parked. RetroHQ must work with orders from listings created by any tool, using Fulfillment order SKU/listing identity rather than relying on Inventory API coverage.
- CeX prerequisite is satisfied by the user's successful Silent Hill 2 PS2 test. Preserve game identity, UK retail/cash/voucher evidence and hardware matching.
- Keep the existing Codespace and port 8006 to preserve the working eBay callback origin. A branch change does not require creating another Codespace.
- Requested branch name: `current`, only if safe. Defer rename while its effect on the existing checkout is unverified: `retrohq-test-8.3` is the head of draft PR #47, which GitHub closes on head-branch rename. Do not perform a destructive rename merely to change the display name.
- Durable continuity belongs in the repository: handover, decisions, work log and milestone acceptance notes. Summarise chats; never publish secrets or private transcripts.

## Evidence and limitations
- The referenced chats expose recent user messages but assistant replies resolve only to content-reference placeholders. They are not a recoverable source of the complete earlier plan.
- GitHub issues #50/#51 contain the actual staged plan and take precedence over guesses about unavailable notes.
- No running Codespace checkout, uncommitted changes or live secrets have been inspected from this local development session.

## 2026-10-13 — crosslisting adopted as a product direction
- Following the Nifty review, the user explicitly wants crosslisting included in RetroHQ's future selling capabilities. This supersedes the earlier decision to park crosslisting indefinitely; it does not expand the current read-only 8.4 trial.
- Target experience: one physical stock record, reusable photos/details, marketplace-specific listing previews and prices, linked external listing IDs, sale detection and removal of remaining listings with visible failures and retry/review actions. Shop sales must also trigger the same stock reconciliation.
- Recommended sequence: finish paid-order 8.4 acceptance; deliver 8.5 inventory/history/accuracy foundations; scope crosslisting for 8.6+ starting with eBay and one suitable additional UK marketplace. Exact channels, release numbering and implementation schedule remain to be established.
- Before unattended publishing/delisting: persistent shared server storage, tested backups/restoration, background workers, idempotent jobs, audit history and recovery from partial marketplace failures. Cross-market removal has latency and cannot guarantee zero simultaneous sales.
- Evaluate supported marketplace APIs and any documented third-party integration before choosing build versus service integration. No Nifty API/partnership or ability to embed its service has been verified. User intent is crosslisting capability, not authorisation to subscribe to Nifty.
- Preserve CeX, existing Codespace and OAuth configuration. Any future listing-write permissions require a deliberate, separately tested connection change.
- Research basis: [Nifty product overview](https://nifty.ai/), [order analytics](https://docs.nifty.ai/analytics/orders), [inventory filters](https://docs.nifty.ai/inventory-management/search-sort-and-filter). Public documentation review, not a hands-on reliability comparison. Nifty is ahead in multi-market selling automation; RetroHQ's differentiators are specialist acquisition valuation and physical stock processing. Do not claim overall superiority.

## 2026-10-13 — Photo identification and barcode repair
User confirmed recognition of their own item photo is a core original requirement, and selected preparing OpenAI integration without an existing API key. Implemented optional private server-side Responses integration, confirmation before catalogue search, and barcode validation/resolved identity propagation. Preserve acquisition cost/location and existing CeX/Seller configuration. Setup and acceptance limits: PHOTO_BARCODE.md. Real photo acceptance requires the user's private API key; do not claim live recognition tested.

## 2026-10-13 — Connected reseller journey
User clarified the product purpose: replace repeated Lens identification, eBay research, inventory entry and listing/stock administration with one connected record. Explicitly authorised building/uploading the photo → buying decision → inventory segment now. Retain a compressed reference photo, confirmed identity, valuation evidence and acquisition cost snapshot. Keep unknown costs unknown and estimates distinct from actual sale profit. Listing/crosslisting remains an important next extension, not implemented by this acquisition change.

## 2026-10-13 — Fast everyday photo search
User requested one/two-action capture and explicitly removed the administrator PIN from everyday photo identification. Photo search opens native capture/file selection in the original click gesture and submits automatically after decoding/resizing. Result review stays explicit; no automatic purchase/stock changes. Existing private Codespace access is the access boundary for this trial, and the port must remain private. Seller PIN, OAuth, callback and secrets remain unchanged. Do not deploy publicly without normal user authentication. Physical phone/browser camera behaviour still needs user acceptance.

## 2026-10-13 — User trial refinements
User reports successful real photo identification after adding API credit. Requested removal of repeated high-confidence description confirmation, default boxed games, sale-price/channel-fee defaults, basket sales with discount/credit, and separate sold inventory. Implemented high-confidence automatic market lookup but retained ambiguous catalogue confirmation; image confidence is not exact catalogue proof. Game box default remains explicitly overridable. Checkout is one atomic saved state including transaction, item allocation and credit deduction; credit is tender, not discount. Live inventory excludes sold lifecycle states and sale records; sold records are preserved. Shared phone/laptop persistence and marketplace publishing remain separate future work.

## 2026-10-13 — Editable inventory and preparation boundaries
User requested purchase/value editing and fewer processing stages with no manual progression into Sold. Implemented available-item editor (purchase/current value/location/notes), historical before snapshots and timeline; current manual value does not rewrite acquisition evidence or listing prices. Preparation is Acquired → Preparing → Ready to list, with legacy Needs states grouped under Preparing. Processing cannot create/reverse sales or manage Listed; checkout/import controls sale state and Sales owns local dispatch/returns.

## 2026-10-13 — Sale defaults and preparation handoff
User clarified sale default must be current RetroHQ market value with override; this supersedes listed-price defaults. Preparation still stops at Ready to list, but provides explicit listing/sale handoff. Recording an existing eBay listing does not publish. Sold remains controlled by checkout/import.

## 2026-10-15 — Clear workspace and quick actions
User requests fewer clicks, more obvious value editing and a lighter, easier-to-read desktop. Use two item tabs with secondary information expandable; retain purchase evidence, buying snapshot and timeline. Global quick actions; contextual sale selection. Light default with dark option. ResellerAI research informs a proposed unified review step; no listing-write integration is implied or enabled.

## 2026-10-20 — CeX catalogue title normalisation
User reports multiple identified games fail UK valuation. Distinguish PriceCharting identity confirmation from CeX UK price confirmation in UI. Normalise conservative catalogue typography across titles, while retaining platform, meaningful title words and explicit CeX edition confirmation. Do not invent UK value or convert US reference prices.

## 2026-10-22 — Operations and acquisition
User authorises previously deferred Flipwise-inspired operations, one-screen acquisition and reduced confirmations. One clear exact game/platform match may auto-load CeX; no edition ambiguity is bypassed. Listings remain local records/recommendations. Unknown costs and return histories are excluded from confirmed profitability. On 2026-10-22 user authorises read-only production eBay listing/order integration and opportunity research; keep it isolated from Sandbox. No marketplace writes or automated purchases requested.


## 2026-10-28 — Shared inventory and production sales
User authorises eBay-only listings to create inventory and paid eBay orders to enter the normal Sales/receipts/fulfilment/reporting workflows. Inventory remains the shared physical-unit record. Initial historical sales are separate from current available quantity. Exact listing/variation matching, order-line idempotency, explicit owned-stock matching, missing-cost labels and retained return/change review prevent fabricated cost basis or destructive stock inference. First migration protects a browser recovery copy. No eBay writes, new OAuth permissions, shared device storage or billing introduced.

Optional future product architecture: Inventory core, Sales and Market Insights modules, marketplace connectors such as eBay within Sales. User prioritises their own complete system now; paid access/account boundaries remain a future deliberate implementation.

Validation: 69 Node tests pass; Python 67 run, 66 pass and one Windows POSIX skip; focused production 8 pass after timestamp regression assertion. Controlled browser checks pass initial/history counts, six views, cost entry and confirmed profit, shared linked-unit sale, transaction history, repeat/reload idempotency, provider failure retention, pre-import recovery and failed recovery-write retention. Actual account acceptance remains next. See UNIFIED_INVENTORY_TRIAL.md. Rollback retrohq-rollback-before-unified-inventory at f8c5084335b4be7c36e298acd4213c4fe4ff0eb6. Existing unuploaded guide edits remain separate.
