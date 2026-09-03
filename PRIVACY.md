# PopIntent privacy notice

Effective for PopIntent Beta 0.1.1, including sideloaded builds, the unlisted Chrome distribution, and the Microsoft Edge Add-ons distribution.

PopIntent performs detection locally inside the browser. It has no backend, account system, analytics, crash reporter, advertising SDK, remote configuration, or telemetry endpoint. The extension does not sell, transmit, or share browsing data.

PopIntent's use of information received from browser extension APIs is limited to providing its user-facing navigation protection features. It complies with applicable browser-store user-data policies, including the Chrome Web Store Limited Use requirements and Microsoft Edge Add-ons developer policies. No developer, employee, contractor, or other human receives or reads the locally processed browsing information.

## Data stored on the device

| Data | Storage and lifetime | Purpose |
| --- | --- | --- |
| Global protection mode | `chrome.storage.local`, until changed or the extension data is removed | Apply Default, Strict, or Paused behavior to all sites. |
| Block events: random event ID, timestamp, source domain, target domain, reason, action, and user verdict | `chrome.storage.local`, at most seven days and 500 events | Show local history and measure false positives. Full paths, query strings, page titles, and page contents are not stored. |
| Aggregate counters | `chrome.storage.local`, until extension data is removed | Produce a user-initiated validation summary. Counters contain no domains or URLs. |
| Recent gesture correlation | `chrome.storage.session`, consumed after navigation or discarded with the browser session | Match a popup to the user action that preceded it. |
| Short same-tab guard state: source/expected HTTP(S) URL, source origin, tab ID, timing, and a tab-scoped DNR rule containing only the expected initiator domain | `chrome.storage.session` and in-memory DNR session rules, normally 3 seconds after the expected commit and no more than 10 seconds while waiting for it | In Strict mode, stop a high-confidence no-gesture third-party main-frame redirect after the intended page loads. The state and rule are removed on expiry, a new trusted gesture, mode change, or tab closure. |
| Full blocked destination and source tab ID | `chrome.storage.session`, at most 60 seconds | Implement **Open anyway**. It is never included in persistent history or exports. |

The exported validation JSON contains version/browser metadata, date range, and aggregate counts only. Export happens only when the user presses **Export aggregate JSON**; the browser saves the file locally.

## Incognito

Chrome and Edge require the user to opt in before an extension can run in private browsing. PopIntent does not persist incognito block events or increment persistent validation counters for incognito activity. The background worker accepts private-browsing status only from browser-owned tab metadata; if that metadata is unavailable, persistent writes are disabled. Temporary gesture and undo records may exist in session memory only long enough to make the current interaction work.

## Network behavior

PopIntent does not make application-initiated network requests. Its content script observes page interactions locally. A user choosing **Open anyway** instructs the browser to navigate to the previously blocked HTTP(S) destination; that navigation is a user action, not telemetry.

## User controls

- Choose global Default, Strict, or Paused mode.
- Mark a block incorrect.
- Clear the seven-day event history from Settings.
- Remove all settings and aggregate counters by clearing the extension's site data or uninstalling the extension.

This notice must be revised before adding any server, remote rules, telemetry, store analytics integration, or new permission.
