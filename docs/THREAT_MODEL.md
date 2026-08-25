# Threat model

## Security objective

When a person intentionally clicks one visible control, a page should not silently use that gesture to open an unrelated child tab or intercept the click through a transparent page-sized layer. PopIntent should stop high-confidence cases while keeping ordinary new-tab, sign-in, payment, and document workflows usable.

## Protected interactions

PopIntent evaluates HTTP(S) pages and frames for:

1. A new child tab whose destination contradicts the explicit destination of the clicked link or form control.
2. A child tab created without a recent user gesture.
3. A nearly transparent fixed/absolute element covering at least 60% of the viewport, with no visible paint, above a real actionable control.
4. In Strict mode, a script-created popup whose destination was not explicit in the clicked control.

An `about:blank` child is held as pending for up to five seconds so its first HTTP(S) commit can be evaluated. Gesture evidence is considered stale after 1.5 seconds.

## Attacker assumptions

The hostile page can run arbitrary page JavaScript, modify the DOM, create frames, use `window.open`, and change a newly opened `about:blank` tab. It cannot compromise the browser, the extension process, or the user's operating system.

The content script runs in an isolated world and captures trusted pointer/keyboard activity early. The service worker makes the final tab decision from browser navigation events. Page scripts cannot send authenticated extension runtime messages directly.

## Out of scope

- Same-tab JavaScript navigation and HTTP server redirects.
- Deceptive but visible buttons, links, consent text, or download prompts.
- Ads and trackers that do not hijack a navigation gesture.
- Browser-internal, extension, `file:`, and other non-HTTP(S) pages.
- Popups opened by another extension, native application, browser exploit, or malware.
- Perfect classification against adversarial page code.

PopIntent is not a malware scanner, content blocker, parental-control tool, or substitute for browser safe-browsing protections.

## False-positive controls

- Default mode permits ambiguous script-created popups after a recent gesture.
- Strict behavior is opt-in per domain.
- A domain can be paused immediately.
- A safely parseable HTTP(S) target can be reopened once for 60 seconds.
- The user can mark a block incorrect, and only aggregate counts are exported.
- Packaged domain rules must be static, reviewable, reproducible, and narrowly scoped. The 0.1.0 list is empty.

## Data and supply-chain controls

- No backend, remote code, remote rule update, telemetry, or externally connectable API.
- Minimal MV3 permissions are checked during packaging.
- Dependencies are pinned in `pnpm-lock.yaml`; only esbuild is permitted to run an install build script.
- Distribution JavaScript is scanned for `eval`, `new Function`, and remote URL literals.
- Persistent history is domain-only, expires after seven days, and excludes incognito events.

## Known residual risks

A page can avoid the current detector by navigating the same tab, delaying beyond the gesture window, presenting a visibly painted overlay, or making the unexpected target resemble the declared target. Some browser flows legitimately produce mismatched or unproven targets, so stronger blocking remains per-site opt-in. The validation gate exists to quantify those misses and breakages before public distribution.
