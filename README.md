# PopIntent

PopIntent is an experimental, local-first Chrome and Edge extension that closes unexpected popup tabs and preempts high-confidence transparent click overlays. It is deliberately narrower than an ad blocker: the goal is to preserve an intentional click while rejecting a different navigation that a page secretly attaches to it.

This repository contains the **0.1.0 validation build**. An unlisted Chrome Web Store Beta or hidden Microsoft Edge Add-ons Beta may be used for controlled tester recruitment; it is not a public production release and does not claim to stop every redirect.

## What it does

- Allows a new tab when its destination agrees with the link the user clicked.
- Closes a child tab when its destination contradicts the clicked link.
- Closes popups created without a recent user gesture.
- Prevents a transparent, viewport-sized layer when it covers a real control with high-confidence evidence.
- In Strict mode, briefly guards the intended same-tab destination after a high-confidence popup or overlay block and stops a no-gesture third-party top-level redirect.
- Offers global Default, Strict, and Paused modes.
- Offers a 60-second **Open anyway** action after closing a safe HTTP(S) destination.

Strict mode also closes script-created popups whose destination cannot be proven from the clicked control. After a high-confidence abuse signal, it can arm a tab-scoped DNR guard for the explicit same-tab destination: the initial intended navigation and first-party requests remain allowed, while a no-gesture third-party main-frame request from that destination is blocked for up to three seconds after commit. Default mode permits those ambiguous cases to avoid breaking sign-in, payment, and document flows. The selected mode applies to every HTTP(S) page and frame, including cross-origin iframes; Paused disables protection everywhere.

## What it does not do

- It is not a general ad, tracker, or content blocker.
- It does not stop arbitrary same-tab or server redirects without the Strict high-confidence chain described above, and the short guard intentionally expires after three seconds.
- It cannot run on browser-internal pages or protect against another malicious extension or local malware.
- It does not decide whether a visible link or button is honest.
- The packaged redirector ruleset is intentionally empty in 0.1.0; domains will only be added after reproducible evidence and false-positive review.

See [THREAT_MODEL.md](docs/THREAT_MODEL.md) for the complete boundary.

## Privacy

There is no server, account, telemetry, analytics SDK, remote code, or network upload. Recent block history contains domains—not full URLs—and expires after seven days. Full URLs exist only in short-lived browser session storage for gesture correlation and for up to 60 seconds so **Open anyway** can work. Incognito events are not written to persistent history or counters.

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
pnpm package:beta
```

`pnpm package` rebuilds, verifies the Manifest V3 output, rejects unexpected permissions/remote script patterns, and creates `release/popintent-0.1.0.zip`. `pnpm package:beta` creates the separately labeled `release/popintent-0.1.0-beta.zip` for an unlisted Chrome Web Store or hidden Microsoft Edge Add-ons testing program. Public store distribution remains blocked until the validation gate passes.

The automated suite uses Playwright's bundled Chromium because current branded Chrome and Edge builds do not support Playwright's command-line extension side-loading path. Stable Chrome and Edge are covered by the manual checklist in [SIDELOAD.md](docs/SIDELOAD.md).

## Permissions

| Permission | Why it is required |
| --- | --- |
| `storage` | Keep settings, seven-day domain-only history, aggregate validation counters, and short-lived session undo data. |
| `webNavigation` | Correlate user gestures with newly created navigation targets, committed `about:blank` children, and the lifecycle of a short same-tab guard. |
| `declarativeNetRequest` | Carry the packaged redirector ruleset and short-lived, tab-scoped Strict rules that block high-confidence third-party main-frame redirects without reading request contents. |
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

0.1.0 is for controlled validation with people who recently encountered unwanted popup redirects. An explicitly labeled, unlisted Beta listing may be used to recruit testers, but public store distribution and donation prompts remain blocked until the gate in [VALIDATION.md](docs/VALIDATION.md) passes. Reports must include a reproducible public test page or a minimal local fixture; do not add an entire marketplace or publisher domain to a redirector list based on a single anecdote.

## License

Mozilla Public License 2.0. See [LICENSE](LICENSE).
