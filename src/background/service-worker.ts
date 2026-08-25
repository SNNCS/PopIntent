import { appendEvent, clearHistory, exportSummary, getCounters, getHistory, getSettings, incrementCounter, markEvent, saveSettings } from "./storage";
import { type BlockEvent } from "../core/event-history";
import { isKnownRedirector } from "../core/known-redirectors";
import { classifyNavigation, type GestureSnapshot, type SiteMode } from "../core/navigation-classifier";
import { domainFromUrl, isSafeHttpUrl } from "../core/url-policy";
import type { GestureRecord, RuntimeMessage, Settings, UiState, UndoRecord } from "../shared/contracts";

const RULESET_ID = "known_redirectors";
const GESTURE_PREFIX = "gesture:";
const PENDING_PREFIX = "pending:";
const UNDO_PREFIX = "undo:";
const PENDING_TTL_MS = 5_000;
const UNDO_TTL_MS = 60_000;

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

chrome.runtime.onInstalled.addListener(() => {
  void initializeExtension();
});

chrome.runtime.onStartup.addListener(() => {
  void syncDnrState();
});

chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
  void handleCreatedNavigation(details);
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) void handleCommittedNavigation(details.tabId, details.url, details.timeStamp);
});

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

async function delay(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function getGesture(tabId: number, frameId: number): Promise<GestureRecord | null> {
  const key = gestureKey(tabId, frameId);
  const result = await chrome.storage.session.get(key);
  await chrome.storage.session.remove(key);
  return (result[key] as GestureRecord | undefined) ?? null;
}

async function handleCreatedNavigation(details: CreatedNavigationDetails): Promise<void> {
  await delay(75);
  const gesture = await getGesture(details.sourceTabId, details.sourceFrameId);
  const sourceUrl = gesture?.sourceUrl ?? (await safeTabUrl(details.sourceTabId)) ?? "";
  const sourceTab = await safeGetTab(details.sourceTabId);
  const incognito = gesture?.incognito ?? sourceTab?.incognito ?? false;
  const siteMode = await effectiveSiteMode(sourceUrl);

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

  if (decision.action === "allow") {
    if (!incognito && gesture !== null) await incrementCounter("intentionalNewTabs");
    return;
  }

  await safeRemoveTab(details.tabId);
  const event = createBlockEvent(sourceUrl, targetUrl, decision.reason, "closed_tab", incognito);
  await appendEvent(event);
  if (!incognito) await incrementCounter("blockedNavigations");

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
  switch (message.type) {
    case "record_gesture": {
      if (sender.tab?.id === undefined) return { ok: false };
      const frameId = sender.frameId ?? 0;
      await chrome.storage.session.set({
        [gestureKey(sender.tab.id, frameId)]: message.gesture
      });
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
      await appendEvent(event);
      if (!incognito) {
        await incrementCounter("blockedNavigations");
        await incrementCounter("overlayPrevented");
      }
      if (sender.tab?.id !== undefined) {
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
    case "get_site_state":
      return getSiteState(message.sourceUrl);
    case "get_ui_state":
      return getUiState(message.sourceUrl);
    case "get_options_state":
      return { settings: await getSettings(), events: await getHistory(), counters: await getCounters() };
    case "set_global_enabled": {
      const settings = await getSettings();
      settings.globalEnabled = message.enabled;
      await saveSettings(settings);
      await syncDnrState(settings);
      await broadcastStateChange();
      return { ok: true };
    }
    case "set_site_mode": {
      const domain = domainFromUrl(message.sourceUrl);
      if (domain === null) return { ok: false };
      const settings = await getSettings();
      if (message.mode === "default") delete settings.siteModes[domain];
      else settings.siteModes[domain] = message.mode;
      await saveSettings(settings);
      await syncDnrState(settings);
      await broadcastStateChange();
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
    case "site_state_changed":
      return { ok: false };
  }
}

async function getSiteState(sourceUrl: string): Promise<{ globalEnabled: boolean; siteMode: SiteMode }> {
  const settings = await getSettings();
  const domain = domainFromUrl(sourceUrl);
  return {
    globalEnabled: settings.globalEnabled,
    siteMode: domain === null ? "paused" : settings.siteModes[domain] ?? "default"
  };
}

async function getUiState(sourceUrl: string): Promise<UiState> {
  const settings = await getSettings();
  const domain = domainFromUrl(sourceUrl);
  const siteMode = domain === null ? "paused" : settings.siteModes[domain] ?? "default";
  const events = await getHistory();
  const lastEvent = domain === null ? null : events.find((event) => event.sourceDomain === domain) ?? null;
  const undo = lastEvent === null ? null : await getUndo(lastEvent.id);
  return {
    globalEnabled: settings.globalEnabled,
    domain,
    siteMode,
    lastEvent,
    undoAvailable: undo !== null
  };
}

async function effectiveSiteMode(sourceUrl: string): Promise<SiteMode> {
  const state = await getSiteState(sourceUrl);
  return state.globalEnabled ? state.siteMode : "paused";
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

async function syncDnrState(existingSettings?: Settings): Promise<void> {
  const settings = existingSettings ?? (await getSettings());
  await chrome.declarativeNetRequest.updateEnabledRulesets(
    settings.globalEnabled
      ? { enableRulesetIds: [RULESET_ID] }
      : { disableRulesetIds: [RULESET_ID] }
  );

  const current = await chrome.declarativeNetRequest.getDynamicRules();
  const managedIds = current.filter((rule) => rule.id >= 100_000 && rule.id < 200_000).map((rule) => rule.id);
  const pausedDomains = Object.entries(settings.siteModes)
    .filter(([, mode]) => mode === "paused")
    .map(([domain]) => domain)
    .sort();
  const addRules: chrome.declarativeNetRequest.Rule[] = pausedDomains.map((domain, index) => ({
    id: 100_000 + index,
    priority: 10_000,
    action: { type: chrome.declarativeNetRequest.RuleActionType.ALLOW_ALL_REQUESTS },
    condition: {
      initiatorDomains: [domain],
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
        chrome.declarativeNetRequest.ResourceType.SUB_FRAME
      ]
    }
  }));
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: managedIds, addRules });
}

async function broadcastStateChange(): Promise<void> {
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id === undefined || tab.url === undefined) return;
      const state = await getSiteState(tab.url);
      await chrome.tabs
        .sendMessage(tab.id, { type: "site_state_changed", ...state } satisfies RuntimeMessage)
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
