import type { BlockReason, GestureSnapshot, SiteMode } from "./navigation-classifier";

export const SAME_TAB_ABUSE_TTL_MS = 3_000;
export const SAME_TAB_PENDING_TTL_MS = 10_000;
export const SAME_TAB_ACTIVE_TTL_MS = 3_000;

export interface SameTabGuardState {
  recentAbuse: {
    occurredAt: number;
    sourceOrigin: string;
  } | null;
  active: {
    phase: "awaiting_commit" | "protecting";
    sourceUrl: string;
    expectedUrl: string;
    initiatorDomain: string;
    expiresAt: number;
    pendingTargetUrl: string | null;
  } | null;
}

export const EMPTY_SAME_TAB_GUARD_STATE: SameTabGuardState = {
  recentAbuse: null,
  active: null
};

export type SameTabGuardEvent =
  | { type: "abuse_blocked"; occurredAt: number; sourceUrl: string }
  | {
      type: "gesture";
      occurredAt: number;
      sourceUrl: string;
      targetUrl: string | null;
      explicitNewTabIntent: boolean;
      semanticControl: boolean;
      topFrame: boolean;
      mode: SiteMode;
    }
  | { type: "navigation_started"; occurredAt: number; url: string }
  | { type: "navigation_committed"; occurredAt: number; url: string }
  | { type: "navigation_blocked"; occurredAt: number; url: string }
  | { type: "mode_changed"; mode: SiteMode }
  | { type: "expire"; occurredAt: number }
  | { type: "enforcement_failed" };

export type SameTabGuardEffect =
  | { type: "arm_rule"; initiatorDomain: string }
  | { type: "remove_rule" }
  | { type: "record_block"; sourceUrl: string; targetUrl: string };

export interface SameTabGuardTransition {
  state: SameTabGuardState;
  effects: SameTabGuardEffect[];
}

export function advanceSameTabGuard(
  state: SameTabGuardState,
  event: SameTabGuardEvent
): SameTabGuardTransition {
  switch (event.type) {
    case "abuse_blocked": {
      const source = safeHttpUrl(event.sourceUrl);
      const effects: SameTabGuardEffect[] = state.active === null ? [] : [{ type: "remove_rule" }];
      if (source !== null) effects.push({ type: "arm_rule", initiatorDomain: source.hostname });
      return {
        state: {
          recentAbuse:
            source === null ? null : { occurredAt: event.occurredAt, sourceOrigin: source.origin },
          active:
            source === null
              ? null
              : {
                  phase: "protecting",
                  sourceUrl: event.sourceUrl,
                  expectedUrl: event.sourceUrl,
                  initiatorDomain: source.hostname,
                  expiresAt: event.occurredAt + SAME_TAB_ABUSE_TTL_MS,
                  pendingTargetUrl: null
                }
        },
        effects
      };
    }
    case "gesture": {
      const effects: SameTabGuardEffect[] = state.active === null ? [] : [{ type: "remove_rule" }];
      const source = safeHttpUrl(event.sourceUrl);
      const target = event.targetUrl === null ? null : safeHttpUrl(event.targetUrl);
      const recentAbuse = freshAbuse(state.recentAbuse, event.occurredAt);
      const eligible =
        event.mode === "strict" &&
        event.topFrame &&
        event.semanticControl &&
        !event.explicitNewTabIntent &&
        source !== null &&
        target !== null &&
        recentAbuse !== null &&
        recentAbuse.sourceOrigin === source.origin;

      if (!eligible || target === null) {
        return {
          state: {
            recentAbuse:
              recentAbuse !== null && source !== null && recentAbuse.sourceOrigin === source.origin
                ? recentAbuse
                : null,
            active: null
          },
          effects
        };
      }

      effects.push({ type: "arm_rule", initiatorDomain: target.hostname });
      return {
        state: {
          recentAbuse: null,
          active: {
            phase: "awaiting_commit",
            sourceUrl: event.sourceUrl,
            expectedUrl: event.targetUrl!,
            initiatorDomain: target.hostname,
            expiresAt: event.occurredAt + SAME_TAB_PENDING_TTL_MS,
            pendingTargetUrl: null
          }
        },
        effects
      };
    }
    case "navigation_started": {
      const expired = expireActive(state, event.occurredAt);
      if (expired !== null) return expired;
      if (state.active === null) return unchanged(state);
      return {
        state: {
          ...state,
          active: { ...state.active, pendingTargetUrl: event.url }
        },
        effects: []
      };
    }
    case "navigation_committed": {
      const expired = expireActive(state, event.occurredAt);
      if (expired !== null) return expired;
      if (state.active === null) return unchanged(state);
      const committed = safeHttpUrl(event.url);
      if (committed === null || committed.hostname !== state.active.initiatorDomain) {
        return disarm(state);
      }
      if (state.active.phase === "protecting") {
        return {
          state: { ...state, active: { ...state.active, pendingTargetUrl: null } },
          effects: []
        };
      }
      return {
        state: {
          ...state,
          active: {
            ...state.active,
            phase: "protecting",
            sourceUrl: event.url,
            expiresAt: event.occurredAt + SAME_TAB_ACTIVE_TTL_MS,
            pendingTargetUrl: null
          }
        },
        effects: []
      };
    }
    case "navigation_blocked": {
      if (
        state.active === null ||
        state.active.phase !== "protecting" ||
        state.active.pendingTargetUrl !== event.url
      ) {
        return unchanged(state);
      }
      return {
        state: { recentAbuse: state.recentAbuse, active: null },
        effects: [
          { type: "remove_rule" },
          { type: "record_block", sourceUrl: state.active.sourceUrl, targetUrl: event.url }
        ]
      };
    }
    case "mode_changed":
      return event.mode === "strict"
        ? unchanged(state)
        : {
            state: EMPTY_SAME_TAB_GUARD_STATE,
            effects: state.active === null ? [] : [{ type: "remove_rule" }]
          };
    case "expire": {
      const recentAbuse = freshAbuse(state.recentAbuse, event.occurredAt);
      const withPrunedAbuse = { ...state, recentAbuse };
      return expireActive(withPrunedAbuse, event.occurredAt) ?? unchanged(withPrunedAbuse);
    }
    case "enforcement_failed":
      return {
        state: { recentAbuse: state.recentAbuse, active: null },
        effects: []
      };
  }
}

export function isHighConfidenceAbuse(
  reason: BlockReason,
  gesture: GestureSnapshot | null
): boolean {
  return reason !== "strict_unproven" || (gesture !== null && !gesture.semanticControl);
}

function safeHttpUrl(value: string): URL | null {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed : null;
  } catch {
    return null;
  }
}

function freshAbuse(
  abuse: SameTabGuardState["recentAbuse"],
  now: number
): SameTabGuardState["recentAbuse"] {
  if (abuse === null) return null;
  const age = now - abuse.occurredAt;
  return age >= 0 && age <= SAME_TAB_ABUSE_TTL_MS ? abuse : null;
}

function expireActive(
  state: SameTabGuardState,
  now: number
): SameTabGuardTransition | null {
  if (state.active === null || now < state.active.expiresAt) return null;
  return disarm(state);
}

function disarm(state: SameTabGuardState): SameTabGuardTransition {
  if (state.active === null) return unchanged(state);
  return {
    state: { recentAbuse: state.recentAbuse, active: null },
    effects: [{ type: "remove_rule" }]
  };
}

function unchanged(state: SameTabGuardState): SameTabGuardTransition {
  return { state, effects: [] };
}
