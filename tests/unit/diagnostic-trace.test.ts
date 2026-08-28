import { describe, expect, it } from "vitest";

import {
  buildDiagnosticExport,
  DIAGNOSTIC_EVENT_LIMIT,
  DIAGNOSTIC_RETENTION_MS,
  pruneDiagnosticTrace,
  type DiagnosticEvent
} from "../../src/core/diagnostic-trace";

const NOW = Date.UTC(2026, 7, 26, 12);

function event(index: number, occurredAt = NOW - index): DiagnosticEvent {
  return {
    id: `diagnostic-${index}`,
    workerId: "worker-1",
    occurredAt,
    kind: "navigation_committed",
    tabId: 10,
    frameId: 0,
    sourceDomain: "wikisport.cc",
    targetDomain: "advertising.test",
    transitionType: "link"
  };
}

describe("diagnostic trace", () => {
  it("keeps only the newest 500 events from the last 24 hours", () => {
    const events = Array.from({ length: DIAGNOSTIC_EVENT_LIMIT + 20 }, (_, index) => event(index));
    events.push(event(10_000, NOW - DIAGNOSTIC_RETENTION_MS - 1));

    const result = pruneDiagnosticTrace(events, NOW);

    expect(result).toHaveLength(DIAGNOSTIC_EVENT_LIMIT);
    expect(result[0]?.id).toBe("diagnostic-0");
    expect(result.at(-1)?.id).toBe(`diagnostic-${DIAGNOSTIC_EVENT_LIMIT - 1}`);
    expect(result.some(({ id }) => id === "diagnostic-10000")).toBe(false);
  });

  it("exports chronological domain-only data with an explicit privacy declaration", () => {
    const exported = buildDiagnosticExport({
      extensionVersion: "0.1.0",
      browser: "Chrome 151",
      exportedAt: NOW,
      events: [event(2), event(1)]
    });

    expect(exported).toMatchObject({
      schemaVersion: 1,
      build: "diagnostic",
      extensionVersion: "0.1.0",
      privacy: {
        fullUrlsStored: false,
        incognitoStored: false,
        networkTransmission: false
      }
    });
    expect(exported.events.map(({ id }) => id)).toEqual(["diagnostic-2", "diagnostic-1"]);
    expect(JSON.stringify(exported)).not.toContain("https://");
  });
});
