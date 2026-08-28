# 21-day validation gate

PopIntent 0.1.0 is a sideload-only experiment. Do not publish it in the Chrome Web Store or Microsoft Edge Add-ons, add a donation prompt, or grow a redirector domain list until this gate passes.

## Recruit

- 10–15 participants who personally experienced an unwanted popup/redirect within the previous 30 days.
- Include both Chrome and Edge, with at least three active participants on each browser.
- Do not recruit only developers; include people who use free video, article, download, or streaming pages in ordinary browsing.
- Explain that this is experimental protection, not a general ad blocker or security guarantee.

## Run

1. Record browser/version and the participant's recent problem scenario without collecting browsing history.
2. Sideload the same signed-off ZIP and keep Default mode for the first week.
3. Ask participants to use **Incorrect block** for false positives, **Report a missed redirect** for misses, and **Open anyway** when they deliberately override a block.
4. Switch to global Strict mode only during targeted browsing sessions where Default continues to miss unwanted popups; return to Default when checking ordinary workflows.
5. At days 7, 14, and 21, have each participant export the aggregate JSON and answer three short questions: Did it stop a real problem? Did it break a task? Would you keep it installed?
6. Collect reproduction steps separately only with the participant's consent. Never request private URLs, account pages, or screenshots containing personal data.

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

At day 21, create a short Markdown report containing cohort size, browser split, aggregate counts, pass/fail for each criterion, top three reproduced misses, top three false positives, and one decision: stop, run a revised validation build, or prepare store submission. Do not include raw browsing histories or private URLs.
