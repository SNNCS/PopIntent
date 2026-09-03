# Public Beta launch and discovery plan

This plan grows PopIntent through organic discovery and useful community participation. It does not use paid tester recruitment, purchased installs, incentivized reviews, or mass-posted promotion.

## Current status

Status as of 2026-09-03 (Asia/Kuala_Lumpur):

- Microsoft Edge Add-ons listing: https://microsoftedge.microsoft.com/addons/detail/laodoihicammlibklbcfafhpkkgabdji
- Live store version: 0.1.0
- Repository candidate: 0.1.1
- Live visibility: Public
- Public visibility confirmed: 2026-09-03
- Chrome Web Store visibility: Unlisted

Partner Center now shows the listing as Live and Public. Public discovery is an acquisition surface for the Beta, not evidence that the 21-day validation gate has passed.

Prepared launch surfaces:

- Public site and harmless protection test: https://snncs.github.io/PopIntent/
- Structured feedback form: https://github.com/SNNCS/PopIntent/issues/new?template=redirect-report.yml
- Store screenshots: Settings, active popup controls, and an unexpected-tab notice.
- Reproducible 0.1.1 Beta artifact with a SHA-256 sidecar.

## Positioning

Lead with one narrow benefit: PopIntent preserves the link a person meant to open while closing a different popup destination attached to the click. Describe it as a local-first public Beta, not a general ad blocker or a complete security product.

Useful proof points:

- No account, backend, telemetry, advertising, remote code, or browsing-data upload.
- Open source under MPL-2.0.
- Default, Strict, and Paused global modes.
- Recoverable **Open anyway** action and domain-only local history.

## Launch sequence

### Public launch preparation completed

1. Keep describing the listing as a Beta and link to the honest limitations.
2. Use the tailored messages in `LAUNCH_MESSAGES.md` for Edge users, privacy/open-source communities, and browser-extension developers; never bulk-post the same message.
3. Keep the structured GitHub feedback issue pinned and ask only for reproducible public URLs or minimal fixtures, browser version, mode, expected behavior, and actual behavior.
4. Use the three prepared store screenshots: a blocked popup with **Open anyway**, the popup mode selector, and the domain-only history view.

### Live / Public launch

1. Verify the listing in a clean Edge profile, including installation, the version currently served, Default mode, Settings, the safe test, and update eligibility.
2. Add the [official Microsoft Edge Add-ons badge](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/add-ons-badge) or a prominent install link near the top of `README.md`. Keep the badge unmodified, clickable, and at least 32 px high.
3. Publish one concise GitHub release or discussion announcing the public Beta and linking to the privacy notice, threat model, and feedback issue.
4. Make at most one tailored post in each suitable community. State that you maintain the project and explain why the community is relevant.
5. Reply to questions and bug reports before opening additional channels. Helpful follow-up produces more durable discovery than repeating the same launch post.

## Sustainable exposure channels

- **Microsoft Edge Add-ons search:** keep the short description concrete and retain focused terms such as `popup blocker`, `redirect protection`, and `click protection`. [Microsoft currently permits](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension#enter-search-terms-for-the-extension) up to seven search terms and 21 words total, with each term limited to 30 characters. Improve screenshots before adding more keywords.
- **Featured eligibility:** there is no manual application or appeal for the Edge Featured badge. Keep the extension reliable and the listing complete and current; [Microsoft evaluates](https://learn.microsoft.com/en-us/microsoft-edge/extensions/#the-featured-badge) quality, reliability, security, privacy, performance, and user experience automatically.
- **GitHub:** use repository topics such as `browser-extension`, `edge-extension`, `chrome-extension`, `popup-blocker`, `privacy`, and `manifest-v3`; keep installation and limitations visible above the fold.
- **Relevant communities:** prioritize Edge, browser-extension, privacy, open-source, web-security, and software-testing communities whose rules allow project sharing. Tailor each post and avoid bulk copying.
- **Problem-driven replies:** when someone asks about click-hijacked popups, answer the problem first and mention PopIntent transparently only when it is relevant.
- **Technical content:** publish a short explanation of the threat model and why PopIntent is narrower than an ad blocker. Link to the open implementation and test fixtures.
- **Authentic reviews:** after someone has used the extension long enough to form an opinion, invite an honest Edge Add-ons review. Never require, reward, script, or selectively solicit positive reviews.

## Weekly cadence

- Week 1: launch on the Edge listing and GitHub; post in no more than three well-matched communities.
- Week 2: publish one technical walkthrough or short demonstration and answer all actionable feedback.
- Week 3: share a brief development update based on reproduced issues, not vanity numbers.
- Week 4: compare store impressions/installs, GitHub traffic, issue quality, and validation participation; keep only the channels that produce relevant users.

## Measurement without product telemetry

Use aggregate surfaces already controlled by the user:

- Partner Center listing impressions, acquisitions, installs, ratings, and reviews.
- GitHub traffic, stars, forks, issue volume, and the number of reproducible reports.
- Opt-in validation exports and the pass criteria in [VALIDATION.md](VALIDATION.md).

Do not add in-extension telemetry merely to measure launch performance. Record a dated weekly snapshot in a local Markdown note, and do not publish private URLs, browsing histories, or user identities.

The launch baseline is recorded in [METRICS_2026-09-03.md](METRICS_2026-09-03.md).

## Success test

Exposure is useful only if it finds the right users. Prefer ten people who recently experienced click-hijacked popups and can provide reproducible feedback over a large number of untargeted installs. The 21-day gate in [VALIDATION.md](VALIDATION.md) remains the decision point for dropping the Beta label and making stronger claims.
