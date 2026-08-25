import { describe, expect, it } from "vitest";

import { classifyNavigation } from "../../src/core/navigation-classifier";

describe("classifyNavigation", () => {
  it("closes a new tab created without a recent user gesture", () => {
    expect(
      classifyNavigation({
        siteMode: "default",
        sourceUrl: "https://video.example/watch",
        targetUrl: "https://ads.example/landing",
        navigationOccurredAt: 10_000,
        gesture: null,
        knownRedirector: false
      })
    ).toEqual({ action: "close_tab", reason: "no_gesture" });
  });

  it("allows navigation when protection is paused for the source site", () => {
    expect(
      classifyNavigation({
        siteMode: "paused",
        sourceUrl: "https://video.example/watch",
        targetUrl: "https://ads.example/landing",
        navigationOccurredAt: 10_000,
        gesture: null,
        knownRedirector: true
      })
    ).toEqual({ action: "allow", reason: null });
  });

  it("treats a gesture older than 1.5 seconds as unrelated", () => {
    expect(
      classifyNavigation({
        siteMode: "default",
        sourceUrl: "https://video.example/watch",
        targetUrl: "https://ads.example/landing",
        navigationOccurredAt: 10_001,
        gesture: {
          occurredAt: 8_500,
          explicitDestination: null,
          explicitNewTabIntent: false,
          semanticControl: true,
          overlayHijack: false
        },
        knownRedirector: false
      })
    ).toEqual({ action: "close_tab", reason: "no_gesture" });
  });

  it("closes a known redirector even when it follows a recent click", () => {
    expect(
      classifyNavigation({
        siteMode: "default",
        sourceUrl: "https://article.example/story",
        targetUrl: "https://redirector.example/campaign",
        navigationOccurredAt: 10_000,
        gesture: {
          occurredAt: 9_900,
          explicitDestination: null,
          explicitNewTabIntent: false,
          semanticControl: true,
          overlayHijack: false
        },
        knownRedirector: true
      })
    ).toEqual({ action: "close_tab", reason: "known_redirector" });
  });

  it("closes navigation caused by a high-confidence transparent overlay", () => {
    expect(
      classifyNavigation({
        siteMode: "default",
        sourceUrl: "https://video.example/watch",
        targetUrl: "https://merchant.example/promo",
        navigationOccurredAt: 10_000,
        gesture: {
          occurredAt: 9_900,
          explicitDestination: null,
          explicitNewTabIntent: false,
          semanticControl: false,
          overlayHijack: true
        },
        knownRedirector: false
      })
    ).toEqual({ action: "close_tab", reason: "overlay_hijack" });
  });

  it("closes a child tab whose first URL differs from the clicked link", () => {
    expect(
      classifyNavigation({
        siteMode: "default",
        sourceUrl: "https://article.example/story",
        targetUrl: "https://ads.example/landing",
        navigationOccurredAt: 10_000,
        gesture: {
          occurredAt: 9_900,
          explicitDestination: "https://article.example/read-more",
          explicitNewTabIntent: false,
          semanticControl: true,
          overlayHijack: false
        },
        knownRedirector: false
      })
    ).toEqual({ action: "close_tab", reason: "target_mismatch" });
  });

  it("closes an unproven script popup in strict mode", () => {
    expect(
      classifyNavigation({
        siteMode: "strict",
        sourceUrl: "https://video.example/watch",
        targetUrl: "https://merchant.example/promo",
        navigationOccurredAt: 10_000,
        gesture: {
          occurredAt: 9_900,
          explicitDestination: null,
          explicitNewTabIntent: false,
          semanticControl: true,
          overlayHijack: false
        },
        knownRedirector: false
      })
    ).toEqual({ action: "close_tab", reason: "strict_unproven" });
  });
});
