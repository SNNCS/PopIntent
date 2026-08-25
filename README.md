# PopIntent

PopIntent is an experimental, local-first Chrome and Edge extension that closes unexpected popup tabs and preempts high-confidence transparent click overlays. It is deliberately narrower than an ad blocker: the goal is to preserve an intentional click while rejecting a different navigation that a page secretly attaches to it.

This repository contains the **0.1.0 validation build**. It is not yet a store release and does not claim to stop every redirect.

## What it does

- Allows a new tab when its destination agrees with the link the user clicked.
- Closes a child tab when its destination contradicts the clicked link.
- Closes popups created without a recent user gesture.
- Prevents a transparent, viewport-sized layer when it covers a real control with high-confidence evidence.
- Offers per-site Default, Strict, and Paused modes.
- Offers a 60-second **Open anyway** action after closing a safe HTTP(S) destination.

Strict mode also closes script-created popups whose destination cannot be proven from the clicked control. Default mode permits those ambiguous cases to avoid breaking sign-in, payment, and document flows.

## What it does not do

- It is not a general ad, tracker, or content blocker.
- It does not reliably stop same-tab JavaScript redirects or server-side redirects.
- It cannot run on browser-internal pages or protect against another malicious extension or local malware.
- It does not decide whether a visible link or button is honest.
- The packaged redirector ruleset is intentionally empty in 0.1.0; domains will only be added after reproducible evidence and false-positive review.

See [THREAT_MODEL.md](docs/THREAT_MODEL.md) for the complete boundary.

## Privacy

There is no server, account, telemetry, analytics SDK, remote code, or network upload. Recent block history contains domains—not full URLs—and expires after seven days. A full destination URL exists only in browser session storage for up to 60 seconds so **Open anyway** can work. Incognito events are not written to persistent history or counters.

See [PRIVACY.md](PRIVACY.md) for the exact data inventory.

## Install the validation build

Requirements: Node.js 24+, pnpm 11.19+, and Chrome or Edge.

```powershell
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

Then load the `dist` directory as an unpacked extension. Chrome and Edge steps are in [SIDELOAD.md](docs/SIDELOAD.md).

## Test and package

```powershell
pnpm check
pnpm build
pnpm test:e2e
pnpm package
```

`pnpm package` rebuilds, verifies the Manifest V3 output, rejects unexpected permissions/remote script patterns, and creates `release/popintent-0.1.0.zip`. The same ZIP is the candidate artifact for both Chrome and Edge; store submission remains blocked until the validation gate passes.

The automated suite uses Playwright's bundled Chromium because current branded Chrome and Edge builds do not support Playwright's command-line extension side-loading path. Stable Chrome and Edge are covered by the manual checklist in [SIDELOAD.md](docs/SIDELOAD.md).

## Permissions

| Permission | Why it is required |
| --- | --- |
| `storage` | Keep settings, seven-day domain-only history, aggregate validation counters, and short-lived session undo data. |
| `webNavigation` | Correlate user gestures with newly created navigation targets and committed `about:blank` children. |
| `declarativeNetRequest` | Carry a packaged, reviewable redirector ruleset and per-site pause exceptions without observing request contents. |
| All HTTP/HTTPS sites | Capture click intent early in normal pages and iframes, and compare it with resulting child navigation. |

The extension does not request `tabs`, `webRequest`, downloads, clipboard, notifications, or native-messaging permission.

## Project structure

- `src/core`: pure classifiers, URL policy, retention, and aggregate summary logic.
- `src/background`: MV3 service worker and serialized local storage boundary.
- `src/content`: early gesture capture, overlay evidence, and in-page notices.
- `extension`: manifest, static UI, and packaged DNR rules.
- `tests/unit`: pure and storage-boundary tests.
- `tests/e2e`: synthetic hostile pages and visible Chromium behavior.
- `docs/VALIDATION.md`: the 21-day real-user decision gate.

## Status and contribution rule

0.1.0 is for controlled sideload validation with people who recently encountered unwanted popup redirects. No store listing and no donation prompt should be added until the gate in [VALIDATION.md](docs/VALIDATION.md) passes. Reports must include a reproducible public test page or a minimal local fixture; do not add an entire marketplace or publisher domain to a redirector list based on a single anecdote.

## License

Mozilla Public License 2.0. See [LICENSE](LICENSE).
