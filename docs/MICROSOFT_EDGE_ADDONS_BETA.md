# Microsoft Edge Add-ons hidden Beta listing

This document is the source of truth for the PopIntent Beta listing in Microsoft Partner Center. Visibility must remain **Hidden** until the validation gate passes.

## Availability

- Visibility: Hidden
- Markets: All markets
- Pricing: Free
- In-product purchases: None

## Properties

- Category: Choose the closest available privacy, security, or productivity category in Partner Center.
- Website: https://github.com/SNNCS/PopIntent
- Support: https://github.com/SNNCS/PopIntent/issues
- Mature content: No

## Privacy

**Single purpose:** Protect the user's intended web navigation by closing unexpected popup tabs, preventing high-confidence click overlays, and briefly blocking high-confidence unrelated third-party same-tab redirects.

**storage justification:** Stores the selected protection mode, domain-only seven-day block history, aggregate counters, and short-lived session records needed for gesture correlation, same-tab protection, and Open anyway. No stored data is uploaded.

**webNavigation justification:** Observes navigation lifecycle events so PopIntent can correlate a user gesture with a newly created popup, wait for an about:blank child to commit, and manage the short same-tab guard. It does not read response bodies or request headers.

**declarativeNetRequest justification:** Applies a packaged reviewable ruleset and short-lived, tab-scoped Strict rules that block only high-confidence third-party main-frame redirects without reading request contents.

**Host access justification:** Runs the early gesture tracker on HTTP(S) pages and frames so the extension can distinguish a user's explicit link destination from a popup or overlay-triggered destination. It does not modify ordinary page content except to prevent a high-confidence transparent overlay click and show a local block notice.

**Remote code:** No. All executable code is included in the extension package.

**Data disclosures:** Conservatively disclose web history (source and target domains in local block history), user activity (click intent processed for navigation correlation), and website content (link destinations and overlay geometry processed locally). None is sold, transferred, used for advertising, credit decisions, or purposes unrelated to the single purpose. No browsing data is transmitted to the developer.

**Privacy policy:** https://github.com/SNNCS/PopIntent/blob/main/PRIVACY.md

## U.S. English store listing

**Name:** PopIntent Beta

**Short description:** BETA: Blocks unexpected popup tabs while keeping browsing data on your device.

**Description:**

PopIntent Beta is a local-first Microsoft Edge extension that protects the click you intended. It closes unexpected popup tabs, detects high-confidence transparent click overlays, and in Strict mode briefly blocks an unrelated third-party same-tab redirect after the intended page loads.

Main features:

- Default, Strict, and Paused protection modes for all sites.
- Popup decisions based on recent user intent and destination agreement.
- A short, tab-scoped Strict guard for high-confidence delayed redirects.
- A 60-second Open anyway option after a safe HTTP(S) destination is blocked.
- Seven-day, domain-only local block history with user verdicts.

PopIntent is not a general ad blocker and does not promise to stop every redirect. Default mode deliberately permits ambiguous login, payment, and document flows to reduce false positives.

There is no account, server, telemetry, advertising, analytics SDK, remote code, or browsing-data upload. Processing and short-lived correlation data remain on the user's device. See the privacy policy for the complete data inventory and retention periods.

**Search terms:** popup blocker, redirect protection, click protection, privacy, security

## Assets

- Extension logo: `store-assets/edge-logo-300x300.png`
- Screenshot: `store-assets/settings-1280x800.png`
- Small promotional tile: `store-assets/small-promo-440x280.png`

## Certification notes

PopIntent performs all detection locally and makes no application-initiated network requests. The packaged static redirector ruleset is empty. The extension's main behavior is exercised by opening normal links and pages that attempt script-created popup tabs. Strict mode is intentionally more aggressive; Default mode is designed to avoid breaking ambiguous sign-in, payment, and document flows.
