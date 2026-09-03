# PopIntent diagnostic build

The diagnostic build is a temporary local-only variant used to capture missed popup navigation mechanisms. It is not a release candidate and must not be distributed or submitted to an extension store.

## Privacy boundary

The trace stores at most 500 events for 24 hours in `chrome.storage.local`. Navigation tracing is scoped to the tab where a user gesture occurred and related child tabs for 30 seconds; unrelated tabs are ignored. It records only:

- source and target domains;
- transient browser tab, opener, and frame identifiers;
- pointer or keyboard gesture classification;
- navigation lifecycle and transition types;
- configured and effective PopIntent mode;
- classifier decisions and gesture timing.

It does not store full URLs, URL paths, query strings, page text, click coordinates, form data, cookies, request headers, or private browsing activity. PopIntent does not upload the trace or make application-initiated network requests.

The exported JSON is still browsing telemetry because it contains domains and event timing. Review it before sharing it.

## Build

From the repository root:

```powershell
pnpm check
pnpm package:diagnostic
```

The artifact is written to `release/popintent-0.1.1-diagnostic.zip`. Its manifest name is **PopIntent Diagnostic**, and its unpacked build directory is `dist-diagnostic`.

## Capture a missed redirect

1. Extract the diagnostic ZIP to a new directory. Do not overwrite the signed-off PopIntent store-build directory.
2. Disable the normal PopIntent extension so the two builds do not process the same navigation.
3. Open `chrome://extensions`, enable Developer mode, and load the extracted diagnostic directory.
4. Open **PopIntent Diagnostic settings** and select **Clear diagnostic trace**.
5. Set the global mode to the one that exhibited the problem, normally Strict for the current investigation.
6. Reproduce one missed redirect. Stop after the unexpected destination opens; do not enter information on the destination page.
7. Immediately open **PopIntent Diagnostic settings** and select **Export diagnostic trace**.
8. Disable the diagnostic extension and re-enable the normal PopIntent extension.

Keep the exported JSON local. Provide its filesystem path for local analysis, or inspect it before attaching it to a conversation.
