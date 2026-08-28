export type SiteMode = "default" | "paused" | "strict";

export type BlockReason =
  | "no_gesture"
  | "overlay_hijack"
  | "target_mismatch"
  | "known_redirector"
  | "strict_unproven"
  | "same_tab_redirect";

export interface GestureSnapshot {
  occurredAt: number;
  explicitDestination: string | null;
  explicitNewTabIntent: boolean;
  semanticControl: boolean;
  overlayHijack: boolean;
}

export interface NavigationInput {
  siteMode: SiteMode;
  sourceUrl: string;
  targetUrl: string;
  navigationOccurredAt: number;
  gesture: GestureSnapshot | null;
  knownRedirector: boolean;
}

export type NavigationDecision =
  | { action: "allow"; reason: null }
  | { action: "close_tab"; reason: BlockReason };

export const GESTURE_TTL_MS = 1_500;

function destinationsMatch(expected: string, actual: string): boolean {
  try {
    const expectedUrl = new URL(expected);
    const actualUrl = new URL(actual);
    expectedUrl.hash = "";
    actualUrl.hash = "";
    return expectedUrl.href === actualUrl.href;
  } catch {
    return false;
  }
}

export function classifyNavigation(input: NavigationInput): NavigationDecision {
  if (input.siteMode === "paused") {
    return { action: "allow", reason: null };
  }

  if (input.knownRedirector) {
    return { action: "close_tab", reason: "known_redirector" };
  }

  if (
    input.gesture === null ||
    input.navigationOccurredAt - input.gesture.occurredAt > GESTURE_TTL_MS
  ) {
    return { action: "close_tab", reason: "no_gesture" };
  }

  if (input.gesture.overlayHijack) {
    return { action: "close_tab", reason: "overlay_hijack" };
  }

  if (
    input.gesture.explicitDestination !== null &&
    !destinationsMatch(input.gesture.explicitDestination, input.targetUrl)
  ) {
    return { action: "close_tab", reason: "target_mismatch" };
  }

  if (input.siteMode === "strict" && input.gesture.explicitDestination === null) {
    return { action: "close_tab", reason: "strict_unproven" };
  }

  return { action: "allow", reason: null };
}
