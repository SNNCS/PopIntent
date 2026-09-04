# PopIntent 0.1.1 manual browser validation

Date: 2026-09-04 (Asia/Kuala_Lumpur)

## Status

Superseded; do not submit. The exact Microsoft Edge submission artifact passed the Default and Paused checks below, but failed the Strict same-tab guard check in the installed Edge profile: after a high-confidence popup block and an explicit same-tab continuation, the delayed third-party redirect reached `http://localhost:4173/ad` in 10 of 10 runs.

The failure was reduced to a rule-installation timing race and fixed in 0.1.2. Because the fix changes Strict-mode DNR behavior, validation restarts on the 0.1.2 artifact.

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

## Checks not completed after supersession

- Restore Default and confirm the popup shows the active HTTP(S) domain.
- Switch to Strict and cover the guarded same-tab abuse, user-initiated external, first-party automatic, and no-prior-abuse paths.
- Confirm settings shows domain-only history, incorrect verdicts, aggregate JSON export, and clear history.
- Confirm restart persistence and expiry of session-only undo data.
- With InPrivate access enabled, confirm a private block is absent from normal Settings.
- Confirm no manifest or service-worker errors are shown on the Edge extensions page.
