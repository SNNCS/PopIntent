# PopIntent Beta feedback and safe reproduction guide

PopIntent is looking for people who recently experienced an unwanted tab or redirect attached to a click. The most useful feedback is a result that can be reproduced safely—not a rating, install count, or general impression.

## Start here

1. [Install PopIntent Beta for Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/laodoihicammlibklbcfafhpkkgabdji).
2. [Run the harmless hosted tests](https://snncs.github.io/PopIntent/test/) to confirm that an intentional tab stays open and a mismatched popup closes.
3. Use Default mode during ordinary browsing. Strict mode is intentionally more aggressive and should be used only for targeted sessions.
4. If something is missed or incorrectly blocked, [open the structured report form](https://github.com/SNNCS/PopIntent/issues/new?template=redirect-report.yml).

## A useful report includes

- Browser and exact browser version.
- PopIntent version and protection mode.
- A public reproduction URL or minimal HTML fixture.
- Exact steps, expected result, and actual result.
- Whether **Open anyway** recovered a blocked destination.

Do not post private or authenticated URLs, browsing history, account details, personal screenshots, or an exported diagnostic file you have not reviewed. The public test page is safe to share and contains no ads, trackers, downloads, or third-party destinations.

PopIntent is a Beta, not a general ad blocker or complete security product. Its [privacy notice](../PRIVACY.md), [threat model](THREAT_MODEL.md), and [21-day validation criteria](VALIDATION.md) remain the source of truth.
