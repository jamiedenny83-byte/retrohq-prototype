# RetroHQ decision record

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
