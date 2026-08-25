# PopIntent privacy notice

Effective for validation build 0.1.0.

PopIntent performs detection locally inside the browser. It has no backend, account system, analytics, crash reporter, advertising SDK, remote configuration, or telemetry endpoint. The extension does not sell, transmit, or share browsing data.

## Data stored on the device

| Data | Storage and lifetime | Purpose |
| --- | --- | --- |
| Global enabled state and per-domain mode | `chrome.storage.local`, until changed or the extension data is removed | Apply Default, Strict, or Paused behavior. |
| Block events: random event ID, timestamp, source domain, target domain, reason, action, and user verdict | `chrome.storage.local`, at most seven days and 500 events | Show local history and measure false positives. Full paths, query strings, page titles, and page contents are not stored. |
| Aggregate counters | `chrome.storage.local`, until extension data is removed | Produce a user-initiated validation summary. Counters contain no domains or URLs. |
| Recent gesture correlation | `chrome.storage.session`, consumed after navigation or discarded with the browser session | Match a popup to the user action that preceded it. |
| Full blocked destination and source tab ID | `chrome.storage.session`, at most 60 seconds | Implement **Open anyway**. It is never included in persistent history or exports. |

The exported validation JSON contains version/browser metadata, date range, and aggregate counts only. Export happens only when the user presses **Export aggregate JSON**; the browser saves the file locally.

## Incognito

Chrome and Edge require the user to opt in before an extension can run in private browsing. PopIntent does not persist incognito block events or increment persistent validation counters for incognito activity. Temporary gesture and undo records may exist in session memory only long enough to make the current interaction work.

## Network behavior

PopIntent does not make application-initiated network requests. Its content script observes page interactions locally. A user choosing **Open anyway** instructs the browser to navigate to the previously blocked HTTP(S) destination; that navigation is a user action, not telemetry.

## User controls

- Turn protection off globally.
- Pause or use Strict mode for one domain.
- Mark a block incorrect.
- Clear the seven-day event history from Settings.
- Remove all settings and aggregate counters by clearing the extension's site data or uninstalling the extension.

This notice must be revised before adding any server, remote rules, telemetry, store analytics integration, or new permission.
