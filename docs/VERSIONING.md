# RetroHQ Repository Workflow

- `main` is reserved for the last approved stable baseline.
- Working development currently stays on `retrohq-test-8.3`, including Test 8.4, so the existing Codespace can pull updates in place.
- Historical milestone/test branches are retained as rollback/history points.
- Preserve the exact working tip as a rollback reference before each milestone. Do not overwrite historical checkpoints.
- A future `current` rename requires checking Codespace tracking, open PR heads and CI first. It is not implemented yet; see HANDOVER.md.

Each current test branch should contain current source, current startup instructions, current test notes and a changelog. Generated files and secrets must not be committed.
