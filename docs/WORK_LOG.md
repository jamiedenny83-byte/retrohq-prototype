# RetroHQ development work log

Append dated summaries; preserve earlier entries. Every session should record request, evidence, decisions, changes, verification, upload state and next action. Use Europe/London dates. This public log contains operational summaries, not private chat transcripts.

## 2026-10-13 — scenario clarity and buying/inventory priority
- User confirmed demo works; reported Paid/Unmatched buttons accumulating confusing cards and insufficient item explanations. Screenshot showed raw IDs/statuses dominating the screen. User prioritised starting buying and inventory use over eBay troubleshooting.
- Starting uploaded head 7915d34ee286a0ce951fb83b08a50b41151e68f6, existing branch and draft PR #47 verified. Added scenario-specific views with retained ledger indices, active button/guide, and no replay/reset when revisiting a loaded sample. Simplified sales cards to item/price/status/action; technical evidence and return controls expand on demand. Demo totals moved into an expandable recorded-sales section; normal workspace puts backup and practice tools behind a secondary control.
- Reviewed quick capture: it records purchase, Area/Shelf, condition and a pending valuation without requiring an eBay order. This is code inspection, not new end-to-end operational validation. Shared storage and backup restore remain readiness gaps.
- Verification: JS syntax, 15 Node tests and whitespace checks pass. An isolated browser test was requested but NOT executed: automatic approval review could not complete because of a usage limit. This is an approval infrastructure failure, not a product test failure; visual acceptance for these latest changes remains pending.
- Upload target: retrohq-test-8.3, preserving earlier commits and the pre-demo rollback. No seller/CeX server or reconciliation engine changes. Follow-up: visual acceptance and a focused buying/inventory workflow and recovery pass.

## 2026-10-13 — isolated offline sales demo
- Request/approval: stop Sandbox website troubleshooting blocking RetroHQ testing; build and upload an isolated demo while preserving the eBay adapter for later acceptance.
- Starting remote/local head e6a9942714febd058925e99f3733a2f2ab66ce58, working branch retrohq-test-8.3, draft PR #47 open. Earlier Nifty decision notes were preserved and included. No real Sandbox purchase completed; zero-order fetch is expected.
- Added demo-sales.js fixtures and ?demo=1 mode in the existing app. Separate browser storage/lock, visible banner, demo reset/export, provider-request guard, paid/unmatched/two-unit/repeat/refund/cancellation/error controls. Uses unchanged sales-sync.js. Seller/OAuth, callback, CeX server code and Codespace configuration unchanged.
- Validation: 14/14 Node tests passed. Python 41 tests: 40 passed and 1 Windows POSIX-permission skip, using UTF-8 and local HTTP test access outside the execution sandbox. Initial restricted runs failed due to local networking/temp cleanup; default Windows text decoding also required UTF-8. No product change was made to bypass these environment restrictions.
- Headless Edge in a fresh isolated profile passed paid/manual/multi-unit imports, costs, repeat/reload, failure retention, refund/physical return, reset, byte-for-byte saved-workspace isolation while in demo, returning to saved stock, exclusive demo tab and zero provider requests. Screenshot reviewed. A sample timestamp was corrected to match the adapter's date-only contract.
- Upload target: same working branch, no force/merge/rename. This entry accompanies the implementation commit; verify its remote SHA and Linux CI before the next session. Real paid-order API acceptance remains deferred, not passed.
- Next: update existing Codespace, test the visible demo, then schedule further app work. Keep a genuine paid Sandbox order as a later focused acceptance check.

### Demo upload verified
- Uploaded `d6be6cb349d6b3bd6f3a61ec983ec3194e56d61c` on `retrohq-test-8.3`. Remote tree `9b5a0125255e508155f3da1dcbcbac869a541661` exactly matched staged tested files; local checkout aligned cleanly without discarding edits.
- Linux [push checks 38364717151](https://github.com/jamiedenny83-byte/retrohq-prototype/actions/runs/38364717151) and [PR checks 38364725807](https://github.com/jamiedenny83-byte/retrohq-prototype/actions/runs/38364725807) both completed successfully.
- Created rollback branch `retrohq-rollback-before-8.4-demo` at `e6a9942714febd058925e99f3733a2f2ab66ce58`. Updated existing draft PR #47 description; no merge, force push or branch rename. This documentation-only follow-up records the uploaded SHA and CI evidence.

## 2026-10-13 — Nifty review and crosslisting direction
- Request: compare Nifty with RetroHQ; user subsequently explicitly endorsed crosslisting as a future capability and agreed to record that direction.
- Reviewed Nifty public product/help material and RetroHQ code/milestone documentation. Public claims do not establish real-world reliability or an available Nifty integration API.
- Rechecked local branch/history and GitHub issue #51 and draft PR #47. Local checkout initially clean at e6a9942; PR remains open/draft on retrohq-test-8.3. Existing roadmap parks crosslisting; the new dated decision supersedes that product direction without expanding 8.4.
- Recorded user-reported successful zero-order Sandbox checks and pending paid-order acceptance. No test listing exists; reported outage is unverified.
- Changes: decision record, handover and this log only. No application code, credentials, Codespace, branch names or marketplace settings changed. Documentation whitespace checked; no application tests needed for this documentation-only change.
- Upload state: local notes only, no new commit/push or GitHub issue edit. Next roadmap upload should reconcile issue #51 with the new direction.
- Next work: complete 8.4 paid-order acceptance when Sandbox is available; scope inventory foundations and crosslisting delivery, choose channels and verify supported integration routes.

## 2026-10-11 — 8.4 continuation and continuity recovery
- Request: inspect actual GitHub code, branches, issues and PRs; finish 8.4 on the existing working branch, preserve 8.3 and existing CeX/eBay/Codespace setup, rename to `current` only if safe.
- Repository: `jamiedenny83-byte/retrohq-prototype`. Working branch began at `34399a0da48c4a3d02f8d3384582c047f6ddaf58`; this already includes two partial order-retrieval commits after verified 8.3.
- Existing verified rollback: `retrohq-rollback-8.3-verified` at `887f40d13b1bf450ae458c5140b3a053e64ec872`.
- Created additional GitHub rollback: `retrohq-rollback-before-8.4` at exact starting SHA `34399a0da48c4a3d02f8d3384582c047f6ddaf58`.
- Inspected open issues #50/#51 and open PRs #47 (draft Seller OAuth, head is working branch) and #15 (older milestone). Neither merged or closed.
- Recovered roadmap from issues and user's confirmation. Broader Flipwise ideas are staged for 8.5+, not silently added to 8.4.
- Baseline: 30/31 Python tests pass on Windows after allowing local test HTTP connections. One pre-existing failure expects POSIX mode 0600, which Windows does not implement. Keep the Linux security assertion.
- User requested a persistent record of chats, decisions and workload. Added repository continuity instructions and this log.
- Implementation and final verification: see the completion entry appended below and HANDOVER.md.

### Implementation and local verification
- Implemented `sales-sync.js` reconciliation and browser persistence; integrated the Sales/Listing screens, exact inventory allocation, fee evidence/cost confirmation, review and physical restoration. Added bounded safe order pagination and defensive normalisation in `ebay_seller.py`.
- OAuth functions, scopes, RuName/callback flow, token storage and `server.py` (including CeX) were not changed. The Windows-specific skip retains the original POSIX token-permission test for Linux CI.
- Final Windows Python suite: 41 tests, 40 passed, 1 explicitly skipped (POSIX token-file permission test). Final Node reconciliation suite: 10/10 passed. JavaScript syntax and `git diff --check` passed.
- Headless Edge browser acceptance with mocked Sandbox responses passed: exact link, paid import, real-cost confirmation, reload persistence, repeat sync, exclusive second-tab protection, escaped external title, refund flag without stock mutation, and confirmed physical return. No live credentials or eBay writes were used.
- Updated build label, startup instructions, CI Node test step, rollback/versioning guidance and permanent handover records. 8.5/8.6 work was not pulled into 8.4.
- User asked whether Astra/medium was suitable after Sol/high. Explained that model choice does not alter app configuration and that verification plus repository continuity are the safeguards; no model switch was performed by this task.
- Upload/CI status is recorded in the next entry after remote verification. Live Codespace/Sandbox acceptance remains outstanding.

### Upload and Linux CI verified
- Uploaded implementation commit `003875c575efd4d61079cfbdfc5d441b725f61c4` to `retrohq-test-8.3` through the connected GitHub account. The terminal had no GitHub credentials, so no credential/settings change was made.
- Verified remote tree `e06368c437378396e923922200aac2720f606e26` exactly matched the locally tested source. Updated the branch with an expected-head check; no force push, rename or merge.
- Linux GitHub Actions succeeded for both [push run 38154183696](https://github.com/jamiedenny83-byte/retrohq-prototype/actions/runs/38154183696) and [PR run 38154186887](https://github.com/jamiedenny83-byte/retrohq-prototype/actions/runs/38154186887). Python/CeX/OAuth and Node reconciliation steps all succeeded; the POSIX token-permission check is enabled on Linux.
- Updated [draft PR #47](https://github.com/jamiedenny83-byte/retrohq-prototype/pull/47) title/description to the actual 8.4 scope; kept it open and draft with the existing 8.2 target. No issue was closed or PR merged.
- Local checkout was aligned with the identical uploaded commit and was clean before this documentation-only completion entry.
- Outstanding: existing-Codespace live acceptance and a separately verified branch/PR transition to `current`. The Codespace URL/name was not supplied or independently inspected. No secrets, callback settings, token files or Codespaces were changed.
