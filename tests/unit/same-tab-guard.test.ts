import { describe, expect, it } from "vitest";

import {
  EMPTY_SAME_TAB_GUARD_STATE,
  SAME_TAB_ACTIVE_TTL_MS,
  advanceSameTabGuard,
  isHighConfidenceAbuse
} from "../../src/core/same-tab-guard";

describe("same-tab guard", () => {
  it("arms only after recent high-confidence abuse and an explicit Strict same-tab gesture", () => {
    const abused = advanceSameTabGuard(EMPTY_SAME_TAB_GUARD_STATE, {
      type: "abuse_blocked",
      occurredAt: 1_000,
      sourceUrl: "https://source.example/watch"
    });
    const armed = advanceSameTabGuard(abused.state, {
      type: "gesture",
      occurredAt: 1_700,
      sourceUrl: "https://source.example/watch",
      targetUrl: "https://article.example/story",
      explicitNewTabIntent: false,
      semanticControl: true,
      topFrame: true,
      mode: "strict"
    });

    expect(armed.state.recentAbuse).toBeNull();
    expect(armed.state.active).toMatchObject({
      phase: "awaiting_commit",
      sourceUrl: "https://source.example/watch",
      expectedUrl: "https://article.example/story",
      initiatorDomain: "article.example"
    });
    expect(armed.effects).toEqual([{ type: "arm_rule", initiatorDomain: "article.example" }]);
  });

  it.each([
    { label: "Default mode", mode: "default" as const, topFrame: true, explicitNewTabIntent: false },
    { label: "a descendant frame", mode: "strict" as const, topFrame: false, explicitNewTabIntent: false },
    { label: "an intentional new tab", mode: "strict" as const, topFrame: true, explicitNewTabIntent: true }
  ])("does not arm for $label", ({ mode, topFrame, explicitNewTabIntent }) => {
    const abused = advanceSameTabGuard(EMPTY_SAME_TAB_GUARD_STATE, {
      type: "abuse_blocked",
      occurredAt: 1_000,
      sourceUrl: "https://source.example/watch"
    });
    const result = advanceSameTabGuard(abused.state, {
      type: "gesture",
      occurredAt: 1_500,
      sourceUrl: "https://source.example/watch",
      targetUrl: "https://article.example/story",
      explicitNewTabIntent,
      semanticControl: true,
      topFrame,
      mode
    });

    expect(result.state.active).toBeNull();
    expect(result.effects).toEqual([]);
  });

  it("does not carry abuse evidence to a different source origin", () => {
    const abused = advanceSameTabGuard(EMPTY_SAME_TAB_GUARD_STATE, {
      type: "abuse_blocked",
      occurredAt: 1_000,
      sourceUrl: "https://source.example/watch"
    });
    const result = advanceSameTabGuard(abused.state, {
      type: "gesture",
      occurredAt: 1_500,
      sourceUrl: "https://other.example/page",
      targetUrl: "https://article.example/story",
      explicitNewTabIntent: false,
      semanticControl: true,
      topFrame: true,
      mode: "strict"
    });

    expect(result.state.active).toBeNull();
    expect(result.state.recentAbuse).toBeNull();
  });

  it("protects for a short window after the expected destination commits", () => {
    const armed = armedState();
    const committed = advanceSameTabGuard(armed, {
      type: "navigation_committed",
      occurredAt: 2_000,
      url: "https://article.example/story"
    });

    expect(committed.state.active).toMatchObject({
      phase: "protecting",
      expiresAt: 2_000 + SAME_TAB_ACTIVE_TTL_MS
    });
    expect(committed.effects).toEqual([]);
  });

  it("records a DNR-blocked third-party navigation and disarms", () => {
    const protecting = advanceSameTabGuard(armedState(), {
      type: "navigation_committed",
      occurredAt: 2_000,
      url: "https://article.example/story"
    }).state;
    const started = advanceSameTabGuard(protecting, {
      type: "navigation_started",
      occurredAt: 2_700,
      url: "https://outside.example/landing"
    }).state;
    const blocked = advanceSameTabGuard(started, {
      type: "navigation_blocked",
      occurredAt: 2_710,
      url: "https://outside.example/landing"
    });

    expect(blocked.state.active).toBeNull();
    expect(blocked.effects).toEqual([
      { type: "remove_rule" },
      {
        type: "record_block",
        sourceUrl: "https://article.example/story",
        targetUrl: "https://outside.example/landing"
      }
    ]);
  });

  it("disarms on the next trusted gesture or expiry", () => {
    const gesture = advanceSameTabGuard(armedState(), {
      type: "gesture",
      occurredAt: 2_000,
      sourceUrl: "https://article.example/story",
      targetUrl: "https://outside.example/intentional",
      explicitNewTabIntent: false,
      semanticControl: true,
      topFrame: true,
      mode: "strict"
    });
    expect(gesture.state.active).toBeNull();
    expect(gesture.effects).toEqual([{ type: "remove_rule" }]);

    const expired = advanceSameTabGuard(armedState(), {
      type: "expire",
      occurredAt: 20_000
    });
    expect(expired.state.active).toBeNull();
    expect(expired.effects).toEqual([{ type: "remove_rule" }]);
  });

  it("treats ambiguous semantic Strict popups as insufficient evidence", () => {
    expect(isHighConfidenceAbuse("strict_unproven", null)).toBe(false);
    expect(
      isHighConfidenceAbuse("strict_unproven", {
        occurredAt: 1_000,
        explicitDestination: null,
        explicitNewTabIntent: false,
        semanticControl: true,
        overlayHijack: false
      })
    ).toBe(false);
    expect(
      isHighConfidenceAbuse("strict_unproven", {
        occurredAt: 1_000,
        explicitDestination: null,
        explicitNewTabIntent: false,
        semanticControl: false,
        overlayHijack: false
      })
    ).toBe(true);
    expect(isHighConfidenceAbuse("target_mismatch", null)).toBe(true);
  });
});

function armedState() {
  const abused = advanceSameTabGuard(EMPTY_SAME_TAB_GUARD_STATE, {
    type: "abuse_blocked",
    occurredAt: 1_000,
    sourceUrl: "https://source.example/watch"
  });
  return advanceSameTabGuard(abused.state, {
    type: "gesture",
    occurredAt: 1_500,
    sourceUrl: "https://source.example/watch",
    targetUrl: "https://article.example/story",
    explicitNewTabIntent: false,
    semanticControl: true,
    topFrame: true,
    mode: "strict"
  }).state;
}
