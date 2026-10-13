# RetroHQ — start here for the next development chat

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
