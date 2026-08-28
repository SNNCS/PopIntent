# PopIntent 0.1.0 manual browser validation

Date: 2026-08-26 (Asia/Kuala_Lumpur)

## Result

Pass. The signed-off PopIntent 0.1.0 candidate passed the manual compatibility checklist in current official 64-bit builds of Google Chrome and Microsoft Edge.

This result authorizes the small 3–5 person pre-trial described in the project handoff. It does not satisfy the separate 21-day validation gate and does not authorize extension-store publication.

## Candidate artifact

- Archive: `release/popintent-0.1.0.zip`
- SHA-256: `BA6DD1D27BA6CF173DA2269A7F2A092A3F09F38D224BEAA237B6BBA700E99A84`
- Extracted test directory: `E:\Program\test_popintent`
- Candidate-file comparison: all 16 archive files were present and matched by SHA-256.
- The extracted directory also contained `_metadata\generated_indexed_rulesets\_ruleset1`, a browser-generated ruleset cache created after sideloading. It was not part of the candidate ZIP and must not be included in a rebuilt package.

## Browsers

| Browser | Version | Result | Evidence source |
| --- | --- | --- | --- |
| Google Chrome | 151.0.7922.174 (Official Build), 64-bit | Pass | Core navigation flows observed during assisted testing; remaining popup, settings, restart, and private-mode checks confirmed manually by the user. |
| Microsoft Edge | 151.0.4129.107 (Official build), 64-bit | Pass | Full checklist completed and confirmed manually by the user. |

Both browsers reported that they were up to date when tested.

## Compatibility checklist

| Check | Chrome | Edge |
| --- | --- | --- |
| Loads without manifest or service-worker errors | Pass | Pass |
| Popup shows the active HTTP(S) domain and changes Default, Strict, and Paused mode | Pass | Pass |
| `/intentional` opens the legitimate destination in a new tab | Pass | Pass |
| `/target-mismatch` closes the unexpected tab and shows **Open anyway** | Pass | Pass |
| `/overlay` prevents the ad tab and shows a notice | Pass | Pass |
| `/iframe-overlay` prevents the ad tab and shows a notice in the top page | Pass | Pass |
| Global off allows `/target-mismatch` | Pass | Pass |
| Per-site Paused allows `/target-mismatch` | Pass | Pass |
| Settings shows domain-only events and can mark an event incorrect | Pass | Pass |
| Settings exports aggregate JSON | Pass | Pass |
| Settings clears history | Pass | Pass |
| Browser restart preserves settings and history while expired session undo data is removed | Pass | Pass |
| Incognito/InPrivate blocks do not appear in normal Settings afterward | Pass | Pass |

## Observed Chrome evidence

Assisted testing directly observed the following outcomes in the installed Chrome build:

- `/intentional` opened only the expected `/legitimate` destination.
- `/target-mismatch` closed the unexpected `/ad` tab and displayed a notice with **Open anyway**, **Pause this site**, and **Incorrect block**.
- `/overlay` and `/iframe-overlay` opened no ad tab and displayed the transparent-layer notice.
- Switching `127.0.0.1` to Paused allowed the mismatched `/ad` destination as expected.

The user subsequently restored the intended protection state and confirmed that all remaining Chrome checklist items passed.

## Follow-up

Proceed with the small 3–5 person pre-trial. If it exposes no blocking issue, recruit the 10–15 participant cohort and run the 21-day gate in `docs/VALIDATION.md`. Do not publish to extension stores, add donation prompts, enable global Strict mode, or expand real redirector domains before that gate passes.
