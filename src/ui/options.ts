import type { OptionsState, RuntimeMessage } from "../shared/contracts";

const eventsBody = document.querySelector<HTMLTableSectionElement>("#events-body")!;
const mode = document.querySelector<HTMLElement>("#global-mode")!;
const counters = document.querySelector<HTMLElement>("#counters")!;
const clear = document.querySelector<HTMLButtonElement>("#clear-history")!;
const exportButton = document.querySelector<HTMLButtonElement>("#export-summary")!;

void refresh();

DIAGNOSTIC: if (__POPINTENT_DIAGNOSTIC__) setupDiagnosticSection();

clear.addEventListener("click", async () => {
  await send({ type: "clear_history" });
  await refresh();
});

exportButton.addEventListener("click", async () => {
  const summary = await send({ type: "export_summary", browser: navigator.userAgent });
  downloadJson(`popintent-validation-${new Date().toISOString().slice(0, 10)}.json`, summary);
});

function setupDiagnosticSection(): void {
  const main = document.querySelector<HTMLElement>("main")!;
  const section = document.createElement("section");
  const heading = document.createElement("h2");
  const explanation = document.createElement("p");
  const actions = document.createElement("div");
  const exportDiagnostic = document.createElement("button");
  const clearDiagnostic = document.createElement("button");
  const feedback = document.createElement("p");

  heading.textContent = "Diagnostic trace";
  explanation.textContent =
    "Tracing is active for this diagnostic build. It follows a gesture's tab and child tabs for 30 seconds and keeps at most 500 domain-only events for 24 hours. Unrelated tabs, full URLs, and private browsing activity are not stored, and nothing is uploaded.";
  actions.className = "actions";
  exportDiagnostic.type = "button";
  exportDiagnostic.textContent = "Export diagnostic trace";
  clearDiagnostic.type = "button";
  clearDiagnostic.className = "danger";
  clearDiagnostic.textContent = "Clear diagnostic trace";
  feedback.className = "feedback";

  exportDiagnostic.addEventListener("click", async () => {
    const trace = await send({ type: "export_diagnostic_trace", browser: navigator.userAgent });
    const timestamp = new Date().toISOString().replaceAll(":", "-").replace(".", "-");
    downloadJson(`popintent-diagnostic-${timestamp}.json`, trace);
    feedback.textContent = "Diagnostic trace exported locally.";
  });

  clearDiagnostic.addEventListener("click", async () => {
    await send({ type: "clear_diagnostic_trace" });
    feedback.textContent = "Diagnostic trace cleared.";
  });

  actions.append(exportDiagnostic, clearDiagnostic);
  section.append(heading, explanation, actions, feedback);
  main.append(section);
}

function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function refresh(): Promise<void> {
  const state = (await send({ type: "get_options_state" })) as OptionsState;
  eventsBody.replaceChildren(
    ...state.events.map((event) => {
      const row = document.createElement("tr");
      for (const value of [
        new Date(event.occurredAt).toLocaleString(),
        event.sourceDomain,
        event.targetDomain,
        event.reason,
        event.verdict
      ]) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      }
      return row;
    })
  );
  mode.textContent = `Current mode: ${state.settings.mode}`;
  counters.textContent = [
    `Blocked navigations: ${state.counters.blockedNavigations}`,
    `Marked incorrect: ${state.counters.incorrectBlocks}`,
    `Missed redirects: ${state.counters.missedRedirects}`,
    `Intentional new tabs observed: ${state.counters.intentionalNewTabs}`,
    `Opened anyway: ${state.counters.openedAnyway}`,
    `Transparent overlays prevented: ${state.counters.overlayPrevented}`
  ].join(" · ");
}

async function send(message: RuntimeMessage): Promise<unknown> {
  return chrome.runtime.sendMessage(message);
}
