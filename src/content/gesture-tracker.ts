import { isHighConfidenceOverlay, type OverlayEvidence } from "../core/overlay-classifier";
import type { GestureRecord, RuntimeMessage } from "../shared/contracts";

let globalMode: "default" | "paused" | "strict" = "default";

void sendMessage({ type: "get_global_state" }).then((state) => {
  if (isGlobalState(state)) globalMode = state.mode;
});

document.addEventListener("pointerdown", handlePointerDown, true);
document.addEventListener("keydown", handleKeyDown, true);

chrome.runtime.onMessage.addListener((message: RuntimeMessage) => {
  if (message.type === "show_blocked") showBlockedToast(message);
  if (message.type === "global_mode_changed") globalMode = message.mode;
});

function handlePointerDown(event: PointerEvent): void {
  if (!event.isTrusted) return;
  const actionable = findActionable(event.composedPath());
  const overlay = overlayEvidence(event);
  const overlayHijack = overlay !== null && isHighConfidenceOverlay(overlay.evidence);
  const gesture = createGesture(event, actionable, overlayHijack);
  void sendMessage({ type: "record_gesture", gesture });

  if (globalMode === "paused" || !overlayHijack || overlay === null) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  suppressGeneratedClick(event.clientX, event.clientY);
  temporarilyBypass(overlay.element);
  void sendMessage({
    type: "overlay_prevented",
    sourceUrl: location.href,
    targetUrl: explicitDestination(actionable)
  });
}

function handleKeyDown(event: KeyboardEvent): void {
  if (!event.isTrusted || (event.key !== "Enter" && event.key !== " ")) return;
  const actionable = findActionable(event.composedPath());
  if (actionable === null) return;
  const gesture: GestureRecord = {
    occurredAt: Date.now(),
    sourceUrl: location.href,
    incognito: chrome.extension.inIncognitoContext,
    explicitDestination: explicitDestination(actionable),
    explicitNewTabIntent: event.ctrlKey || event.metaKey || event.shiftKey,
    semanticControl: true,
    overlayHijack: false
  };
  DIAGNOSTIC: if (__POPINTENT_DIAGNOSTIC__) {
    gesture.diagnostic = {
      inputType: "keyboard",
      targetKind: diagnosticTargetKind(actionable),
      topFrame: window === window.top
    };
  }
  void sendMessage({ type: "record_gesture", gesture });
}

function createGesture(
  event: PointerEvent,
  actionable: HTMLElement | null,
  overlayHijack: boolean
): GestureRecord {
  const gesture: GestureRecord = {
    occurredAt: Date.now(),
    sourceUrl: location.href,
    incognito: chrome.extension.inIncognitoContext,
    explicitDestination: explicitDestination(actionable),
    explicitNewTabIntent:
      event.button === 1 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      actionable?.getAttribute("target") === "_blank",
    semanticControl: actionable !== null,
    overlayHijack
  };
  DIAGNOSTIC: if (__POPINTENT_DIAGNOSTIC__) {
    gesture.diagnostic = {
      inputType: "pointer",
      targetKind: diagnosticTargetKind(actionable),
      topFrame: window === window.top,
      pointerButton: event.button
    };
  }
  return gesture;
}

function diagnosticTargetKind(
  element: HTMLElement | null
): NonNullable<GestureRecord["diagnostic"]>["targetKind"] {
  if (element === null) return "none";
  if (element instanceof HTMLAnchorElement || element instanceof HTMLAreaElement) return "anchor";
  if (element instanceof HTMLButtonElement) return "button";
  if (element instanceof HTMLInputElement) return "input";
  if (element.getAttribute("role") === "button") return "role_button";
  if (element.getAttribute("role") === "link") return "role_link";
  return "other";
}

function findActionable(path: EventTarget[]): HTMLElement | null {
  for (const target of path) {
    if (target instanceof HTMLElement && isActionable(target)) return target;
  }
  return null;
}

function isActionable(element: Element): element is HTMLElement {
  return element.matches(
    "a[href], area[href], button, input[type='button'], input[type='submit'], input[type='image'], [role='button'], [role='link']"
  );
}

function explicitDestination(element: HTMLElement | null): string | null {
  if (element instanceof HTMLAnchorElement || element instanceof HTMLAreaElement) return element.href;
  if (element instanceof HTMLButtonElement && element.form !== null) return element.formAction;
  if (element instanceof HTMLInputElement && element.form !== null) return element.formAction;
  return null;
}

function overlayEvidence(
  event: PointerEvent
): { evidence: OverlayEvidence; element: HTMLElement } | null {
  const pathElements = event.composedPath().filter((target): target is HTMLElement => target instanceof HTMLElement);
  const candidate = pathElements.find((element) => {
    const rect = element.getBoundingClientRect();
    return coverageRatio(rect) >= 0.6;
  });
  if (candidate === undefined) return null;

  const style = getComputedStyle(candidate);
  const stack = document.elementsFromPoint(event.clientX, event.clientY);
  const candidateIndex = stack.indexOf(candidate);
  const underlying = stack
    .slice(candidateIndex >= 0 ? candidateIndex + 1 : 1)
    .find((element) => !candidate.contains(element) && isActionable(element));
  const painted = hasVisiblePaint(candidate, style);

  return {
    element: candidate,
    evidence: {
      coverageRatio: coverageRatio(candidate.getBoundingClientRect()),
      positioning: style.position,
      opacity: Number.parseFloat(style.opacity || "1"),
      hasVisiblePaint: painted,
      hasUnderlyingAction: underlying !== undefined,
      isSemanticControl: isActionable(candidate) && painted
    }
  };
}

function coverageRatio(rect: DOMRect): number {
  const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);
  const visibleWidth = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
  const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
  return (visibleWidth * visibleHeight) / viewportArea;
}

function hasVisiblePaint(element: HTMLElement, style: CSSStyleDeclaration): boolean {
  if (["IMG", "VIDEO", "CANVAS", "SVG"].includes(element.tagName)) return true;
  if (style.backgroundImage !== "none" || style.boxShadow !== "none") return true;
  const backgroundAlpha = colorAlpha(style.backgroundColor);
  const borderWidth = [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth]
    .map((value) => Number.parseFloat(value) || 0)
    .reduce((total, value) => total + value, 0);
  return backgroundAlpha > 0.1 || borderWidth > 0;
}

function colorAlpha(color: string): number {
  if (color === "transparent") return 0;
  const match = color.match(/rgba?\((?:[^,]+,){3}\s*([\d.]+)\s*\)/i);
  if (match?.[1] !== undefined) return Number.parseFloat(match[1]);
  return color.startsWith("rgb(") ? 1 : 0;
}

function suppressGeneratedClick(x: number, y: number): void {
  const expiresAt = Date.now() + 600;
  const listener = (event: MouseEvent) => {
    if (Date.now() > expiresAt) return;
    if (Math.abs(event.clientX - x) > 4 || Math.abs(event.clientY - y) > 4) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.removeEventListener("click", listener, true);
  };
  document.addEventListener("click", listener, true);
  setTimeout(() => document.removeEventListener("click", listener, true), 650);
}

function temporarilyBypass(element: HTMLElement): void {
  const previous = element.style.pointerEvents;
  element.style.setProperty("pointer-events", "none", "important");
  setTimeout(() => {
    if (previous) element.style.pointerEvents = previous;
    else element.style.removeProperty("pointer-events");
  }, 2_000);
}

function showBlockedToast(message: Extract<RuntimeMessage, { type: "show_blocked" }>): void {
  if (window !== window.top) return;
  const actions: Array<{ label: string; run: () => void }> = [];
  if (message.undoAvailable) {
    actions.push({
      label: "Open anyway",
      run: () => void sendMessage({ type: "open_once", eventId: message.event.id })
    });
  }
  actions.push({
    label: "Pause everywhere",
    run: () => void sendMessage({ type: "set_global_mode", mode: "paused" })
  });
  actions.push({
    label: "Incorrect block",
    run: () => void sendMessage({ type: "mark_event", eventId: message.event.id, verdict: "false_positive" })
  });
  const text =
    message.event.action === "prevented_click"
      ? "PopIntent blocked a transparent layer. Click again to use the control underneath."
      : message.event.action === "prevented_navigation"
        ? "PopIntent stopped an unexpected same-tab redirect."
        : `PopIntent closed an unexpected tab (${message.event.reason}).`;
  showNotice(text, actions);
}

function showNotice(
  text: string,
  actions: Array<{ label: string; run: () => void }> = []
): void {
  if (window !== window.top) return;
  document.getElementById("popintent-notice-host")?.remove();
  const host = document.createElement("div");
  host.id = "popintent-notice-host";
  host.style.cssText = "all:initial;position:fixed;right:16px;bottom:16px;z-index:2147483647";
  const root = host.attachShadow({ mode: "closed" });
  const panel = document.createElement("div");
  panel.setAttribute("role", "status");
  panel.style.cssText =
    "font:14px/1.4 system-ui,sans-serif;max-width:360px;color:#fff;background:#17202a;border:1px solid #475467;border-radius:10px;padding:12px;box-shadow:0 8px 24px #0005";
  const message = document.createElement("div");
  message.textContent = text;
  panel.append(message);
  if (actions.length > 0) {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:10px";
    for (const action of actions) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      button.style.cssText =
        "font:600 12px system-ui,sans-serif;color:#17202a;background:#fff;border:0;border-radius:6px;padding:6px 8px;cursor:pointer";
      button.addEventListener("click", () => {
        action.run();
        host.remove();
      });
      row.append(button);
    }
    panel.append(row);
  }
  root.append(panel);
  document.documentElement.append(host);
  setTimeout(() => host.remove(), actions.length > 0 ? 10_000 : 4_000);
}

function isGlobalState(value: unknown): value is { mode: typeof globalMode } {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Record<string, unknown>;
  return state.mode === "default" || state.mode === "paused" || state.mode === "strict";
}

async function sendMessage(message: RuntimeMessage): Promise<unknown> {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch {
    return null;
  }
}
