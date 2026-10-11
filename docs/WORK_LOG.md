# RetroHQ development work log

Append dated summaries; preserve earlier entries. Every session should record request, evidence, decisions, changes, verification, upload state and next action. Use Europe/London dates. This public log contains operational summaries, not private chat transcripts.

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
