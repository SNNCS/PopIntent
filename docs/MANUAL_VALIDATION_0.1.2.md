# PopIntent 0.1.2 manual browser validation

Date: 2026-09-04 (Asia/Kuala_Lumpur)

## Status

Pending exact-artifact browser validation. Automated checks pass in both bundled Chromium and Microsoft Edge Stable; the packaged Beta must still be loaded and checked manually before certification.

## Candidate artifact

- Archive: `release/popintent-0.1.2-beta.zip`
- SHA-256: `3D5968E3A27078CD7ED25A3DB348F0D3357C8B17BDB542424A30825819188154`
- Extracted test directory: `E:\Program\cearn_2\popintent\.tmp-manual-0.1.2`
- Manifest version: `0.1.2`
- Manifest version name: `0.1.2-beta`
- Archive hash and sidecar matched before extraction.

## Required checks

- Default: public safe test, intentional new tab, mismatched target, top-frame overlay, and iframe overlay.
- Paused: mismatched target remains open without a PopIntent notice.
- Strict: delayed and instant guarded redirects, user-initiated external navigation, first-party automatic navigation, and the no-prior-abuse path.
- Settings: domain-only history, incorrect verdict, aggregate JSON export, and clear history.
- Lifecycle: restart persistence and expiry of session-only undo data.
- InPrivate: a private block is absent from normal Settings when InPrivate access is enabled.
- Edge extensions page: no manifest or service-worker errors.
