# RetroHQ — start here for the next development chat

## 2026-10-23 — Final local verification before upload

Final application checks: 51 Node tests passed; Python61 run,60 passed/one Windows POSIX-only skip; JavaScript syntax and diff whitespace checks passed. Production/mock browser trial passed again after review, including navigation during an offer request; existing operations acquisition/lot/cost/report/backup/Sandbox-session/mobile regression also passed. Final backup review added malformed listing/order rejection and exact penny revenue consistency in both current and returned allocations; Node regressions passed. Live public CeX cash read smoke checked a game, console and PS4 V2 B controller; no live purchase or production seller acceptance. Upload target remains retrohq-test-8.3 with expected parent cad4d922 and existing rollback; final remote SHA/CI evidence to be appended after verification.

## 2026-10-23 — Production read and opportunity trial

The previously unfinished production batch is implemented for testing. Read **PRODUCTION_TRIAL.md** for exact existing-Codespace update, separate production keyset/RuName/scopes/secrets, stock linking, order/refund acceptance, resale research and rollback steps. Only Sandbox is configured; no real production seller or Browse acceptance claimed. New sidebar entries: Production eBay; Resale opportunities. Exact listing AND variation SKU; independent ledger; explicit ended-listing order matching; changed/refunded order review and physical-return tombstones. Atomic saves and bidirectional backup consistency guard stock. Top 10 per Games/Consoles/Accessories uses freshly checked exact CeX cash and all landed costs, never retail/voucher or unknown-cost zero. No fabricated deals; manual genuine eBay offers supported when approved Browse is unavailable.

Local evidence: 51 Node passed; 60 Python run, 59 passed / one Windows POSIX skip. Isolated browser production/stock/refund/cost/ranking/backup/failure/mobile/demo acceptance passed. Live public CeX chooser/detail smoke verified game, console and PS4 controller cash quotes; these are quote checks, not purchase opportunities or stock matches. Final post-review combined checks/upload/CI follow in WORK_LOG. Same branch/Codespace/private port and unchanged Sandbox helper; pre-production rollback remains cad4d922. No main merge or marketplace writes. Shared storage, real paid/production acceptance and crosslisting remain outstanding.

## 2026-10-23 — Interrupted work audit

Uploaded cad4d922c10007ad3247f9ef85e1079513421c49 passed GitHub runs39795866180 and39795875349; production-read rollback verified at same SHA. Local ebay_live.py/live-inventory.js and server/app/index/backup edits remain unfinished and NOT uploaded. No production UI or opportunity module yet; only Sandbox configured. Review exact SKU matching and ledger consistency and add production tests before release. Fixed productionKey backup rejection with regression. Transition checks:41 Node pass;53 Python run,52 pass/one POSIX Windows skip; syntax/diff checks pass. Production acceptance not performed. Detailed continuation record RETROHQ_NEXT_CHAT.md is in parent workspace.

Last updated: 2026-10-13 (Europe/London).

**Working implementation:** 8.4 now includes an isolated offline sales demo on `retrohq-test-8.3`. Pre-demo uploaded checkpoint: `e6a9942714febd058925e99f3733a2f2ab66ce58`. Inspect the remote tip and work log for upload/CI evidence. Real paid-order Sandbox acceptance remains pending and no longer blocks offline app testing.

Demo implementation uploaded as `d6be6cb349d6b3bd6f3a61ec983ec3194e56d61c`; both push and PR Linux checks passed. This subsequent documentation entry records completion. Pre-demo rollback branch `retrohq-rollback-before-8.4-demo` points to the exact pre-demo checkpoint above.

## Current work
Core-trial implementation uploaded at `f247cfcdb54caa06c7fa15f4d44bc2f756e8aa0f` on `retrohq-test-8.3`. Tested local tree matched GitHub exactly; local checkout aligned without discarding earlier work. See CORE_TRIAL.md for the user test path. Existing pre-demo rollback and intervening commits remain available.
Backup restoration is now implemented for the core trial: preview, mode separation, replacement confirmation, local pre-restore recovery copy and recovery download. New exports include workspace metadata; legacy v1 exports are supported with inferred workspace type. The single-browser/local-storage limitation remains. Test first in demo, then trial five real items alongside existing records.

Browser validation now succeeded for quick capture (cost and location), reload persistence, restore preview/confirmation, recovery retention and invalid-file rejection. Nineteen Node tests pass. This supersedes the earlier browser-tool blockage for this session.
User clarification: eBay integration and crosslisting remain central priorities. Sequence delivery around getting the core OS into daily use, then extend it; do not treat marketplace work as unimportant.

Clarity changes uploaded at `a5ea0fe912e918a27a140bcdf20205e907b2c728` on the existing branch. Visual browser acceptance remains pending because automatic approval review hit a usage limit. Local branch may still be at the previous checkpoint with equivalent staged changes; compare trees before aligning, preserving all edits.
Latest user priority: buying and inventory management first, with eBay optional. User confirmed the offline demo runs, then requested clearer scenarios and less screen clutter. The follow-up filters displayed sample orders without deleting progress, adds item/outcome guides, simplifies sales cards and makes backup/practice tools secondary in the normal workspace. Backup restoration and a focused acquisition-to-inventory acceptance pass are next readiness tasks; do not treat the current prototype as a sole stock system yet.

Milestone 8.4 implementation: read-only eBay Sandbox sales import and inventory reconciliation. See [test notes](TEST_8_4_NOTES.md) for actual functionality, limitations, update instructions and acceptance checks; see [work log](WORK_LOG.md) for verification/upload results. Do not mark live acceptance complete solely because offline tests pass.

Repository: `jamiedenny83-byte/retrohq-prototype`.
Working branch: `retrohq-test-8.3` (contains the 8.4 build; the branch name is retained for compatibility).
Open draft PR #47 targets 8.2. Do not merge until the user approves. Older PR #15 is unrelated to this increment. Issues #50/#51 define the roadmap.

## Preserved checkpoints
- `retrohq-rollback-8.3-verified` at `887f40d13b1bf450ae458c5140b3a053e64ec872`: verified CeX/Seller baseline.
- `retrohq-rollback-before-8.4` at `34399a0da48c4a3d02f8d3384582c047f6ddaf58`: exact starting tip including early order-reader work.

## User-confirmed facts
- CeX is working; Silent Hill 2 PS2 was successfully tested.
- Seller OAuth Sandbox was tested successfully in the existing Codespace.
- Keep the existing Codespace. Changing it previously changed the callback URL and broke eBay authorisation.
- The user wants ongoing development called `current` if safe. Rename has NOT been performed because PR #47 uses the existing branch as its head and local Codespace state is unverified.
- The user explicitly requested persistent summaries of chats, decisions and workload. Update these files at each handover.

## Next actions / workload
1. Check WORK_LOG.md for final test and upload evidence, then inspect remote branch state before continuing.
2. User updates the existing Codespace and tries **Try offline sales demo**. Follow the demo checks in TEST_8_4_NOTES.md. The current local session did not inspect or modify its secrets, token file, checkout or running server.
3. Collect acceptance results and any failed order examples with buyer data removed. Keep issues #50/#51 open until actual acceptance.
4. Resolve a rename plan for `current` only after checking the existing Codespace's clean status, branch tracking and PR #47 disposition. Do not create another Codespace. Include a transition plan for the old remote name and CI filters.
5. Schedule 8.5 after offline 8.4 acceptance: history, ageing, priorities, bulk buys, profit and inventory accuracy. Real eBay paid-order acceptance is deferred, not completed. Crosslisting is now a user-approved product direction for subsequent scoping (recommended 8.6+); exact channels and delivery schedule are not yet committed.

## Latest user-reported trial and product direction
- The existing app displays Test 8.4. Read-only Sandbox Inventory and Orders checks succeeded with zero samples, and order fetch returned zero orders. This validates connectivity, not paid-order reconciliation.
- User attempted a listing but it may have failed; no purchase was attempted. Zero orders is therefore expected. Sandbox website errors persisted after connectivity recovered. User approved pausing that troubleshooting in favour of offline testing.
- Nifty review led to explicit agreement to pursue crosslisting. First establish reliable stock identity, durable storage and sale/removal recovery. No listing writes or OAuth changes have been implemented.
- The 2026-10-13 decisions accompany the demo update. Issue #51 still carries the earlier parked wording; the dated local decision record supersedes it and should be reflected in the next roadmap issue revision.

## Continuity limitations
The old chats were only partially retrievable: assistant messages appeared as content-reference placeholders. Do not claim full access to them. The GitHub roadmap and user's confirmation supplied the reliable scope. This repository now holds the ongoing handover; no credentials or full private chat transcripts belong here.

## Photo/barcode handover — 2026-10-13
The own-photo identification requirement is now implemented using optional OpenAI API access, with explicit user review before market search. Barcode lookup validates complete codes and uses the resolved product name for further searches. Read PHOTO_BARCODE.md for private setup, tests and remaining real-photo acceptance. User has no configured photo API key yet. Keep marketplace integration and crosslisting central while enabling the core buying/inventory workflow.

## Connected buying implementation — 2026-10-13
Implemented photo retention through Buy Check → acquisition → inventory, cost-aware profit/max-buy estimates, historical snapshot, reference-photo display/download and backup validation. Private CeX/Seller settings and same Codespace/branch preserved. Rollback branch retrohq-rollback-before-connected-buying verified at c45cd48fd17db4ae99c23fc47b6a221c9911ec20.
Read CONNECTED_BUYING.md for the acceptance path and PHOTO_BARCODE.md for key setup. Real photo acceptance remains pending. Local storage is suitable only for a small trial; reference images are compressed and full-quality listing assets/shared storage still need development. Existing source screenshots/counters are not converted into images.

## Fast photo search — 2026-10-13
Latest user acceptance: key/model authentication succeeded; real image request reached OpenAI but returned 429. User confirmed zero API credit and now reports credits added. Do not record live recognition as passed until retried.
Photo search now opens capture/selection immediately and submits automatically without a PIN. Private Codespace access protects this trial; eBay administrative PIN remains. Rollback verified: retrohq-rollback-before-fast-photo-search at bb65efbfbf41081a43bfb5a950083b98457a5182. User needs pull/restart in the same Codespace on port8006.

## Refinement batch — 2026-10-13
Latest user reports successful live photo recognition (supersedes prior pending/429 notes). Implemented photo handoff, game box default preserving user overrides, transaction checkout with listed prices/channel fee defaults/discounts/credit, and sold inventory section. Read REFINEMENT_TRIAL.md. Rollback before this batch: retrohq-rollback-before-sales-refinements at 05be87612e72b755c0f9a5240c0a805032be1ada. Existing Codespace, private port, branch and OAuth preserved. Shared storage remains outstanding; transaction refunds do not automatically reissue credit or refund payments.

## Item editor / processing handover — 2026-10-13
Available item workspace has Edit details. item-management.js validates monetary edits and records before snapshots while preserving original valuation evidence. Processing has three phases and hard guards against sold/listed transitions. Local fulfilment/physical return controls are in the Sales tab. Rollback retrohq-rollback-before-item-editor verified at 1eb0c49fb995afabc37e3f2484dbfdc26189ba4e. Same branch/Codespace/OAuth retained; see REFINEMENT_TRIAL.md for acceptance.

## 2026-10-13 — Sale defaults and preparation handoff
Sale defaults / ready-stage handoff: checkout now defaults each new selection to current RetroHQ marketValue, not listing price; unknown values remain blank and overrides persist. Ready to list offers Continue to listing and Record sale. Existing eBay listing recording is explicitly local-only and cancellation is safe. Same Codespace/branch/OAuth. Rollback retrohq-rollback-before-sale-default at 48d268a8b12aaf6db6f3efcd434ca1c431686537.

## 2026-10-15 — Clear workspace and quick actions
Current item workspace has two tabs: Item, and Selling & history. Inventory table offers Edit value; item header offers Edit prices & details. Global sticky Record sale / Quick acquisition actions avoid page switching. Light theme defaults, optional remembered dark theme. Prior sale-default commit 314244de41d674e3e3298c1010f335896f6d9e9e passed CI runs 38425578740 and 38425569735. Rollback before this UI batch: retrohq-rollback-before-item-tabs at that exact commit. See RESELLERAI_REVIEW.md for research and proposed future workflow; publishing is not implemented.

## 2026-10-20 — CeX catalogue title normalisation
CeX game matching now normalises leading/trailing The, apostrophes, ampersands and bracketed age ratings. Title-only search uses the normalised title. Meaningful extra subtitle/sequel words are rejected; known edition labels still require confirmation. Live Hulk PS2 record 5060138437760 confirmed GBP12 benchmark on 2026-10-20; Getaway and Simpsons Hit and Run candidates also verified live. No claim all title mismatches are fixed. Rollback retrohq-rollback-before-cex-title-normalisation at eb5893c35f37f138527c4927b1289bae0d598966.

## 2026-10-22 — Operations and acquisition
Pending operations batch completed: single-screen acquisition, exact CeX auto-match after confirmed identity (edition/manual choice remains), clear action styling, stock ageing, trip/lot grouping, actual-profit review including promotion, bulk date/location/group edits, local listing-price history and pick/pack queue. Optional five-minute Sandbox session sync uses existing endpoint and exact stock matches, with PIN held only in memory. Tests: 40 Node pass; 53 Python run, 52 pass/one Windows skip; isolated browser acquisition/report/cost/backup/session checks pass. Production and opportunity work requested 2026-10-22 is next and requires separate production credentials; only Sandbox currently configured.


## 2026-10-28 — Shared inventory and production sales
User authorises eBay-only listings to create inventory and paid eBay orders to enter the normal Sales/receipts/fulfilment/reporting workflows. Inventory remains the shared physical-unit record. Initial historical sales are separate from current available quantity. Exact listing/variation matching, order-line idempotency, explicit owned-stock matching, missing-cost labels and retained return/change review prevent fabricated cost basis or destructive stock inference. First migration protects a browser recovery copy. No eBay writes, new OAuth permissions, shared device storage or billing introduced.

Optional future product architecture: Inventory core, Sales and Market Insights modules, marketplace connectors such as eBay within Sales. User prioritises their own complete system now; paid access/account boundaries remain a future deliberate implementation.

Validation: 69 Node tests pass; Python 67 run, 66 pass and one Windows POSIX skip; focused production 8 pass after timestamp regression assertion. Controlled browser checks pass initial/history counts, six views, cost entry and confirmed profit, shared linked-unit sale, transaction history, repeat/reload idempotency, provider failure retention, pre-import recovery and failed recovery-write retention. Actual account acceptance remains next. See UNIFIED_INVENTORY_TRIAL.md. Rollback retrohq-rollback-before-unified-inventory at f8c5084335b4be7c36e298acd4213c4fe4ff0eb6. Existing unuploaded guide edits remain separate.


## 2026-10-29 — Initial import and daily stock review
User requests new-user stock initialisation followed by daily workflows, duplicate prevention for identical physical copies, complete available eBay listing information, listing price as the imported market estimate and configured marketplace fee defaults. Add saved first-import decisions, exact owned-unit links, explicitly confirmed new/remainder quantities, separate historical sales and a resumable daily review for new/unmatched stock. Preview does not change items; confirmation protects a browser recovery copy. Existing linked paid sales continue through normal inventory/Sales/receipts. Quantities and acquisition evidence are retained; titles never merge stock automatically.

Imported eBay stock uses its GBP listing price as an editable asking-price market estimate, preserving manual overrides and owned valuations. Apply business eBay fee defaults as unconfirmed selling-cost estimates; keep purchase/preparation costs separate. Bounded cached read-only GetItem enrichment preserves available description, condition/category, brand, specifics/variation attributes, barcodes/product references, photos and shipping/return terms, with pending detail disclosure. Exclude buyer/seller contact data and active description HTML. Manual in-store checkout keeps editable price and percentage/fixed fees using configured defaults.

Future write-enabled connection should reduce quantity for units sold locally and end a listing only when none remain, with duplicate/retry protection and visible success. This is a recorded requirement, not implemented or newly permissioned. Preserve current OAuth, CeX, draft branch/base and private Codespace. Optional product modules remain future direction; no billing/accounts/shared storage introduced.

Validation: 82 Node tests pass. Python71 run,70 pass and one Windows POSIX skip; metadata-specific4 pass after final shipping-field addition. Controlled browser acceptance passes preview immutability, persisted decisions, three same-title units staying three, owned cost preservation, recovery copy, daily matched sale, gated new stock, imported value/details/photos/default fees, manual in-store price and percentage, deferred quantity warning and repeat sync. Rollback retrohq-rollback-before-stock-onboarding at bad37a1df954fab084d543e2ca68d7280589d500. Real account acceptance remains next; no live stock import performed by the agent.


## 2026-10-29 — Inline import, duplicate silo and one Sales page
User reports repeated manual eBay syncs, blank values, repeated imported listing rows, popup-heavy decisions, stock not appearing until a separate confirmation, and duplicate Sales/Sold inventory navigation. Replace the main decision flow with inline suggestions, unit selection and per-row atomic Link/Add/Later actions; accepted units appear immediately in Inventory. A single user fetch automatically drains missing detail-only batches with progress/cancel and no repeated listing/order retrieval. Backend detail requests remain PIN/same-origin protected and scoped to the snapshot's own listing/variation identities. Preserve all OAuth settings and read-only scope.

Fill unknown linked market values from the GBP listing price, preserving real manual/CeX overrides; fill missing listing metadata and show values/fee estimates directly on each import row. Already linked records refresh in place inside an expandable silo, not as new-import decisions. Conflicting repeated source listing+SKU rows create no new units. Excess untouched import placeholders and explicitly unselected linked units during overlap review are held outside all available-stock/sale/preparation checks, retaining records, costs and history. A confirmed genuinely separate physical unit can be released unlisted. Genuine multiple-copy quantities are grouped in Inventory with per-unit history underneath.

Unify Sales and Sold inventory into one Sales page with search, receipts, fulfilment, actual-cost controls and legacy sold records. Keep legacy navigation as an alias; no sale deletion. Add optional current-stock CSV onboarding with mapped fields/preview, GBP validation, quantity limits, SHA-256 repeat-file protection and identity duplicate review. This is not a verified SumUp/Goodtill adapter or sales-history importer; user has no EPOS currently. Preserve customer-module optional direction without introducing billing/accounts/shared device storage.

Validation:96 Node tests pass. Python76 run,75 pass and one Windows POSIX skip. Controlled browser acceptance passes one snapshot plus automatic detail batches, no decision popups, suggested exact-unit links, immediate inventory/value visibility, duplicate source silo, quantity groups/search, daily paid sale, unified Sales/legacy link, optional CSV stock import, recovery copy, reload and all themes. No real operator inventory was read or imported by the agent. See INLINE_IMPORT_TRIAL.md. Verified rollback retrohq-rollback-before-inline-import at65ba9672e47e8b1864aa364f581f16226b6c2f25. Earlier unpublished local guide edits remain separate.


## 2026-10-30 — Paid eBay sales and separate history import
User likes the inline inventory workflow but reports eBay sold orders missing from Sales. Verified the official Fulfillment schema: no cancellation is NONE_REQUESTED, previously rejected by Python normalization and both sales eligibility engines. Accept this documented value alongside existing compatible states; continue rejecting pending payment, actual cancellations/refunds and unsupported currency. Preserve all OAuth configuration and read-only scope.

The primary inline inventory fetch now imports eligible paid orders directly to Sales and normal receipts. Historical/unmatched sales create sold-only records with unknown costs and do not consume present-day available stock. New exact-linked sales retain the owned unit's costs. Backfilled older orders cannot explain a current quantity decline unless a previously observed unpaid order actually becomes paid. Existing sale deduplication, explicit stock matching, return review and receipt allocation remain in place.

Sales gains a protected direct order reader with 30/90/365/730-day creation-date ranges and no listing-detail fetch. Truncated history is not committed; repeat imports use the production order/line ledger. Add visible payment/change exceptions, All saved sales totals and an automatic pre-sales recovery copy. Dispatched records stay in Sales but leave the pick/pack queue. The regular inventory read retains its 30-day modified-order range. No aesthetic redesign, account/module billing or eBay write operations.

Validation: 101 Node tests pass; Python80 run,79 pass,one Windows POSIX skip. Controlled browser sales checks pass direct import, real cancellation-state eligibility, unchanged available stock for historical orders, one receipt, unpaid exceptions, repeat/reload deduplication, recovery copy and failed-read preservation. Existing inline inventory browser acceptance passes all scenarios and themes. See EBAY_SALES_TRIAL.md. Real-account sales acceptance remains pending operator testing. Exact rollback retrohq-rollback-before-sales-history preserved locally and remotely at9c0f3bed0cf9c9af9399e93081e017bb363ab7a5. Earlier unuploaded local operational guide edits remain separate.


## 2026-10-30 — Visible sale values and default fee association
User confirms live eBay sales arrive but reports missing value information and uncertainty over processing costs. The Sales page reused the inventory table: its blank Market field represented unknown stock valuation, not missing sale revenue. Replace this with a sales-specific table showing actual item revenue, buyer postage, known reference value separately, marketplace fee amount and percentage, purchase cost, preparation cost, confirmed net profit, lifecycle and direct cost review. Keep the search results and sample sales table consistent. Unknown preparation/purchase costs remain unknown; no sale price is relabelled as a market valuation.

Show business-default fee estimates explicitly before actual-cost confirmation. Read-only resync backfills missing estimates on existing production sales even when the listing is no longer active, and refreshes unconfirmed estimates from current defaults. Recorded actual/manual fees and confirmed costs remain intact. Cost review prefills the calculated GBP fee rather than showing an unexplained percentage or coercing a missing fee to zero. Acquisition/preparation remains separate from marketplace processing fees; no invented expenses or confirmed profit.

Validation:104 Node tests pass, including fee calculation, zero/missing defaults, old-record backfill, recorded-fee preservation and unchanged unknown purchase/preparation costs. Controlled browser checks pass visible sold value/fee/percentage, direct cost review with fee prefilled and preparation blank, search, repeat imports, receipts, reload, recovery and failed-read preservation. Existing inline inventory acceptance passes all scenarios/themes. Python code and endpoints unchanged; full regression CI runs on upload. User already confirmed real sales arrival; new value/fee screen still needs live operator acceptance. Exact rollback retrohq-rollback-before-sales-values preserved locally and remotely atedcf0b81bcf5aee22ed66942c0ad0a199df8cc84. Existing private operational guide edits remain separate.


## 2026-10-30 — Production Sales cleanup and actionable identification
User confirms sales values, inventory matching and ease of use, asks whether eBay shipment changes update dispatch and requests removing Sandbox from normal Sales. Verified existing production reconciliation changes an imported paid order from Sold/Packaged to Dispatched on the next import when eBay reports FULFILLED; the pick/pack queue then excludes it. No live background polling is promised. Remove the Sandbox orders panel from the normal Sales page while preserving isolated offline practice and Sandbox OAuth/settings.

User also reports Identify item opens Processing with no identification action. Add a dedicated existing-item identification dialog and route the dashboard task directly to it. Search the existing market connector, select catalogue candidates, check the physical item and explicitly confirm. Manual confirmation supports items without catalogue matches. Clear only the identification flag; preserve physical record ID, listing/SKU, costs, sale, valuation and history. Capture previous identity fields and confirmation provenance. Unchecked/incomplete confirmation cannot save. Reject unsafe fields and stale catalogue provenance; editing fields invalidates pending selection. Identification never adds stock or requires another acquisition. Add a direct identification control on item details, keep value tasks actionable, suppress irrelevant identification priorities for already dispatched/completed sales and separate task label/title visually.

Validation:107 Node tests pass. Controlled browser checks pass unshipped-to-FULFILLED transition with one receipt and no extra inventory, queue removal and absent Sandbox on normal Sales. Identity browser acceptance passes dashboard routing, cancellation/unchecked guards, catalogue selection, same-record confirmation, retained costs/listing, task removal and reload. Offline sales practice still renders. Python endpoints/scopes/CeX logic untouched; full CI follows upload. Operator has confirmed real sales/inventory/value acceptance; physical eBay shipment and new identity-screen acceptance remain pending. Exact rollback retrohq-rollback-before-sales-cleanup preserved locally and remotely at76260f745135b178cb408b843d882da2a9fc0751. Prior local operational guide edits remain separate.
