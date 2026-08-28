import { expect, test } from "./diagnostic-extension-fixture";

test("captures and exports a domain-only missed-navigation trace", async ({
  context,
  extensionId
}) => {
  const options = context.pages()[0] ?? (await context.newPage());
  await options.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await expect(options.getByRole("heading", { name: "Diagnostic trace" })).toBeVisible();
  await expect(options.getByRole("button", { name: "Export diagnostic trace" })).toBeVisible();
  await options.evaluate(() => chrome.runtime.sendMessage({ type: "clear_diagnostic_trace" }));

  const page = await context.newPage();
  await page.goto("/target-mismatch");
  const traceBeforeGesture = await options.evaluate(() =>
    chrome.runtime.sendMessage({ type: "export_diagnostic_trace", browser: "diagnostic-e2e" })
  );
  expect(traceBeforeGesture.events).toEqual([]);
  await page.locator("#trick").click();
  await expect.poll(() => context.pages().filter((candidate) => candidate !== options).length).toBe(1);

  const exportTrace = () =>
    options.evaluate(() =>
      chrome.runtime.sendMessage({ type: "export_diagnostic_trace", browser: "diagnostic-e2e" })
    );
  await expect
    .poll(async () => (await exportTrace()).events.map((event: { kind: string }) => event.kind))
    .toEqual(expect.arrayContaining(["gesture", "navigation_target_created", "classifier_decision"]));

  const trace = await exportTrace();
  expect(trace).toMatchObject({
    schemaVersion: 1,
    build: "diagnostic",
    privacy: {
      fullUrlsStored: false,
      incognitoStored: false,
      networkTransmission: false
    }
  });
  expect(trace.events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: "classifier_decision",
        sourceDomain: "127.0.0.1",
        targetDomain: "127.0.0.1",
        classifierAction: "close_tab"
      })
    ])
  );
  expect(JSON.stringify(trace)).not.toContain("http://");
  expect(JSON.stringify(trace)).not.toContain("target-mismatch");
});

test("records a blocked high-confidence same-tab redirect without full URLs", async ({
  context,
  extensionId
}) => {
  const options = context.pages()[0] ?? (await context.newPage());
  await options.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await options.evaluate(async () => {
    await chrome.runtime.sendMessage({ type: "clear_diagnostic_trace" });
    await chrome.runtime.sendMessage({ type: "set_global_mode", mode: "strict" });
  });

  const page = await context.newPage();
  await page.goto("/same-tab-guard-source");
  await page.locator("#abuse").click();
  await page.waitForTimeout(250);
  await page.locator("#continue").click();
  await expect(page).toHaveURL(/\/same-tab-guarded-landing$/);

  const exportTrace = () =>
    options.evaluate(() =>
      chrome.runtime.sendMessage({ type: "export_diagnostic_trace", browser: "diagnostic-e2e" })
    );
  await expect
    .poll(async () => (await exportTrace()).events.map((event: { kind: string }) => event.kind))
    .toContain("same_tab_redirect_blocked");

  const trace = await exportTrace();
  expect(trace.events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: "same_tab_redirect_blocked",
        sourceDomain: "127.0.0.1",
        targetDomain: "localhost",
        classifierAction: "block_navigation",
        classifierReason: "same_tab_redirect"
      })
    ])
  );
  expect(JSON.stringify(trace)).not.toContain("http://");
  expect(JSON.stringify(trace)).not.toContain("same-tab-guarded-landing");
});
