import { describe, expect, it } from "vitest";

import { isHighConfidenceOverlay } from "../../src/core/overlay-classifier";

describe("isHighConfidenceOverlay", () => {
  it("recognizes a transparent fixed layer covering an actionable control", () => {
    expect(
      isHighConfidenceOverlay({
        coverageRatio: 0.8,
        positioning: "fixed",
        opacity: 0,
        hasVisiblePaint: false,
        hasUnderlyingAction: true,
        isSemanticControl: false
      })
    ).toBe(true);
  });

  it("does not classify a full-screen semantic control as an overlay hijack", () => {
    expect(
      isHighConfidenceOverlay({
        coverageRatio: 0.8,
        positioning: "fixed",
        opacity: 0,
        hasVisiblePaint: false,
        hasUnderlyingAction: true,
        isSemanticControl: true
      })
    ).toBe(false);
  });

  it("does not classify a small transparent element as a full-screen overlay", () => {
    expect(
      isHighConfidenceOverlay({
        coverageRatio: 0.59,
        positioning: "fixed",
        opacity: 0,
        hasVisiblePaint: false,
        hasUnderlyingAction: true,
        isSemanticControl: false
      })
    ).toBe(false);
  });

  it("requires fixed or absolute positioning", () => {
    expect(
      isHighConfidenceOverlay({
        coverageRatio: 0.8,
        positioning: "static",
        opacity: 0,
        hasVisiblePaint: false,
        hasUnderlyingAction: true,
        isSemanticControl: false
      })
    ).toBe(false);
  });

  it("does not treat an opaque painted modal as a transparent hijack", () => {
    expect(
      isHighConfidenceOverlay({
        coverageRatio: 0.8,
        positioning: "fixed",
        opacity: 1,
        hasVisiblePaint: true,
        hasUnderlyingAction: true,
        isSemanticControl: false
      })
    ).toBe(false);
  });

  it("requires a real actionable element underneath the transparent layer", () => {
    expect(
      isHighConfidenceOverlay({
        coverageRatio: 0.8,
        positioning: "fixed",
        opacity: 0,
        hasVisiblePaint: false,
        hasUnderlyingAction: false,
        isSemanticControl: false
      })
    ).toBe(false);
  });
});
