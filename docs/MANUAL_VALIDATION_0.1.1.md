# PopIntent 0.1.1 manual browser validation

Date: 2026-09-04 (Asia/Kuala_Lumpur)

## Status

In progress. The exact Microsoft Edge submission artifact has passed the Default-mode public and local fixture checks listed below, plus the Paused-mode allowance check. Strict mode, settings, restart, and InPrivate checks remain pending.

The extension is currently left in **Paused** mode after the Paused-mode allowance check. Restore **Default protection** before continuing.

## Candidate artifact

- Archive: `release/popintent-0.1.1-beta.zip`
- SHA-256: `7737C2835E11BAEEC1005375AAFC43E3B967FD5CC58F3D8AA1A6C3AE95F3CE58`
- Extracted test directory: `E:\Program\cearn_2\popintent\.tmp-manual-0.1.1`
- Manifest version: `0.1.1`
- Manifest version name: `0.1.1-beta`
- Archive hash and sidecar matched before extraction.

## Browser

| Browser | Version | Status |
| --- | --- | --- |
| Microsoft Edge | 152.0.4191.62, 64-bit installed build | In progress |

## Completed checks

| Check | Result | Evidence |
| --- | --- | --- |
| Public safe-test mismatched popup | Pass | Unexpected tab closed; page reported `Protected`; notice offered **Open anyway**, **Pause everywhere**, and **Incorrect block**. |
| Public safe-test intentional new tab | Pass | `Expected test page` remained open and the source page reported `Compatible`. |
| Public safe-test overlay | Pass | Invisible layer was bypassed and the real control received the click. |
| Local `/intentional` fixture | Pass | `/legitimate` remained open in a separate tab. |
| Local `/target-mismatch` in Default | Pass | Unexpected tab closed and the in-page notice offered **Open anyway**. |
| Local `/overlay` in Default | Pass | Coordinate click on the covered control opened no ad tab and showed the transparent-layer notice. |
| Local `/iframe-overlay` in Default | Pass | Coordinate click inside the iframe opened no ad tab and showed the notice in the top page. |
| Local `/target-mismatch` in Paused | Pass | `/ad` remained open and no PopIntent notice appeared. |

## Remaining checks

- Restore Default and confirm the popup shows the active HTTP(S) domain.
- Switch to Strict and cover the guarded same-tab abuse, user-initiated external, first-party automatic, and no-prior-abuse paths.
- Confirm settings shows domain-only history, incorrect verdicts, aggregate JSON export, and clear history.
- Confirm restart persistence and expiry of session-only undo data.
- With InPrivate access enabled, confirm a private block is absent from normal Settings.
- Confirm no manifest or service-worker errors are shown on the Edge extensions page.
