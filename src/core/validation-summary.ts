import type { BlockEvent } from "./event-history";

export interface ValidationCounters {
  blockedNavigations: number;
  incorrectBlocks: number;
  missedRedirects: number;
  intentionalNewTabs: number;
  openedAnyway: number;
  overlayPrevented: number;
}

export interface ValidationSummaryInput {
  extensionVersion: string;
  browser: string;
  exportedAt: number;
  events: BlockEvent[];
  counters: ValidationCounters;
}

export function buildValidationSummary(input: ValidationSummaryInput) {
  const occurredAt = input.events.map((event) => event.occurredAt);

  return {
    schemaVersion: 1 as const,
    extensionVersion: input.extensionVersion,
    browser: input.browser,
    exportedAt: input.exportedAt,
    periodStart: occurredAt.length > 0 ? Math.min(...occurredAt) : null,
    periodEnd: occurredAt.length > 0 ? Math.max(...occurredAt) : null,
    counts: {
      blocked: input.counters.blockedNavigations,
      markedCorrect: input.events.filter((event) => event.verdict === "correct").length,
      falsePositives: input.counters.incorrectBlocks,
      missedRedirects: input.counters.missedRedirects,
      intentionalNewTabs: input.counters.intentionalNewTabs,
      openedAnyway: input.counters.openedAnyway,
      overlayPrevented: input.counters.overlayPrevented
    }
  };
}
