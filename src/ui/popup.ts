import type { RuntimeMessage, UiState } from "../shared/contracts";

const domain = document.querySelector<HTMLElement>("#domain")!;
const globalMode = document.querySelector<HTMLSelectElement>("#global-mode")!;
const recent = document.querySelector<HTMLElement>("#recent")!;
const openOnce = document.querySelector<HTMLButtonElement>("#open-once")!;
const markIncorrect = document.querySelector<HTMLButtonElement>("#mark-incorrect")!;
const reportMissed = document.querySelector<HTMLButtonElement>("#report-missed")!;
const options = document.querySelector<HTMLButtonElement>("#open-options")!;
const feedback = document.querySelector<HTMLElement>("#feedback")!;

let sourceUrl = "";
let state: UiState | null = null;

void refresh();

globalMode.addEventListener("change", async () => {
  await send({ type: "set_global_mode", mode: globalMode.value as UiState["mode"] });
  await refresh();
});

openOnce.addEventListener("click", async () => {
  if (state?.lastEvent === null || state?.lastEvent === undefined) return;
  await send({ type: "open_once", eventId: state.lastEvent.id });
  window.close();
});

markIncorrect.addEventListener("click", async () => {
  if (state?.lastEvent === null || state?.lastEvent === undefined) return;
  await send({ type: "mark_event", eventId: state.lastEvent.id, verdict: "false_positive" });
  showFeedback("Marked as an incorrect block.");
  await refresh();
});

reportMissed.addEventListener("click", async () => {
  await send({ type: "report_missed" });
  showFeedback("Missed redirect recorded locally.");
});

options.addEventListener("click", () => void chrome.runtime.openOptionsPage());

async function refresh(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  sourceUrl = tab?.url ?? "";
  state = (await send({ type: "get_ui_state", sourceUrl })) as UiState;
  domain.textContent = state.domain ?? "Unsupported page";
  globalMode.value = state.mode;
  if (state.lastEvent === null) {
    recent.textContent = "No recent blocks on this site.";
    openOnce.hidden = true;
    markIncorrect.hidden = true;
  } else {
    recent.textContent = `${state.lastEvent.targetDomain} · ${state.lastEvent.reason}`;
    openOnce.hidden = !state.undoAvailable;
    markIncorrect.hidden = false;
  }
}

function showFeedback(text: string): void {
  feedback.textContent = text;
  setTimeout(() => (feedback.textContent = ""), 2_000);
}

async function send(message: RuntimeMessage): Promise<unknown> {
  return chrome.runtime.sendMessage(message);
}
