import { describe, expect, it } from "vitest";

import { pruneEventHistory, type BlockEvent } from "../../src/core/event-history";

const DAY_MS = 24 * 60 * 60 * 1_000;

function event(id: string, occurredAt: number): BlockEvent {
  return {
    id,
    occurredAt,
    sourceDomain: "source.example",
    targetDomain: "target.example",
    reason: "no_gesture",
    action: "closed_tab",
    verdict: "unrated",
    incognito: false
  };
}

describe("pruneEventHistory", () => {
  it("removes events older than seven days", () => {
    const now = 10 * DAY_MS;

    expect(
      pruneEventHistory(
        [event("fresh", now - 7 * DAY_MS), event("expired", now - 7 * DAY_MS - 1)],
        now
      ).map(({ id }) => id)
    ).toEqual(["fresh"]);
  });

  it("never returns incognito events for persistent storage", () => {
    const normal = event("normal", DAY_MS);
    const incognito = { ...event("incognito", DAY_MS), incognito: true };

    expect(pruneEventHistory([normal, incognito], DAY_MS).map(({ id }) => id)).toEqual([
      "normal"
    ]);
  });

  it("keeps only the five hundred newest events", () => {
    const events = Array.from({ length: 501 }, (_, index) => event(String(index), index));

    const result = pruneEventHistory(events, 501);

    expect({ count: result.length, newest: result[0]?.id, oldest: result.at(-1)?.id }).toEqual({
      count: 500,
      newest: "500",
      oldest: "1"
    });
  });
});
