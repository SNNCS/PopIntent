import type { SiteMode } from "./navigation-classifier";

export const DIAGNOSTIC_SCHEMA_VERSION = 1;
export const DIAGNOSTIC_RETENTION_MS = 24 * 60 * 60 * 1_000;
export const DIAGNOSTIC_EVENT_LIMIT = 500;

export type DiagnosticEventKind =
  | "gesture"
  | "navigation_before"
  | "navigation_target_created"
  | "navigation_committed"
  | "tab_created"
  | "tab_url_changed"
  | "classifier_decision"
  | "overlay_prevented"
  | "same_tab_redirect_blocked";

export interface DiagnosticEvent {
  id: string;
  workerId: string;
  occurredAt: number;
  kind: DiagnosticEventKind;
  tabId?: number;
  sourceTabId?: number;
  openerTabId?: number;
  frameId?: number;
  parentFrameId?: number;
  sourceDomain?: string;
  targetDomain?: string;
  inputType?: "keyboard" | "pointer";
  targetKind?: "anchor" | "button" | "input" | "role_button" | "role_link" | "other" | "none";
  topFrame?: boolean;
  pointerButton?: number;
  explicitDestination?: boolean;
  explicitNewTabIntent?: boolean;
  semanticControl?: boolean;
  overlayHijack?: boolean;
  globalEnabled?: boolean;
  configuredSiteMode?: SiteMode;
  effectiveSiteMode?: SiteMode;
  gestureAgeMs?: number;
  transitionType?: string;
  transitionQualifiers?: string[];
  classifierAction?: "allow" | "close_tab" | "block_navigation";
  classifierReason?: string;
  tabStatus?: string;
}

export interface DiagnosticExport {
  schemaVersion: typeof DIAGNOSTIC_SCHEMA_VERSION;
  build: "diagnostic";
  extensionVersion: string;
  browser: string;
  exportedAt: number;
  privacy: {
    fullUrlsStored: false;
    incognitoStored: false;
    networkTransmission: false;
  };
  events: DiagnosticEvent[];
}

export function pruneDiagnosticTrace(
  events: DiagnosticEvent[],
  now: number
): DiagnosticEvent[] {
  return events
    .filter((event) => now - event.occurredAt <= DIAGNOSTIC_RETENTION_MS)
    .sort((left, right) => right.occurredAt - left.occurredAt)
    .slice(0, DIAGNOSTIC_EVENT_LIMIT);
}

export function buildDiagnosticExport(input: {
  extensionVersion: string;
  browser: string;
  exportedAt: number;
  events: DiagnosticEvent[];
}): DiagnosticExport {
  return {
    schemaVersion: DIAGNOSTIC_SCHEMA_VERSION,
    build: "diagnostic",
    extensionVersion: input.extensionVersion,
    browser: input.browser,
    exportedAt: input.exportedAt,
    privacy: {
      fullUrlsStored: false,
      incognitoStored: false,
      networkTransmission: false
    },
    events: pruneDiagnosticTrace(input.events, input.exportedAt).sort(
      (left, right) => left.occurredAt - right.occurredAt
    )
  };
}
