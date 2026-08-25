export interface OverlayEvidence {
  coverageRatio: number;
  positioning: string;
  opacity: number;
  hasVisiblePaint: boolean;
  hasUnderlyingAction: boolean;
  isSemanticControl: boolean;
}

export function isHighConfidenceOverlay(evidence: OverlayEvidence): boolean {
  return (
    evidence.coverageRatio >= 0.6 &&
    (evidence.positioning === "fixed" || evidence.positioning === "absolute") &&
    evidence.opacity <= 0.1 &&
    !evidence.hasVisiblePaint &&
    evidence.hasUnderlyingAction &&
    !evidence.isSemanticControl
  );
}
