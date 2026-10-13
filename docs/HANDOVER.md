# RetroHQ — start here for the next development chat

Last updated: 2026-10-13 (Europe/London).

**Working implementation:** 8.4 now includes an isolated offline sales demo on `retrohq-test-8.3`. Pre-demo uploaded checkpoint: `e6a9942714febd058925e99f3733a2f2ab66ce58`. Inspect the remote tip and work log for upload/CI evidence. Real paid-order Sandbox acceptance remains pending and no longer blocks offline app testing.

## Current work
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
