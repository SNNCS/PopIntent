# 21-day validation gate

PopIntent is an experimental public Beta. As of 2026-09-04, Microsoft Edge Add-ons serves 0.1.0 as Live and Public; 0.1.2 is the next candidate. The Chrome Web Store Beta remains unlisted. Public distribution is intended to recruit a representative cohort and does not mean this gate has passed.

Do not remove the Beta label, make broad effectiveness claims, add a donation prompt, or grow a redirector domain list until this gate passes.

## Recruit

- Recruit 10–15 consenting participants who personally experienced an unwanted popup/redirect within the previous 30 days; ordinary public installs do not count unless the user opts into the validation process.
- Include both Chrome and Edge, with at least three active participants on each browser.
- Do not recruit only developers; include people who use free video, article, download, or streaming pages in ordinary browsing.
- Explain that this is experimental protection, not a general ad blocker or security guarantee.

## Run

1. Record browser/version and the participant's recent problem scenario without collecting browsing history.
2. Edge participants should install the current signed-off package from Microsoft Edge Add-ons. Chrome participants may use the unlisted Beta or the verified sideload package. Record the exact extension version and artifact SHA-256 at enrollment. Keep Default mode for the first week.
3. Ask participants to use **Incorrect block** for false positives, **Report a missed redirect** for misses, and **Open anyway** when they deliberately override a block.
4. Switch to global Strict mode only during targeted browsing sessions where Default continues to miss unwanted popups; return to Default when checking ordinary workflows.
5. At days 7, 14, and 21, have each participant export the aggregate JSON and answer three short questions: Did it stop a real problem? Did it break a task? Would you keep it installed?
6. Collect reproduction steps separately only with the participant's consent. Never request private URLs, account pages, or screenshots containing personal data.

## Version continuity

- Record the installed extension version at enrollment and at each day 7, 14, and 21 checkpoint. Keep aggregate exports grouped by version.
- Existing 0.1.0 observations may continue into 0.1.1 because 0.1.1 changes private-context persistence, onboarding links, and release tooling without changing the navigation classifiers. Report the version split in the final decision record.
- Version 0.1.2 changes Strict-mode DNR guard timing, so every participant updated to 0.1.2 starts a new 21-day behavioral window. Do not merge 0.1.2 effectiveness or false-positive counts with 0.1.0/0.1.1.
- A release that changes a classifier, protection-mode behavior, DNR rule logic, event meaning, or aggregate-counter definition starts a new 21-day window for each updated participant. Do not merge its effectiveness or false-positive counts into an earlier behavioral version.
- A participant who skips an update may remain in the cohort, but their results must stay assigned to the version they actually used.

## Pass criteria

All conditions must be met:

- At least 10 participants complete 21 days; at least three use Chrome and three use Edge.
- At least 30 real unwanted attempts are either blocked or reported missed across the cohort.
- Effectiveness is at least 80%: `blocked / (blocked + missed redirects)`.
- False positives are at most 2% of rated/overridden blocks, and there is no unresolved high-impact breakage involving sign-in, payment, file upload, or document loss.
- At least 60% of completing participants say they would keep it installed.
- Manual stable-browser checklist passes on the exact release artifact in both Chrome and Edge.
- Privacy review confirms no application-initiated network requests and no full URLs in persistent storage/export.

Treat **Open anyway** as a false-positive review signal, not automatically as a false positive. A user may inspect an unwanted destination intentionally.

## Stop or revise criteria

Stop the trial and fix before continuing if PopIntent causes data loss, repeatedly breaks authentication/payment, persists private browsing activity, requests an unexplained permission, or produces a reproducible bypass that turns a supposedly prevented click into navigation.

If effectiveness is below 80%, do not compensate by leaving Strict mode enabled for the whole cohort. Classify the missed mechanisms first and decide whether they fit the narrow threat model. If false positives exceed 2%, make the detector more conservative or narrow the protected interaction.

## Decision record

At day 21, create a short Markdown report containing cohort size, browser split, version split, artifact checksums, aggregate counts by behavioral version, pass/fail for each criterion, top three reproduced misses, top three false positives, and one decision: stop, run a revised Beta, or graduate the public Beta toward a stable release. Do not include raw browsing histories or private URLs.
