import { expect, test } from "./extension-fixture";

test("uses one protection mode selector for all sites", async ({ context, extensionId }) => {
  const popup = context.pages()[0] ?? (await context.newPage());
  await popup.goto(`chrome-extension://${extensionId}/ui/popup.html`);

  await expect(popup.getByText("Protection mode · all sites")).toBeVisible();
  await expect(popup.locator("#global-enabled, #site-mode")).toHaveCount(0);
  await popup.locator("#global-mode").selectOption("strict");

  await expect
    .poll(() =>
      popup.evaluate(async () => {
        const state = await chrome.runtime.sendMessage({ type: "get_options_state" });
        return state.settings.mode;
      })
    )
    .toBe("strict");
});
