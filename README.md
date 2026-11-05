# RetroHQ OS — Internal Prototype

**Current test build: operations, isolated production eBay reads and evidence-gated resale opportunities.**

[Production setup, same-Codespace update and acceptance guide](docs/PRODUCTION_TRIAL.md). Only Sandbox is currently configured; real production seller/Browse acceptance remains pending.

Working branch remains `retrohq-test-8.3` so the existing Codespace can update in place. Do not create a new Codespace. The requested `current` rename is deferred until its local tracking and draft PR #47 transition can be verified.

- [Start / update the existing Codespace](START_HERE.md)
- [8.4 features, limitations and Sandbox acceptance checks](docs/TEST_8_4_NOTES.md)
- [Next-chat handover and outstanding workload](docs/HANDOVER.md)
- [Decisions](docs/DECISIONS.md) · [Development work log](docs/WORK_LOG.md)

Rollback references: `retrohq-rollback-8.3-verified` and `retrohq-rollback-before-8.4`. `main` is unchanged. This is a draft trial with separate production-read code awaiting real seller acceptance.

Inventory and import history are saved together in the same browser profile/site address; this is not shared multi-device storage. Existing CeX and Sandbox Seller OAuth configuration remain unchanged; production uses additional isolated settings. Never put credentials, tokens, buyer details or exported inventory backups in this public repository.

Offline checks: `python -m unittest discover -s tests -v` and `node --test tests/*.test.js`. The private token-file permission test runs on Linux; it is explicitly skipped on Windows.
