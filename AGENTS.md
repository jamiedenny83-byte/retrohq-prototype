# RetroHQ development continuity

Before changes, read `docs/HANDOVER.md`, `docs/DECISIONS.md`, `docs/WORK_LOG.md`, and the current milestone notes. Inspect the actual branch, recent commits and open GitHub issues/PRs. Do not assume a previous chat's implementation claims are verified.

At the end of each development session update the handover and append the work log: request summary, decisions, code changed, tests with actual results, pushed commit/branch, outstanding work and blockers. Record durable product decisions in DECISIONS.md. Keep credentials, buyer details, tokens and full private chat transcripts out of these files (this repository is public).

Preserve CeX UK valuation and Sandbox Seller OAuth. Never change the callback route, RuName, scopes, token storage or Codespace identity as incidental cleanup. Use the existing Codespace and private port 8006. Do not create a new Codespace to change branches.

Before changing a working branch, preserve and verify its exact SHA as a rollback reference. Never force-push or overwrite existing rollback references. Check PR heads and branch-dependent workflows before renaming a branch. `main` remains the approved baseline; do not merge draft test work automatically.

8.4 scope: read-only Sandbox eBay order import and inventory reconciliation (issues #50/#51). Listing writes/crossposting and production seller access remain out of scope. 8.5 inventory/profitability and 8.6+ marketplace work remain backlog until explicitly scheduled.
