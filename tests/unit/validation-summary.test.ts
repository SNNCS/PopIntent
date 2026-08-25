import { describe, expect, it } from "vitest";

import { buildValidationSummary } from "../../src/core/validation-summary";

describe("buildValidationSummary", () => {
  it("exports aggregate counts without source or target domains", () => {
    const summary = buildValidationSummary({
      extensionVersion: "0.1.0",
      browser: "Chrome",
      exportedAt: 20_000,
      events: [
        {
          id: "1",
          occurredAt: 10_000,
          sourceDomain: "private-source.example",
          targetDomain: "private-target.example",
          reason: "no_gesture",
          action: "closed_tab",
          verdict: "correct",
          incognito: false
        },
        {
          id: "2",
          occurredAt: 11_000,
          sourceDomain: "another-source.example",
          targetDomain: "another-target.example",
          reason: "target_mismatch",
          action: "closed_tab",
          verdict: "false_positive",
          incognito: false
        }
      ],
      counters: {
        blockedNavigations: 25,
        incorrectBlocks: 2,
        missedRedirects: 3,
        intentionalNewTabs: 20,
        openedAnyway: 1,
        overlayPrevented: 0
      }
    });

    expect(summary).toEqual({
      schemaVersion: 1,
      extensionVersion: "0.1.0",
      browser: "Chrome",
      exportedAt: 20_000,
      periodStart: 10_000,
      periodEnd: 11_000,
      counts: {
        blocked: 25,
        markedCorrect: 1,
        falsePositives: 2,
        missedRedirects: 3,
        intentionalNewTabs: 20,
        openedAnyway: 1,
        overlayPrevented: 0
      }
    });
    expect(JSON.stringify(summary)).not.toContain("private-source.example");
  });
});
