import {
  appendDiagnosticEvent,
  appendEvent,
  clearDiagnosticTrace,
  clearHistory,
  exportDiagnosticTrace,
  exportSummary,
  getCounters,
  getHistory,
  getSettings,
  incrementCounter,
  markEvent,
  saveSettings
} from "./storage";
import {
  clearAllSameTabGuards,
  dispatchSameTabGuard,
  recoverSameTabGuards,
  type SameTabBlockedNavigation
} from "./same-tab-guard-controller";
import type { DiagnosticEvent } from "../core/diagnostic-trace";
import { type BlockEvent } from "../core/event-history";
import { isKnownRedirector } from "../core/known-redirectors";
import {
  GESTURE_TTL_MS,
  classifyNavigation,
  type GestureSnapshot,
  type SiteMode
} from "../core/navigation-classifier";
import { isHighConfidenceAbuse } from "../core/same-tab-guard";
import { domainFromUrl, isSafeHttpUrl } from "../core/url-policy";
import type { GestureRecord, RuntimeMessage, Settings, UiState, UndoRecord } from "../shared/contracts";

const RULESET_ID = "known_redirectors";
const GESTURE_PREFIX = "gesture:";
const PENDING_PREFIX = "pending:";
const UNDO_PREFIX = "undo:";
const DIAGNOSTIC_WATCH_PREFIX = "diagnostic-watch:";
const PENDING_TTL_MS = 5_000;
const UNDO_TTL_MS = 60_000;
const DIAGNOSTIC_WATCH_TTL_MS = 30_000;
const DIAGNOSTIC_WORKER_ID = __POPINTENT_DIAGNOSTIC__ ? crypto.randomUUID() : "";

type DiagnosticEventDraft = Omit<DiagnosticEvent, "id" | "workerId">;

interface CreatedNavigationDetails {
  sourceFrameId: number;
  sourceTabId: number;
  tabId: number;
  timeStamp: number;
  url: string;
}

interface PendingNavigation {
  sourceFrameId: number;
  sourceTabId: number;
  childTabId: number;
  sourceUrl: string;
  gesture: GestureRecord;
  siteMode: SiteMode;
  incognito: boolean;
  expiresAt: number;
}

interface FramedNavigationDetails {
  frameId: number;
  parentFrameId: number;
  tabId: number;
  timeStamp: number;
  url: string;
}

interface CommittedNavigationDetails extends FramedNavigationDetails {
  transitionQualifiers: string[];
  transitionType: string;
}

interface TabUrlChangeInfo {
  url?: string;
}

void recoverSameTabGuards();

chrome.runtime.onInstalled.addListener(() => {
  void initializeExtension();
});

chrome.runtime.onStartup.addListener(() => {
  void Promise.all([syncDnrState(), recoverSameTabGuards()]);
});

chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
  void handleCreatedNavigation(details);
});

chrome.webNavigation.onCommitted.addListener((details) => {
  DIAGNOSTIC: if (__POPINTENT_DIAGNOSTIC__) void recordCommittedDiagnostic(details);
  if (details.frameId === 0) {
    void handleCommittedNavigation(details.tabId, details.url, details.timeStamp);
    void dispatchSameTabGuard(details.tabId, {
      type: "navigation_committed",
      occurredAt: details.timeStamp,
      url: details.url
    });
  }
});

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0) {
    void dispatchSameTabGuard(details.tabId, {
      type: "navigation_started",
      occurredAt: details.timeStamp,
      url: details.url
    });
  }
  DIAGNOSTIC: if (__POPINTENT_DIAGNOSTIC__) void recordBeforeNavigateDiagnostic(details);
});

chrome.webNavigation.onErrorOccurred.addListener((details) => {
  if (details.frameId !== 0 || details.error !== "net::ERR_BLOCKED_BY_CLIENT") return;
  void handleSameTabNavigationBlocked(details.tabId, details.url, details.timeStamp);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void dispatchSameTabGuard(tabId, { type: "mode_changed", mode: "paused" });
});

DIAGNOSTIC: if (__POPINTENT_DIAGNOSTIC__) {
  chrome.tabs.onCreated.addListener((tab) => {
    void recordTabCreatedDiagnostic(tab);
  });
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url !== undefined) void recordTabUrlChangedDiagnostic(tabId, changeInfo, tab);
  });
}

chrome.runtime.onMessage.addListener((rawMessage: unknown, sender, sendResponse) => {
  void handleMessage(rawMessage as RuntimeMessage, sender)
    .then(sendResponse)
    .catch((error: unknown) => sendResponse({ ok: false, error: String(error) }));
  return true;
});

async function initializeExtension(): Promise<void> {
  const settings = await getSettings();
  await saveSettings(settings);
  await chrome.action.setBadgeBackgroundColor({ color: "#B42318" });
  if (settings.mode !== "strict") await clearAllSameTabGuards();
  await syncDnrState(settings);
}

function gestureKey(tabId: number, frameId: number): string {
  return `${GESTURE_PREFIX}${tabId}:${frameId}`;
}

function pendingKey(tabId: number): string {
  return `${PENDING_PREFIX}${tabId}`;
}

function undoKey(eventId: string): string {
  return `${UNDO_PREFIX}${eventId}`;
}

function diagnosticWatchKey(tabId: number): string {
  return `${DIAGNOSTIC_WATCH_PREFIX}${tabId}`;
}

async function delay(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function recordDiagnostic(event: DiagnosticEventDraft, incognito: boolean): Promise<void> {
  if (!__POPINTENT_DIAGNOSTIC__ || incognito) return;
  await appendDiagnosticEvent(
    {
      id: crypto.randomUUID(),
      workerId: DIAGNOSTIC_WORKER_ID,
      ...event
    },
    false
  );
}

async function watchDiagnosticTab(tabId: number, now = Date.now()): Promise<void> {
  if (!__POPINTENT_DIAGNOSTIC__) return;
  await chrome.storage.session.set({
    [diagnosticWatchKey(tabId)]: now + DIAGNOSTIC_WATCH_TTL_MS
  });
}

async function isDiagnosticTabWatched(tabId: number, now = Date.now()): Promise<boolean> {
  if (!__POPINTENT_DIAGNOSTIC__) return false;
  const key = diagnosticWatchKey(tabId);
  const result = await chrome.storage.session.get(key);
  const expiresAt = result[key] as number | undefined;
  if (expiresAt === undefined) return false;
  if (expiresAt < now) {
    await chrome.storage.session.remove(key);
    return false;
  }
  return true;
}

async function clearDiagnosticWatches(): Promise<void> {
  if (!__POPINTENT_DIAGNOSTIC__) return;
  const stored = await chrome.storage.session.get(null);
  const keys = Object.keys(stored).filter((key) => key.startsWith(DIAGNOSTIC_WATCH_PREFIX));
  if (keys.length > 0) await chrome.storage.session.remove(keys);
}

function diagnosticDomain(url: string | undefined): string | undefined {
  if (url === undefined) return undefined;
  return domainFromUrl(url) ?? undefined;
}

async function diagnosticSiteState(): Promise<{
  globalEnabled: boolean;
  configuredSiteMode: SiteMode;
  effectiveSiteMode: SiteMode;
}> {
  const state = await getGlobalState();
  return {
    globalEnabled: state.mode !== "paused",
    configuredSiteMode: state.mode,
    effectiveSiteMode: state.mode
  };
}

async function recordBeforeNavigateDiagnostic(details: FramedNavigationDetails): Promise<void> {
  if (!(await isDiagnosticTabWatched(details.tabId, details.timeStamp))) return;
  const tab = await safeGetTab(details.tabId);
  if (tab === null || tab.incognito) return;
  const state = await diagnosticSiteState();
  await recordDiagnostic(
    {
      occurredAt: details.timeStamp,
      kind: "navigation_before",
      tabId: details.tabId,
      frameId: details.frameId,
      parentFrameId: details.parentFrameId,
      sourceDomain: diagnosticDomain(tab?.url),
      targetDomain: diagnosticDomain(details.url),
      ...state
    },
    false
  );
}

async function recordCommittedDiagnostic(details: CommittedNavigationDetails): Promise<void> {
  if (!(await isDiagnosticTabWatched(details.tabId, details.timeStamp))) return;
  const tab = await safeGetTab(details.tabId);
  if (tab === null || tab.incognito) return;
  const state = await diagnosticSiteState();
  await recordDiagnostic(
    {
      occurredAt: details.timeStamp,
      kind: "navigation_committed",
      tabId: details.tabId,
      frameId: details.frameId,
      parentFrameId: details.parentFrameId,
      sourceDomain: diagnosticDomain(tab?.url),
      targetDomain: diagnosticDomain(details.url),
      transitionType: details.transitionType,
      transitionQualifiers: details.transitionQualifiers.map(String),
      ...state
    },
    false
  );
}

async function recordTabCreatedDiagnostic(tab: chrome.tabs.Tab): Promise<void> {
  if (tab.id === undefined || tab.incognito || tab.openerTabId === undefined) return;
  if (!(await isDiagnosticTabWatched(tab.openerTabId))) return;
  await watchDiagnosticTab(tab.id);
  const sourceTab = await safeGetTab(tab.openerTabId);
  const sourceUrl = sourceTab?.url ?? "";
  const state = await diagnosticSiteState();
  await recordDiagnostic(
    {
      occurredAt: Date.now(),
      kind: "tab_created",
      tabId: tab.id,
      openerTabId: tab.openerTabId,
      sourceDomain: diagnosticDomain(sourceTab?.url),
      targetDomain: diagnosticDomain(tab.pendingUrl ?? tab.url),
      tabStatus: tab.status,
      ...state
    },
    false
  );
}

async function recordTabUrlChangedDiagnostic(
  tabId: number,
  changeInfo: TabUrlChangeInfo,
  tab: chrome.tabs.Tab
): Promise<void> {
  if (tab.incognito || changeInfo.url === undefined) return;
  const watched =
    (await isDiagnosticTabWatched(tabId)) ||
    (tab.openerTabId !== undefined && (await isDiagnosticTabWatched(tab.openerTabId)));
  if (!watched) return;
  await watchDiagnosticTab(tabId);
  const sourceTab = tab.openerTabId === undefined ? null : await safeGetTab(tab.openerTabId);
  const state = await diagnosticSiteState();
  await recordDiagnostic(
    {
      occurredAt: Date.now(),
      kind: "tab_url_changed",
      tabId,
      openerTabId: tab.openerTabId,
      sourceDomain: diagnosticDomain(sourceTab?.url),
      targetDomain: diagnosticDomain(changeInfo.url),
      tabStatus: tab.status,
      ...state
    },
    false
  );
}

async function getGesture(tabId: number, frameId: number): Promise<GestureRecord | null> {
  const key = gestureKey(tabId, frameId);
  const result = await chrome.storage.session.get(key);
  await chrome.storage.session.remove(key);
  return (result[key] as GestureRecord | undefined) ?? null;
}

async function peekGesture(tabId: number, frameId: number): Promise<GestureRecord | null> {
  const key = gestureKey(tabId, frameId);
  const result = await chrome.storage.session.get(key);
  return (result[key] as GestureRecord | undefined) ?? null;
}

async function handleCreatedNavigation(details: CreatedNavigationDetails): Promise<void> {
  await delay(75);
  const gesture = await getGesture(details.sourceTabId, details.sourceFrameId);
  const sourceUrl = gesture?.sourceUrl ?? (await safeTabUrl(details.sourceTabId)) ?? "";
  const sourceTab = await safeGetTab(details.sourceTabId);
  const incognito = gesture?.incognito ?? sourceTab?.incognito ?? false;
  const siteState = await diagnosticSiteState();
  const siteMode = siteState.effectiveSiteMode;

  DIAGNOSTIC: {
    const diagnosticWatched =
      __POPINTENT_DIAGNOSTIC__ &&
      !incognito &&
      (gesture !== null || (await isDiagnosticTabWatched(details.sourceTabId, details.timeStamp)));
    if (diagnosticWatched) {
      await Promise.all([
        watchDiagnosticTab(details.sourceTabId, details.timeStamp),
        watchDiagnosticTab(details.tabId, details.timeStamp)
      ]);
      await recordDiagnostic(
        {
          occurredAt: details.timeStamp,
          kind: "navigation_target_created",
          tabId: details.tabId,
          sourceTabId: details.sourceTabId,
          frameId: details.sourceFrameId,
          sourceDomain: diagnosticDomain(sourceUrl),
          targetDomain: diagnosticDomain(details.url),
          gestureAgeMs:
            gesture === null
              ? undefined
              : Math.max(0, Math.round(details.timeStamp - gesture.occurredAt)),
          explicitDestination:
            gesture?.explicitDestination !== null && gesture?.explicitDestination !== undefined,
          explicitNewTabIntent: gesture?.explicitNewTabIntent,
          semanticControl: gesture?.semanticControl,
          overlayHijack: gesture?.overlayHijack,
          ...siteState
        },
        incognito
      );
    }
  }

  if (details.url === "about:blank" && gesture !== null && !gesture.overlayHijack) {
    if (siteMode === "strict" && gesture.explicitDestination === null) {
      await applyDecision(details, sourceUrl, incognito, gesture, siteMode, details.url);
      return;
    }

    const pending: PendingNavigation = {
      sourceFrameId: details.sourceFrameId,
      sourceTabId: details.sourceTabId,
      childTabId: details.tabId,
      sourceUrl,
      gesture,
      siteMode,
      incognito,
      expiresAt: Date.now() + PENDING_TTL_MS
    };
    await chrome.storage.session.set({ [pendingKey(details.tabId)]: pending });
    return;
  }

  await applyDecision(details, sourceUrl, incognito, gesture, siteMode, details.url);
}

async function handleCommittedNavigation(tabId: number, url: string, timeStamp: number): Promise<void> {
  if (!isSafeHttpUrl(url)) return;
  const key = pendingKey(tabId);
  const result = await chrome.storage.session.get(key);
  const pending = result[key] as PendingNavigation | undefined;
  if (pending === undefined) return;
  await chrome.storage.session.remove(key);
  if (pending.expiresAt < Date.now()) return;

  await applyDecision(
    {
      sourceFrameId: pending.sourceFrameId,
      sourceTabId: pending.sourceTabId,
      tabId: pending.childTabId,
      timeStamp,
      url
    },
    pending.sourceUrl,
    pending.incognito,
    pending.gesture,
    pending.siteMode,
    url
  );
}

async function applyDecision(
  details: CreatedNavigationDetails,
  sourceUrl: string,
  incognito: boolean,
  gesture: GestureSnapshot | null,
  siteMode: SiteMode,
  targetUrl: string
): Promise<void> {
  const decision = classifyNavigation({
    siteMode,
    sourceUrl,
    targetUrl,
    navigationOccurredAt: details.timeStamp,
    gesture,
    knownRedirector: isKnownRedirector(targetUrl)
  });

  DIAGNOSTIC: if (
    __POPINTENT_DIAGNOSTIC__ &&
    (await isDiagnosticTabWatched(details.sourceTabId, details.timeStamp))
  ) {
    await recordDiagnostic(
      {
        occurredAt: details.timeStamp,
        kind: "classifier_decision",
        tabId: details.tabId,
        sourceTabId: details.sourceTabId,
        frameId: details.sourceFrameId,
        sourceDomain: diagnosticDomain(sourceUrl),
        targetDomain: diagnosticDomain(targetUrl),
        effectiveSiteMode: siteMode,
        gestureAgeMs:
          gesture === null
            ? undefined
            : Math.max(0, Math.round(details.timeStamp - gesture.occurredAt)),
        classifierAction: decision.action,
        classifierReason: decision.action === "close_tab" ? decision.reason : undefined
      },
      incognito
    );
  }

  if (decision.action === "allow") {
    if (!incognito && gesture !== null) await incrementCounter("intentionalNewTabs");
    return;
  }

  await safeRemoveTab(details.tabId);
  const event = createBlockEvent(sourceUrl, targetUrl, decision.reason, "closed_tab", incognito);
  await appendEvent(event);
  if (!incognito) await incrementCounter("blockedNavigations");
  if (isHighConfidenceAbuse(decision.reason, gesture)) {
    await dispatchSameTabGuard(details.sourceTabId, {
      type: "abuse_blocked",
      occurredAt: details.timeStamp,
      sourceUrl
    });
  }

  const undoAvailable = isSafeHttpUrl(targetUrl);
  if (undoAvailable) {
    const undo: UndoRecord = {
      eventId: event.id,
      sourceTabId: details.sourceTabId,
      targetUrl,
      expiresAt: Date.now() + UNDO_TTL_MS,
      incognito
    };
    await chrome.storage.session.set({ [undoKey(event.id)]: undo });
  }

  await chrome.action.setBadgeText({ tabId: details.sourceTabId, text: "1" }).catch(() => undefined);
  await chrome.tabs
    .sendMessage(details.sourceTabId, { type: "show_blocked", event, undoAvailable } satisfies RuntimeMessage, {
      frameId: 0
    })
    .catch(() => undefined);
}

async function handleSameTabNavigationBlocked(
  tabId: number,
  targetUrl: string,
  occurredAt: number
): Promise<void> {
  await delay(100);
  const gesture = await peekGesture(tabId, 0);
  if (
    gesture !== null &&
    occurredAt - gesture.occurredAt >= 0 &&
    occurredAt - gesture.occurredAt <= GESTURE_TTL_MS &&
    gesture.explicitDestination !== null &&
    navigationTargetsMatch(gesture.explicitDestination, targetUrl)
  ) {
    await dispatchSameTabGuard(tabId, { type: "mode_changed", mode: "paused" });
    await chrome.tabs.update(tabId, { url: targetUrl }).catch(() => undefined);
    return;
  }

  const blocked = await dispatchSameTabGuard(tabId, {
    type: "navigation_blocked",
    occurredAt,
    url: targetUrl
  });
  if (blocked === null) return;
  await recordSameTabBlock(tabId, blocked, occurredAt);
}

async function recordSameTabBlock(
  tabId: number,
  blocked: SameTabBlockedNavigation,
  occurredAt: number
): Promise<void> {
  const tab = await safeGetTab(tabId);
  if (tab === null) return;
  const incognito = tab.incognito;
  await chrome.tabs.goBack(tabId).catch(() => undefined);
  await waitForTabUrl(tabId, blocked.sourceUrl, 1_500);
  const event = createBlockEvent(
    blocked.sourceUrl,
    blocked.targetUrl,
    "same_tab_redirect",
    "prevented_navigation",
    incognito
  );
  await appendEvent(event);
  if (!incognito) await incrementCounter("blockedNavigations");

  const undoAvailable = isSafeHttpUrl(blocked.targetUrl);
  if (undoAvailable) {
    const undo: UndoRecord = {
      eventId: event.id,
      sourceTabId: tabId,
      targetUrl: blocked.targetUrl,
      expiresAt: Date.now() + UNDO_TTL_MS,
      incognito,
      disposition: "same_tab"
    };
    await chrome.storage.session.set({ [undoKey(event.id)]: undo });
  }

  DIAGNOSTIC: if (__POPINTENT_DIAGNOSTIC__) {
    await recordDiagnostic(
      {
        occurredAt,
        kind: "same_tab_redirect_blocked",
        tabId,
        frameId: 0,
        sourceDomain: diagnosticDomain(blocked.sourceUrl),
        targetDomain: diagnosticDomain(blocked.targetUrl),
        effectiveSiteMode: "strict",
        classifierAction: "block_navigation",
        classifierReason: "same_tab_redirect"
      },
      incognito
    );
  }

  await chrome.action.setBadgeText({ tabId, text: "1" }).catch(() => undefined);
  await chrome.tabs
    .sendMessage(tabId, { type: "show_blocked", event, undoAvailable } satisfies RuntimeMessage, {
      frameId: 0
    })
    .catch(() => undefined);
}

function navigationTargetsMatch(expected: string, actual: string): boolean {
  try {
    const expectedUrl = new URL(expected);
    const actualUrl = new URL(actual);
    expectedUrl.hash = "";
    actualUrl.hash = "";
    return expectedUrl.href === actualUrl.href;
  } catch {
    return false;
  }
}

async function waitForTabUrl(tabId: number, expectedUrl: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const current = await safeTabUrl(tabId);
    if (current !== null && navigationTargetsMatch(current, expectedUrl)) return;
    await delay(50);
  }
}

function createBlockEvent(
  sourceUrl: string,
  targetUrl: string,
  reason: BlockEvent["reason"],
  action: BlockEvent["action"],
  incognito: boolean
): BlockEvent {
  return {
    id: crypto.randomUUID(),
    occurredAt: Date.now(),
    sourceDomain: domainFromUrl(sourceUrl) ?? "unknown",
    targetDomain: domainFromUrl(targetUrl) ?? "unknown",
    reason,
    action,
    verdict: "unrated",
    incognito
  };
}

async function handleMessage(message: RuntimeMessage, sender: chrome.runtime.MessageSender): Promise<unknown> {
  DIAGNOSTIC: if (__POPINTENT_DIAGNOSTIC__) {
    if (message.type === "clear_diagnostic_trace") {
      await clearDiagnosticTrace();
      await clearDiagnosticWatches();
      return { ok: true };
    }
    if (message.type === "export_diagnostic_trace") {
      return exportDiagnosticTrace(message.browser);
    }
  }

  switch (message.type) {
    case "record_gesture": {
      if (sender.tab?.id === undefined) return { ok: false };
      const frameId = sender.frameId ?? 0;
      const globalState = await getGlobalState();
      await dispatchSameTabGuard(sender.tab.id, {
        type: "gesture",
        occurredAt: message.gesture.occurredAt,
        sourceUrl: message.gesture.sourceUrl,
        targetUrl: message.gesture.explicitDestination,
        explicitNewTabIntent: message.gesture.explicitNewTabIntent,
        semanticControl: message.gesture.semanticControl,
        topFrame: frameId === 0,
        mode: globalState.mode
      });
      await chrome.storage.session.set({
        [gestureKey(sender.tab.id, frameId)]: message.gesture
      });
      DIAGNOSTIC: if (__POPINTENT_DIAGNOSTIC__) {
        if (!message.gesture.incognito) await watchDiagnosticTab(sender.tab.id);
        const state = await diagnosticSiteState();
        await recordDiagnostic(
          {
            occurredAt: message.gesture.occurredAt,
            kind: "gesture",
            tabId: sender.tab.id,
            frameId,
            sourceDomain: diagnosticDomain(message.gesture.sourceUrl),
            targetDomain: diagnosticDomain(message.gesture.explicitDestination ?? undefined),
            inputType: message.gesture.diagnostic?.inputType,
            targetKind: message.gesture.diagnostic?.targetKind,
            topFrame: message.gesture.diagnostic?.topFrame,
            pointerButton: message.gesture.diagnostic?.pointerButton,
            explicitDestination: message.gesture.explicitDestination !== null,
            explicitNewTabIntent: message.gesture.explicitNewTabIntent,
            semanticControl: message.gesture.semanticControl,
            overlayHijack: message.gesture.overlayHijack,
            ...state
          },
          message.gesture.incognito
        );
      }
      return { ok: true };
    }
    case "overlay_prevented": {
      const incognito = sender.tab?.incognito ?? false;
      const event = createBlockEvent(
        message.sourceUrl,
        message.targetUrl ?? "",
        "overlay_hijack",
        "prevented_click",
        incognito
      );
      DIAGNOSTIC: if (__POPINTENT_DIAGNOSTIC__) {
        if (!incognito && sender.tab?.id !== undefined) await watchDiagnosticTab(sender.tab.id);
        const state = await diagnosticSiteState();
        await recordDiagnostic(
          {
            occurredAt: Date.now(),
            kind: "overlay_prevented",
            tabId: sender.tab?.id,
            frameId: sender.frameId ?? 0,
            sourceDomain: diagnosticDomain(message.sourceUrl),
            targetDomain: diagnosticDomain(message.targetUrl ?? undefined),
            overlayHijack: true,
            ...state
          },
          incognito
        );
      }
      await appendEvent(event);
      if (!incognito) {
        await incrementCounter("blockedNavigations");
        await incrementCounter("overlayPrevented");
      }
      if (sender.tab?.id !== undefined) {
        await dispatchSameTabGuard(sender.tab.id, {
          type: "abuse_blocked",
          occurredAt: event.occurredAt,
          sourceUrl: message.sourceUrl
        });
        await chrome.action.setBadgeText({ tabId: sender.tab.id, text: "1" }).catch(() => undefined);
        await chrome.tabs
          .sendMessage(
            sender.tab.id,
            { type: "show_blocked", event, undoAvailable: false } satisfies RuntimeMessage,
            { frameId: 0 }
          )
          .catch(() => undefined);
      }
      return { ok: true, event };
    }
    case "get_global_state":
      return getGlobalState();
    case "get_ui_state":
      return getUiState(message.sourceUrl);
    case "get_options_state":
      return { settings: await getSettings(), events: await getHistory(), counters: await getCounters() };
    case "set_global_mode": {
      const settings = await getSettings();
      settings.mode = message.mode;
      await saveSettings(settings);
      if (message.mode !== "strict") await clearAllSameTabGuards();
      await syncDnrState(settings);
      await broadcastModeChange();
      return { ok: true };
    }
    case "open_once":
      return openOnce(message.eventId);
    case "mark_event":
      await markEvent(message.eventId, message.verdict);
      return { ok: true };
    case "report_missed":
      if (!(sender.tab?.incognito ?? false)) await incrementCounter("missedRedirects");
      return { ok: true };
    case "clear_history":
      await clearHistory();
      return { ok: true };
    case "export_summary":
      return exportSummary(message.browser);
    case "show_blocked":
    case "global_mode_changed":
      return { ok: false };
    default:
      return { ok: false };
  }
}

async function getGlobalState(): Promise<{ mode: SiteMode }> {
  const settings = await getSettings();
  return { mode: settings.mode };
}

async function getUiState(sourceUrl: string): Promise<UiState> {
  const settings = await getSettings();
  const domain = domainFromUrl(sourceUrl);
  const events = await getHistory();
  const lastEvent = domain === null ? null : events.find((event) => event.sourceDomain === domain) ?? null;
  const undo = lastEvent === null ? null : await getUndo(lastEvent.id);
  return {
    domain,
    mode: settings.mode,
    lastEvent,
    undoAvailable: undo !== null
  };
}

async function getUndo(eventId: string): Promise<UndoRecord | null> {
  const key = undoKey(eventId);
  const result = await chrome.storage.session.get(key);
  const undo = result[key] as UndoRecord | undefined;
  if (undo === undefined) return null;
  if (undo.expiresAt < Date.now()) {
    await chrome.storage.session.remove(key);
    return null;
  }
  return undo;
}

async function openOnce(eventId: string): Promise<{ ok: boolean }> {
  const undo = await getUndo(eventId);
  if (undo === null || !isSafeHttpUrl(undo.targetUrl)) return { ok: false };
  await chrome.storage.session.remove(undoKey(eventId));

  const targetIsKnown = isKnownRedirector(undo.targetUrl);
  if (undo.disposition === "same_tab") {
    const opened = await navigateTabOnce(undo.sourceTabId, undo.targetUrl, targetIsKnown);
    if (!opened) return { ok: false };
    if (!undo.incognito) await incrementCounter("openedAnyway");
    return { ok: true };
  }
  if (!targetIsKnown) {
    await chrome.tabs.create({ active: true, openerTabId: undo.sourceTabId, url: undo.targetUrl }).catch(() =>
      chrome.tabs.create({ active: true, url: undo.targetUrl })
    );
  } else {
    const tab = await chrome.tabs.create({ active: true, url: "about:blank" });
    if (tab.id === undefined) return { ok: false };
    const hostname = domainFromUrl(undo.targetUrl);
    if (hostname === null) return { ok: false };
    const ruleId = 1_000_000 + tab.id;
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [ruleId],
      addRules: [
        {
          id: ruleId,
          priority: 100_000,
          action: { type: chrome.declarativeNetRequest.RuleActionType.ALLOW },
          condition: {
            tabIds: [tab.id],
            requestDomains: [hostname],
            resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME]
          }
        }
      ]
    });
    await chrome.tabs.update(tab.id, { url: undo.targetUrl });
    setTimeout(() => {
      void chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [ruleId] });
    }, 10_000);
  }

  if (!undo.incognito) await incrementCounter("openedAnyway");
  return { ok: true };
}

async function navigateTabOnce(
  tabId: number,
  targetUrl: string,
  targetIsKnown: boolean
): Promise<boolean> {
  if (!targetIsKnown) {
    return chrome.tabs
      .update(tabId, { url: targetUrl })
      .then(() => true)
      .catch(() => false);
  }

  const hostname = domainFromUrl(targetUrl);
  if (hostname === null) return false;
  const ruleId = 1_000_000 + tabId;
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [ruleId],
    addRules: [
      {
        id: ruleId,
        priority: 100_000,
        action: { type: chrome.declarativeNetRequest.RuleActionType.ALLOW },
        condition: {
          tabIds: [tabId],
          requestDomains: [hostname],
          resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME]
        }
      }
    ]
  });
  const updated = await chrome.tabs
    .update(tabId, { url: targetUrl })
    .then(() => true)
    .catch(() => false);
  setTimeout(() => {
    void chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [ruleId] });
  }, 10_000);
  return updated;
}

async function syncDnrState(existingSettings?: Settings): Promise<void> {
  const settings = existingSettings ?? (await getSettings());
  await chrome.declarativeNetRequest.updateEnabledRulesets(
    settings.mode !== "paused"
      ? { enableRulesetIds: [RULESET_ID] }
      : { disableRulesetIds: [RULESET_ID] }
  );

  const current = await chrome.declarativeNetRequest.getDynamicRules();
  const managedIds = current.filter((rule) => rule.id >= 100_000 && rule.id < 200_000).map((rule) => rule.id);
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: managedIds, addRules: [] });
}

async function broadcastModeChange(): Promise<void> {
  const state = await getGlobalState();
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id === undefined) return;
      await chrome.tabs
        .sendMessage(tab.id, { type: "global_mode_changed", ...state } satisfies RuntimeMessage)
        .catch(() => undefined);
    })
  );
}

async function safeGetTab(tabId: number): Promise<chrome.tabs.Tab | null> {
  try {
    return await chrome.tabs.get(tabId);
  } catch {
    return null;
  }
}

async function safeTabUrl(tabId: number): Promise<string | null> {
  return (await safeGetTab(tabId))?.url ?? null;
}

async function safeRemoveTab(tabId: number): Promise<void> {
  await chrome.tabs.remove(tabId).catch(() => undefined);
}
