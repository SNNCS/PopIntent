import {
  EMPTY_SAME_TAB_GUARD_STATE,
  SAME_TAB_ABUSE_TTL_MS,
  advanceSameTabGuard,
  type SameTabGuardEvent,
  type SameTabGuardState
} from "../core/same-tab-guard";

const STATE_PREFIX = "same-tab-guard-state:";
const RULE_COUNTER_KEY = "same-tab-guard-next-rule";
const RULE_ID_BASE = 2_000_000_000;
const RULE_ID_COUNT = 5_000;

interface StoredSameTabGuard {
  state: SameTabGuardState;
  ruleId: number | null;
}

export interface SameTabBlockedNavigation {
  sourceUrl: string;
  targetUrl: string;
}

let mutationQueue: Promise<void> = Promise.resolve();
const expiryTimers = new Map<number, ReturnType<typeof setTimeout>>();

export function dispatchSameTabGuard(
  tabId: number,
  event: SameTabGuardEvent
): Promise<SameTabBlockedNavigation | null> {
  return enqueue(async () => {
    const stored = await loadGuard(tabId);
    let transition = advanceSameTabGuard(stored.state, event);
    let ruleId = stored.ruleId;
    let blocked: SameTabBlockedNavigation | null = null;

    for (const effect of transition.effects) {
      if (effect.type === "remove_rule") {
        if (ruleId !== null) await removeRule(ruleId);
        ruleId = null;
      }
      if (effect.type === "arm_rule") {
        try {
          ruleId = await allocateRuleId();
          await chrome.declarativeNetRequest.updateSessionRules({
            removeRuleIds: [],
            addRules: [buildGuardRule(ruleId, tabId, effect.initiatorDomain)]
          });
        } catch {
          if (ruleId !== null) await removeRule(ruleId);
          ruleId = null;
          transition = advanceSameTabGuard(transition.state, { type: "enforcement_failed" });
        }
      }
      if (effect.type === "record_block") {
        blocked = { sourceUrl: effect.sourceUrl, targetUrl: effect.targetUrl };
      }
    }

    await saveGuard(tabId, { state: transition.state, ruleId });
    scheduleExpiry(tabId, transition.state);
    return blocked;
  });
}

export function recoverSameTabGuards(now = Date.now()): Promise<void> {
  return enqueue(async () => {
    const allStored = await chrome.storage.session.get(null);
    const entries = Object.entries(allStored).filter(([key]) => key.startsWith(STATE_PREFIX));
    const activeRuleIds = new Set<number>();

    for (const [key, value] of entries) {
      const tabId = Number.parseInt(key.slice(STATE_PREFIX.length), 10);
      if (!Number.isInteger(tabId) || !isStoredGuard(value)) {
        await chrome.storage.session.remove(key);
        continue;
      }
      const transition = advanceSameTabGuard(value.state, { type: "expire", occurredAt: now });
      let ruleId = value.ruleId;
      if (transition.effects.some((effect) => effect.type === "remove_rule") && ruleId !== null) {
        await removeRule(ruleId);
        ruleId = null;
      }
      if (transition.state.active !== null && ruleId !== null) activeRuleIds.add(ruleId);
      await saveGuard(tabId, { state: transition.state, ruleId });
      scheduleExpiry(tabId, transition.state);
    }

    const orphaned = (await chrome.declarativeNetRequest.getSessionRules())
      .map((rule) => rule.id)
      .filter((ruleId) => isManagedRuleId(ruleId) && !activeRuleIds.has(ruleId));
    if (orphaned.length > 0) {
      await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: orphaned, addRules: [] });
    }
  });
}

export function clearAllSameTabGuards(): Promise<void> {
  return enqueue(async () => {
    for (const timer of expiryTimers.values()) clearTimeout(timer);
    expiryTimers.clear();

    const allStored = await chrome.storage.session.get(null);
    const stateKeys = Object.keys(allStored).filter((key) => key.startsWith(STATE_PREFIX));
    if (stateKeys.length > 0) await chrome.storage.session.remove(stateKeys);

    const ruleIds = (await chrome.declarativeNetRequest.getSessionRules())
      .map((rule) => rule.id)
      .filter(isManagedRuleId);
    if (ruleIds.length > 0) {
      await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: ruleIds, addRules: [] });
    }
  });
}

function stateKey(tabId: number): string {
  return `${STATE_PREFIX}${tabId}`;
}

async function loadGuard(tabId: number): Promise<StoredSameTabGuard> {
  const key = stateKey(tabId);
  const result = await chrome.storage.session.get(key);
  const stored = result[key];
  return isStoredGuard(stored)
    ? stored
    : { state: EMPTY_SAME_TAB_GUARD_STATE, ruleId: null };
}

async function saveGuard(tabId: number, stored: StoredSameTabGuard): Promise<void> {
  const key = stateKey(tabId);
  if (stored.state.active === null && stored.state.recentAbuse === null && stored.ruleId === null) {
    await chrome.storage.session.remove(key);
    return;
  }
  await chrome.storage.session.set({ [key]: stored });
}

function buildGuardRule(
  ruleId: number,
  tabId: number,
  initiatorDomain: string
): chrome.declarativeNetRequest.Rule {
  return {
    id: ruleId,
    priority: 50_000,
    action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
    condition: {
      tabIds: [tabId],
      initiatorDomains: [initiatorDomain],
      domainType: chrome.declarativeNetRequest.DomainType.THIRD_PARTY,
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME]
    }
  };
}

async function allocateRuleId(): Promise<number> {
  const [rules, stored] = await Promise.all([
    chrome.declarativeNetRequest.getSessionRules(),
    chrome.storage.session.get(RULE_COUNTER_KEY)
  ]);
  const used = new Set(rules.map((rule) => rule.id));
  const start = Number.isInteger(stored[RULE_COUNTER_KEY])
    ? Number(stored[RULE_COUNTER_KEY]) % RULE_ID_COUNT
    : 0;
  for (let offset = 0; offset < RULE_ID_COUNT; offset += 1) {
    const candidateOffset = (start + offset) % RULE_ID_COUNT;
    const candidate = RULE_ID_BASE + candidateOffset;
    if (used.has(candidate)) continue;
    await chrome.storage.session.set({
      [RULE_COUNTER_KEY]: (candidateOffset + 1) % RULE_ID_COUNT
    });
    return candidate;
  }
  throw new Error("No same-tab guard rule IDs are available.");
}

async function removeRule(ruleId: number): Promise<void> {
  await chrome.declarativeNetRequest
    .updateSessionRules({ removeRuleIds: [ruleId], addRules: [] })
    .catch(() => undefined);
}

function scheduleExpiry(tabId: number, state: SameTabGuardState): void {
  const existing = expiryTimers.get(tabId);
  if (existing !== undefined) clearTimeout(existing);
  expiryTimers.delete(tabId);

  const deadlines = [
    state.active?.expiresAt,
    state.recentAbuse === null ? undefined : state.recentAbuse.occurredAt + SAME_TAB_ABUSE_TTL_MS
  ].filter((value): value is number => value !== undefined);
  if (deadlines.length === 0) return;

  const deadline = Math.min(...deadlines);
  const timer = setTimeout(() => {
    expiryTimers.delete(tabId);
    void dispatchSameTabGuard(tabId, { type: "expire", occurredAt: Date.now() });
  }, Math.max(0, deadline - Date.now()) + 1);
  expiryTimers.set(tabId, timer);
}

function isManagedRuleId(ruleId: number): boolean {
  return ruleId >= RULE_ID_BASE && ruleId < RULE_ID_BASE + RULE_ID_COUNT;
}

function isStoredGuard(value: unknown): value is StoredSameTabGuard {
  if (typeof value !== "object" || value === null) return false;
  const stored = value as Partial<StoredSameTabGuard>;
  return (
    typeof stored.state === "object" &&
    stored.state !== null &&
    (stored.ruleId === null || (typeof stored.ruleId === "number" && isManagedRuleId(stored.ruleId)))
  );
}

function enqueue<T>(mutation: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(mutation, mutation);
  mutationQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}
