# Sideload PopIntent in Chrome and Edge

Use the unpacked `dist` directory for development. If you received `popintent-0.1.0.zip`, extract it first and select the extracted directory that directly contains `manifest.json`.

## Build

From the repository root:

```powershell
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

## Google Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the repository's `dist` directory.
5. Pin PopIntent from the Extensions menu if you want quick access to Default, Strict, and Paused modes.

Official reference: [Chrome — load an unpacked extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).

## Microsoft Edge

1. Open `edge://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the same `dist` directory used for Chrome.

Official reference: [Microsoft Edge — sideload an extension](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/getting-started/extension-sideloading).

## Optional incognito/private access

Open the extension's **Details** page and explicitly enable access in Incognito/InPrivate if you want it. PopIntent does not persist private block events or private validation counters. Browser policy may disable this option on managed devices.

## Manual compatibility checklist

Run this checklist in the current stable Chrome and Edge before giving the ZIP to testers:

- The extension loads with no manifest or service-worker error.
- The popup shows the active HTTP(S) domain and changes the global Default/Strict/Paused mode.
- `tests/fixtures/server.mjs` plus `http://127.0.0.1:4173/intentional` opens the legitimate tab.
- `/target-mismatch` closes the unexpected tab and shows **Open anyway**.
- `/overlay` and `/iframe-overlay` do not open the ad tab and show a notice.
- In global Strict mode, `/same-tab-guard-source` → `#abuse` → `#continue` returns to the intended page after blocking the delayed third-party same-tab redirect and offers **Open anyway**.
- The same fixture still allows `#continue-user` followed by its visible external link, allows the first-party automatic fixture, and permits the delayed redirect when there was no preceding abuse signal.
- Global Paused mode allows `/target-mismatch`.
- Settings shows domain-only events, can mark an event incorrect, exports aggregate JSON, and clears history.
- Browser restart preserves settings/history but removes expired session undo data.
- With Incognito/InPrivate access enabled, a private block does not appear in normal Settings afterward.

Automated end-to-end tests use Playwright's bundled Chromium. Branded Chrome/Edge validation is manual because their current command-line extension side-loading behavior is not a stable automation interface.
