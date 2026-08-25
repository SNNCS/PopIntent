# Confirmed test seams

The implementation plan approved on 2026-08-25 fixes these observable seams:

1. `classifyNavigation(input)` returns the navigation action and user-facing reason.
2. Runtime messages connect gesture capture, browser navigation events, storage, and UI.
3. Storage operations expose settings, bounded event history, undo state, and aggregate export.
4. Browser fixtures verify visible outcomes: a suspicious click is prevented or its child tab is closed, while intentional navigation remains usable.

Tests assert behavior only through these seams. Chrome APIs are mocked only at the browser boundary; project modules are not mocked.
