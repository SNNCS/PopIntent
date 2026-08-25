import type { BlockReason } from "./navigation-classifier";

export interface BlockEvent {
  id: string;
  occurredAt: number;
  sourceDomain: string;
  targetDomain: string;
  reason: BlockReason;
  action: "prevented_click" | "closed_tab";
  verdict: "unrated" | "correct" | "false_positive";
  incognito: boolean;
}

const RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;

export function pruneEventHistory(events: BlockEvent[], now: number): BlockEvent[] {
  return events
    .filter((event) => !event.incognito && now - event.occurredAt <= RETENTION_MS)
    .sort((left, right) => right.occurredAt - left.occurredAt)
    .slice(0, 500);
}
