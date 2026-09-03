# Threat model

## Security objective

When a person intentionally clicks one visible control, a page should not silently use that gesture to open an unrelated child tab or intercept the click through a transparent page-sized layer. PopIntent should stop high-confidence cases while keeping ordinary new-tab, sign-in, payment, and document workflows usable.

## Protected interactions

PopIntent evaluates HTTP(S) pages and frames for:

1. A new child tab whose destination contradicts the explicit destination of the clicked link or form control.
2. A child tab created without a recent user gesture.
3. A nearly transparent fixed/absolute element covering at least 60% of the viewport, with no visible paint, above a real actionable control.
4. In Strict mode, a script-created popup whose destination was not explicit in the clicked control.
5. In Strict mode, a third-party top-level navigation initiated without a new trusted gesture within three seconds after an explicit same-tab destination commits, but only when the source tab had a recent high-confidence popup or transparent-overlay block.

An `about:blank` child is held as pending for up to five seconds so its first HTTP(S) commit can be evaluated. Gesture evidence is considered stale after 1.5 seconds. A same-tab guard may wait up to ten seconds for the explicit destination to commit, then protects only that tab and destination initiator for three seconds. First-party requests are not blocked.

## Attacker assumptions

The hostile page can run arbitrary page JavaScript, modify the DOM, create frames, use `window.open`, and change a newly opened `about:blank` tab. It cannot compromise the browser, the extension process, or the user's operating system.

The content script runs in an isolated world and captures trusted pointer/keyboard activity early. The service worker makes the final tab decision from browser navigation events. Page scripts cannot send authenticated extension runtime messages directly.

## Out of scope

- Same-tab JavaScript navigation and HTTP server redirects that do not follow the Strict high-confidence chain above, including redirects after its short protection window.
- Deceptive but visible buttons, links, consent text, or download prompts.
- Ads and trackers that do not hijack a navigation gesture.
- Browser-internal, extension, `file:`, and other non-HTTP(S) pages.
- Popups opened by another extension, native application, browser exploit, or malware.
- Perfect classification against adversarial page code.

PopIntent is not a malware scanner, content blocker, parental-control tool, or substitute for browser safe-browsing protections.

## False-positive controls

- Default mode permits ambiguous script-created popups after a recent gesture.
- An ambiguous `strict_unproven` popup from a visible semantic control is not sufficient evidence to arm the same-tab guard.
- The same-tab guard is limited to Strict mode, one tab, one expected initiator, third-party main-frame requests, and a three-second post-commit window. A new trusted gesture, Paused/Default, tab closure, or expiry removes it.
- Default, Strict, and Paused are selected globally and apply to every page and descendant frame.
- Protection can be paused everywhere immediately.
- A safely parseable HTTP(S) target can be reopened once for 60 seconds.
- The user can mark a block incorrect, and only aggregate counts are exported.
- Packaged domain rules must be static, reviewable, reproducible, and narrowly scoped. The 0.1.1 list is empty.

## Data and supply-chain controls

- No backend, remote code, remote rule update, telemetry, or externally connectable API.
- Minimal MV3 permissions are checked during packaging.
- Dependencies are pinned in `pnpm-lock.yaml`; only esbuild is permitted to run an install build script.
- Distribution JavaScript is scanned for `eval`, `new Function`, and remote URL literals.
- Persistent history is domain-only, expires after seven days, and excludes incognito events.

## Known residual risks

A page can avoid the current detector by navigating the same tab without a preceding high-confidence abuse signal, delaying beyond the short guard window, presenting a visibly painted overlay, or making the unexpected target resemble the declared target. A legitimate authentication or payment flow can still resemble the guarded sequence, so a blocked same-tab destination remains recoverable with **Open anyway** and stronger global Strict blocking remains opt-in. The validation gate exists to quantify those misses and breakages during the public Beta before the project drops the Beta label or broadens its protections.
