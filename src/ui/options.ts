import type { OptionsState, RuntimeMessage } from "../shared/contracts";

const eventsBody = document.querySelector<HTMLTableSectionElement>("#events-body")!;
const sites = document.querySelector<HTMLElement>("#sites")!;
const counters = document.querySelector<HTMLElement>("#counters")!;
const clear = document.querySelector<HTMLButtonElement>("#clear-history")!;
const exportButton = document.querySelector<HTMLButtonElement>("#export-summary")!;

void refresh();

clear.addEventListener("click", async () => {
  await send({ type: "clear_history" });
  await refresh();
});

exportButton.addEventListener("click", async () => {
  const summary = await send({ type: "export_summary", browser: navigator.userAgent });
  const blob = new Blob([`${JSON.stringify(summary, null, 2)}\n`], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `popintent-validation-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

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
  sites.replaceChildren(
    ...Object.entries(state.settings.siteModes).map(([hostname, mode]) => {
      const item = document.createElement("li");
      item.textContent = `${hostname}: ${mode}`;
      return item;
    })
  );
  if (state.settings.siteModes && Object.keys(state.settings.siteModes).length === 0) {
    sites.textContent = "No site overrides.";
  }
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
