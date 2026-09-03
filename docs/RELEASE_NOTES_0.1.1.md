# PopIntent Beta 0.1.1

PopIntent 0.1.1 is a privacy and onboarding maintenance release for the public Beta.

## Changes

- Private-browsing status now comes only from the browser-owned sender tab. Unknown tab context fails closed and is never allowed to write persistent history, diagnostics, or validation counters.
- The popup resolves the active tab through the browser before recording a missed redirect, so a private-window report cannot enter persistent counters.
- Added direct links to a harmless public test page, project explanation, privacy notice, and structured problem report.
- Release ZIPs now use stable file ordering and timestamps, include a SHA-256 sidecar, and reproduce byte-for-byte from identical inputs.
- Updated store copy and screenshots to describe the user-visible symptom: an unwanted tab opening when someone clicks.

## Compatibility and data

- No new permissions.
- No server, account, telemetry, analytics, remote code, or data migration.
- Existing settings, counters, and seven-day domain-only history remain compatible.
- Default, Strict, Paused, and Open anyway behavior are unchanged.
