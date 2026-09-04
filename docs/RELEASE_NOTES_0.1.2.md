# PopIntent Beta 0.1.2

PopIntent 0.1.2 supersedes the unsubmitted 0.1.1 draft after stable Edge validation found a reproducible Strict-mode timing bypass.

## Changes

- Arms the short tab-scoped same-tab guard immediately after a high-confidence popup is blocked, before a slow extension worker or fast landing-page redirect can win the race.
- Keeps the existing explicit-navigation fallback, expiry, first-party allowance, and Paused behavior.
- Adds an instant-redirect regression fixture and makes the E2E browser channel selectable so the same suite can run against bundled Chromium and installed Edge Stable.
- Includes all privacy, onboarding, release-tooling, and store-copy changes from 0.1.1.

## Compatibility and data

- No new permissions, network requests, remote code, account, telemetry, analytics, or data migration.
- Existing settings, counters, and seven-day domain-only history remain compatible.
- This changes Strict-mode DNR timing and therefore starts a new 21-day behavioral validation window.
