import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BlockEvent } from "../../src/core/event-history";
import {
  appendEvent,
  getCounters,
  getHistory,
  incrementCounter,
  markEvent
} from "../../src/background/storage";

let stored: Record<string, unknown>;

beforeEach(() => {
  stored = {};
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn(async (key: string) => {
          await Promise.resolve();
          return { [key]: structuredClone(stored[key]) };
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          await Promise.resolve();
          Object.assign(stored, structuredClone(items));
        })
      }
    }
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function event(index: number): BlockEvent {
  return {
    id: `event-${index}`,
    occurredAt: Date.UTC(2026, 7, 25, 12, 0, index),
    sourceDomain: "example.test",
    targetDomain: "redirect.test",
    reason: "target_mismatch",
    action: "closed_tab",
    verdict: "unrated",
    incognito: false
  };
}

describe("local storage mutations", () => {
  it("does not lose events when several navigations are recorded concurrently", async () => {
    await Promise.all(Array.from({ length: 20 }, (_, index) => appendEvent(event(index))));

    const history = await getHistory(Date.UTC(2026, 7, 25, 12, 1));
    expect(history.map(({ id }) => id).sort()).toEqual(
      Array.from({ length: 20 }, (_, index) => `event-${index}`).sort()
    );
  });

  it("does not lose increments when several counters change concurrently", async () => {
    await Promise.all(Array.from({ length: 20 }, () => incrementCounter("intentionalNewTabs")));

    await expect(getCounters()).resolves.toMatchObject({ intentionalNewTabs: 20 });
  });

  it("counts an incorrect block only once even if it is marked repeatedly", async () => {
    await appendEvent(event(1));

    await Promise.all([
      markEvent("event-1", "false_positive"),
      markEvent("event-1", "false_positive")
    ]);

    await expect(getCounters()).resolves.toMatchObject({ incorrectBlocks: 1 });
  });
});
