import type { BlockEvent } from "../core/event-history";
import type { GestureSnapshot, SiteMode } from "../core/navigation-classifier";
import type { ValidationCounters } from "../core/validation-summary";

export interface Settings {
  mode: SiteMode;
}

export interface GestureRecord extends GestureSnapshot {
  sourceUrl: string;
  incognito: boolean;
  diagnostic?: {
    inputType: "keyboard" | "pointer";
    targetKind: "anchor" | "button" | "input" | "role_button" | "role_link" | "other" | "none";
    topFrame: boolean;
    pointerButton?: number;
  };
}

export interface UndoRecord {
  eventId: string;
  sourceTabId: number;
  targetUrl: string;
  expiresAt: number;
  incognito: boolean;
  disposition?: "new_tab" | "same_tab";
}

export interface UiState {
  domain: string | null;
  mode: SiteMode;
  lastEvent: BlockEvent | null;
  undoAvailable: boolean;
}

export interface OptionsState {
  settings: Settings;
  events: BlockEvent[];
  counters: ValidationCounters;
}

export type RuntimeMessage =
  | { type: "record_gesture"; gesture: GestureRecord }
  | { type: "overlay_prevented"; sourceUrl: string; targetUrl: string | null }
  | { type: "get_global_state" }
  | { type: "get_ui_state"; sourceUrl: string }
  | { type: "get_options_state" }
  | { type: "set_global_mode"; mode: SiteMode }
  | { type: "open_once"; eventId: string }
  | { type: "mark_event"; eventId: string; verdict: "correct" | "false_positive" }
  | { type: "report_missed" }
  | { type: "clear_history" }
  | { type: "export_summary"; browser: string }
  | { type: "clear_diagnostic_trace" }
  | { type: "export_diagnostic_trace"; browser: string }
  | { type: "show_blocked"; event: BlockEvent; undoAvailable: boolean }
  | { type: "global_mode_changed"; mode: SiteMode };
