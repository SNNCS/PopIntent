import { pruneEventHistory, type BlockEvent } from "../core/event-history";
import {
  buildValidationSummary,
  type ValidationCounters
} from "../core/validation-summary";
import type { Settings } from "../shared/contracts";

const SETTINGS_KEY = "settings";
const EVENTS_KEY = "events";
const COUNTERS_KEY = "validationCounters";
let localMutationQueue: Promise<void> = Promise.resolve();

export const DEFAULT_SETTINGS: Settings = {
  globalEnabled: true,
  siteModes: {}
};

export const DEFAULT_COUNTERS: ValidationCounters = {
  blockedNavigations: 0,
  incorrectBlocks: 0,
  missedRedirects: 0,
  intentionalNewTabs: 0,
  openedAnyway: 0,
  overlayPrevented: 0
};

function runLocalMutation<T>(mutation: () => Promise<T>): Promise<T> {
  const result = localMutationQueue.then(mutation, mutation);
  localMutationQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

async function readPrunedHistory(now: number): Promise<BlockEvent[]> {
  const result = await chrome.storage.local.get(EVENTS_KEY);
  return pruneEventHistory((result[EVENTS_KEY] as BlockEvent[] | undefined) ?? [], now);
}

async function readCounters(): Promise<ValidationCounters> {
  const result = await chrome.storage.local.get(COUNTERS_KEY);
  return { ...DEFAULT_COUNTERS, ...(result[COUNTERS_KEY] as Partial<ValidationCounters>) };
}

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  const stored = result[SETTINGS_KEY] as Partial<Settings> | undefined;
  return {
    globalEnabled: stored?.globalEnabled ?? true,
    siteModes: stored?.siteModes ?? {}
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await runLocalMutation(() => chrome.storage.local.set({ [SETTINGS_KEY]: settings }));
}

export async function getHistory(now = Date.now()): Promise<BlockEvent[]> {
  return runLocalMutation(async () => {
    const events = await readPrunedHistory(now);
    await chrome.storage.local.set({ [EVENTS_KEY]: events });
    return events;
  });
}

export async function appendEvent(event: BlockEvent): Promise<void> {
  if (event.incognito) return;
  await runLocalMutation(async () => {
    const events = await readPrunedHistory(event.occurredAt);
    await chrome.storage.local.set({
      [EVENTS_KEY]: pruneEventHistory([event, ...events], event.occurredAt)
    });
  });
}

export async function markEvent(
  eventId: string,
  verdict: "correct" | "false_positive"
): Promise<void> {
  await runLocalMutation(async () => {
    const events = await readPrunedHistory(Date.now());
    const existing = events.find((event) => event.id === eventId);
    if (existing === undefined) return;
    const incorrectDelta =
      Number(verdict === "false_positive") - Number(existing.verdict === "false_positive");
    const counters = await readCounters();
    counters.incorrectBlocks = Math.max(0, counters.incorrectBlocks + incorrectDelta);
    await chrome.storage.local.set({
      [EVENTS_KEY]: events.map((event) => (event.id === eventId ? { ...event, verdict } : event)),
      [COUNTERS_KEY]: counters
    });
  });
}

export async function clearHistory(): Promise<void> {
  await runLocalMutation(() => chrome.storage.local.set({ [EVENTS_KEY]: [] }));
}

export async function getCounters(): Promise<ValidationCounters> {
  return readCounters();
}

export async function incrementCounter(
  counter: keyof ValidationCounters,
  amount = 1
): Promise<void> {
  await runLocalMutation(async () => {
    const counters = await getCounters();
    counters[counter] += amount;
    await chrome.storage.local.set({ [COUNTERS_KEY]: counters });
  });
}

export async function exportSummary(browser: string): Promise<ReturnType<typeof buildValidationSummary>> {
  return buildValidationSummary({
    extensionVersion: chrome.runtime.getManifest().version,
    browser,
    exportedAt: Date.now(),
    events: await getHistory(),
    counters: await getCounters()
  });
}
