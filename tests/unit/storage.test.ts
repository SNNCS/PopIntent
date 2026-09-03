import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BlockEvent } from "../../src/core/event-history";
import type { DiagnosticEvent } from "../../src/core/diagnostic-trace";
import {
  appendDiagnosticEvent,
  appendEvent,
  exportDiagnosticTrace,
  getCounters,
  getDiagnosticTrace,
  getHistory,
  getSettings,
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
    },
    runtime: {
      getManifest: vi.fn(() => ({ version: "0.1.0" }))
    }
  });
});

afterEach(() => {
  vi.restoreAllMocks();
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

function diagnosticEvent(index: number): DiagnosticEvent {
  return {
    id: `diagnostic-${index}`,
    workerId: "worker-1",
    occurredAt: Date.UTC(2026, 7, 25, 12, 0, index),
    kind: "navigation_target_created",
    tabId: index,
    sourceDomain: "wikisport.cc",
    targetDomain: "advertising.test"
  };
}

describe("local storage mutations", () => {
  it("uses Default as the initial global mode", async () => {
    await expect(getSettings()).resolves.toEqual({ mode: "default" });
  });

  it("migrates the disabled legacy setting to global Paused", async () => {
    stored.settings = { globalEnabled: false, siteModes: { "example.test": "strict" } };

    await expect(getSettings()).resolves.toEqual({ mode: "paused" });
  });

  it("migrates a legacy Strict site override to global Strict", async () => {
    stored.settings = { globalEnabled: true, siteModes: { "example.test": "strict" } };

    await expect(getSettings()).resolves.toEqual({ mode: "strict" });
  });

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
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 7, 25, 12, 1));
    await appendEvent(event(1));

    await Promise.all([
      markEvent("event-1", "false_positive"),
      markEvent("event-1", "false_positive")
    ]);

    await expect(getCounters()).resolves.toMatchObject({ incorrectBlocks: 1 });
  });

  it("does not lose diagnostic events recorded concurrently", async () => {
    await Promise.all(
      Array.from({ length: 20 }, (_, index) => appendDiagnosticEvent(diagnosticEvent(index), false))
    );

    const trace = await getDiagnosticTrace(Date.UTC(2026, 7, 25, 12, 1));
    expect(trace.map(({ id }) => id).sort()).toEqual(
      Array.from({ length: 20 }, (_, index) => `diagnostic-${index}`).sort()
    );
  });

  it("never stores private browsing diagnostic events", async () => {
    await appendDiagnosticEvent(diagnosticEvent(1), true);

    await expect(getDiagnosticTrace(Date.UTC(2026, 7, 25, 12, 1))).resolves.toEqual([]);
  });

  it("exports the diagnostic privacy declaration and domain-only events", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 7, 25, 12, 1));
    await appendDiagnosticEvent(diagnosticEvent(1), false);

    const exported = await exportDiagnosticTrace("Chrome 151");

    expect(exported.privacy).toEqual({
      fullUrlsStored: false,
      incognitoStored: false,
      networkTransmission: false
    });
    expect(exported.events[0]).toMatchObject({
      sourceDomain: "wikisport.cc",
      targetDomain: "advertising.test"
    });
    expect(JSON.stringify(exported)).not.toContain("https://");
  });
});
