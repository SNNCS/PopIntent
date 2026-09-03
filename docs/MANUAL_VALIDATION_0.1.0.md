# PopIntent 0.1.0 manual browser validation

Date: 2026-08-26 (Asia/Kuala_Lumpur)

## Result

Pass. The signed-off PopIntent 0.1.0 candidate passed the manual compatibility checklist in current official 64-bit builds of Google Chrome and Microsoft Edge.

This result originally authorized the small 3–5 person pre-trial described in the project handoff. It does not satisfy the separate 21-day validation gate. On 2026-09-02, the publisher separately chose to submit the existing 0.1.0 Microsoft Edge listing for Public visibility so a representative cohort can be recruited; that decision does not change this test result or imply that the gate passed.

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
| Global Paused mode allows `/target-mismatch` | Pass | Pass |
| Settings shows domain-only events and can mark an event incorrect | Pass | Pass |
| Settings exports aggregate JSON | Pass | Pass |
| Settings clears history | Pass | Pass |
| Browser restart preserves settings and history while expired session undo data is removed | Pass | Pass |
| Incognito/InPrivate blocks do not appear in normal Settings afterward | Pass | Pass |

## Observed Chrome evidence

Assisted testing directly observed the following outcomes in the installed Chrome build:

- `/intentional` opened only the expected `/legitimate` destination.
- `/target-mismatch` closed the unexpected `/ad` tab and displayed a notice with **Open anyway** and **Incorrect block**.
- `/overlay` and `/iframe-overlay` opened no ad tab and displayed the transparent-layer notice.
- Switching the global mode to Paused allowed the mismatched `/ad` destination as expected.

The user subsequently restored the intended protection state and confirmed that all remaining Chrome checklist items passed.

## Follow-up

While the Public update is in review, use the direct Microsoft Edge listing and the unlisted Chrome Beta to recruit the 10–15 participant cohort. After the Edge update becomes Live / Public, use store discovery as an additional recruitment path and run the 21-day gate in `docs/VALIDATION.md`. Keep Default as the normal mode and use Strict only for targeted sessions. Do not remove the Beta label, add donation prompts, make broad effectiveness claims, or expand real redirector domains before the gate passes.
