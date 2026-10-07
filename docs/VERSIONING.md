# RetroHQ Repository Workflow

- `main` is reserved for the last approved stable baseline.
- `retrohq-test-X.Y` is a frozen test branch for a specific build.
- Historical milestone/test branches are retained as rollback/history points.
- New development should branch from the latest approved/test baseline.

Each current test branch should contain current source, current startup instructions, current test notes and a changelog. Generated files and secrets must not be committed.
