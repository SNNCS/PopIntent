import type { BlockEvent } from "../core/event-history";
import type { GestureSnapshot, SiteMode } from "../core/navigation-classifier";
import type { ValidationCounters } from "../core/validation-summary";

export interface Settings {
  globalEnabled: boolean;
  siteModes: Record<string, SiteMode>;
}

export interface GestureRecord extends GestureSnapshot {
  sourceUrl: string;
  incognito: boolean;
}

export interface UndoRecord {
  eventId: string;
  sourceTabId: number;
  targetUrl: string;
  expiresAt: number;
  incognito: boolean;
}

export interface UiState {
  globalEnabled: boolean;
  domain: string | null;
  siteMode: SiteMode;
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
  | { type: "get_site_state"; sourceUrl: string }
  | { type: "get_ui_state"; sourceUrl: string }
  | { type: "get_options_state" }
  | { type: "set_global_enabled"; enabled: boolean }
  | { type: "set_site_mode"; sourceUrl: string; mode: SiteMode }
  | { type: "open_once"; eventId: string }
  | { type: "mark_event"; eventId: string; verdict: "correct" | "false_positive" }
  | { type: "report_missed" }
  | { type: "clear_history" }
  | { type: "export_summary"; browser: string }
  | { type: "show_blocked"; event: BlockEvent; undoAvailable: boolean }
  | { type: "site_state_changed"; globalEnabled: boolean; siteMode: SiteMode };
