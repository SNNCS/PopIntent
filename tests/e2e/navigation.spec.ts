import { expect, test } from "./extension-fixture";

test("closes a child tab when its destination contradicts the clicked link", async ({
  context,
  extensionId
}) => {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("/target-mismatch");
  await page.locator("#trick").click();

  await expect.poll(() => context.pages().length).toBe(1);

  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await expect(options.locator("#events-body")).toContainText("target_mismatch");
  await expect
    .poll(() =>
      options.evaluate(async () => {
        const state = await chrome.runtime.sendMessage({ type: "get_options_state" });
        return state.counters.blockedNavigations;
      })
    )
    .toBe(1);
});

test("allows an intentional new-tab link", async ({ context }) => {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("/intentional");
  await page.locator("#legitimate-link").click();

  await expect.poll(() => context.pages().length).toBe(2);
  await expect(context.pages()[1]!).toHaveURL(/\/legitimate$/);
});

test("prevents a transparent full-screen overlay before it opens a tab", async ({
  context,
  extensionId
}) => {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("/overlay");
  await page.locator("#overlay").click();

  await expect.poll(() => context.pages().length).toBe(1);

  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await expect(options.locator("#events-body")).toContainText("overlay_hijack");
});

test("allows a visible script-driven button popup in default mode", async ({ context }) => {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("/script-popup");
  await page.locator("#oauth").click();

  await expect.poll(() => context.pages().length).toBe(2);
  await expect(context.pages()[1]!).toHaveURL(/\/ad$/);
});

test("closes an unproven button popup in global Strict mode", async ({
  context,
  extensionId
}) => {
  const controls = context.pages()[0] ?? (await context.newPage());
  await controls.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await controls.evaluate(() =>
    chrome.runtime.sendMessage({
      type: "set_global_mode",
      mode: "strict"
    })
  );
  await controls.close();

  const page = await context.newPage();
  await page.goto("/script-popup");
  await page.locator("#oauth").click();
  await expect.poll(() => context.pages().length).toBe(1);

  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await expect(options.locator("#events-body")).toContainText("strict_unproven");
});

test("applies global Strict mode to a popup from a cross-origin iframe", async ({
  context,
  extensionId
}) => {
  const controls = context.pages()[0] ?? (await context.newPage());
  await controls.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await controls.evaluate(() =>
    chrome.runtime.sendMessage({
      type: "set_global_mode",
      mode: "strict"
    })
  );
  await controls.close();

  const page = await context.newPage();
  await page.goto("/cross-origin-iframe-popup");
  await page.frameLocator("#player").locator("#oauth").click();
  await page.waitForTimeout(750);
  expect(context.pages()).toHaveLength(1);

  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await expect(options.locator("#events-body")).toContainText("strict_unproven");
});

test("applies global Paused mode inside a cross-origin iframe", async ({
  context,
  extensionId
}) => {
  const controls = context.pages()[0] ?? (await context.newPage());
  await controls.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await controls.evaluate(() =>
    chrome.runtime.sendMessage({
      type: "set_global_mode",
      mode: "paused"
    })
  );
  await controls.close();

  const page = await context.newPage();
  await page.goto("/cross-origin-iframe-overlay");
  const opened = context.waitForEvent("page");
  await page.frameLocator("#player").locator("#overlay").click();

  await expect(await opened).toHaveURL("http://localhost:4173/ad");
});

test("waits for an about:blank child and closes its mismatched committed URL", async ({
  context,
  extensionId
}) => {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("/about-blank-mismatch");
  await page.locator("#deferred").click();

  await expect.poll(() => context.pages().length).toBe(1);
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await expect(options.locator("#events-body")).toContainText("target_mismatch");
});

test("opens a recently blocked destination once when the user asks", async ({
  context,
  extensionId
}) => {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("/target-mismatch");
  await page.locator("#trick").click();
  await expect.poll(() => context.pages().length).toBe(1);

  const controls = await context.newPage();
  await controls.goto(`chrome-extension://${extensionId}/ui/options.html`);
  const eventId = await controls.evaluate(async () => {
    const state = await chrome.runtime.sendMessage({ type: "get_options_state" });
    return state.events[0].id;
  });
  const opened = context.waitForEvent("page");
  await controls.evaluate((id) => chrome.runtime.sendMessage({ type: "open_once", eventId: id }), eventId);

  await expect(await opened).toHaveURL(/\/ad$/);
});

test("allows mismatched targets in global Paused mode", async ({
  context,
  extensionId
}) => {
  const controls = context.pages()[0] ?? (await context.newPage());
  await controls.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await controls.evaluate(() =>
    chrome.runtime.sendMessage({ type: "set_global_mode", mode: "paused" })
  );

  const page = await context.newPage();
  await page.goto("/target-mismatch");
  await page.locator("#trick").click();

  await expect.poll(() => context.pages().length).toBe(3);
  await expect(context.pages().at(-1)!).toHaveURL(/\/ad$/);
});

test("broadcasts a global mode change to an already-open page", async ({ context, extensionId }) => {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("/overlay");

  const controls = await context.newPage();
  await controls.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await controls.evaluate(() =>
    chrome.runtime.sendMessage({
      type: "set_global_mode",
      mode: "paused"
    })
  );
  await controls.close();

  const opened = context.waitForEvent("page");
  await page.locator("#overlay").click();

  await expect(await opened).toHaveURL(/\/ad$/);
});

test("prevents an overlay inside an iframe and notifies the top page", async ({ context }) => {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("/iframe-overlay");
  await page.frameLocator("#player").locator("#overlay").click();

  await expect.poll(() => context.pages().length).toBe(1);
  await expect(page.locator("#popintent-notice-host")).toBeAttached();
});

test("blocks a delayed third-party same-tab redirect after high-confidence abuse in Strict mode", async ({
  context,
  extensionId
}) => {
  const controls = context.pages()[0] ?? (await context.newPage());
  await controls.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await controls.evaluate(() =>
    chrome.runtime.sendMessage({
      type: "set_global_mode",
      mode: "strict"
    })
  );
  await controls.close();

  const page = await context.newPage();
  await page.goto("/same-tab-guard-source");
  await page.locator("#abuse").click();
  await page.waitForTimeout(250);
  expect(context.pages()).toHaveLength(1);

  await page.locator("#continue").click();
  await expect(page).toHaveURL(/\/same-tab-guarded-landing$/);
  await page.waitForTimeout(1_000);
  await expect(page).toHaveURL(/\/same-tab-guarded-landing$/);
  await expect(page.locator("#popintent-notice-host")).toBeAttached();

  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await expect(options.locator("#events-body")).toContainText("same_tab_redirect");
  const eventId = await options.evaluate(async () => {
    const state = await chrome.runtime.sendMessage({ type: "get_options_state" });
    return state.events[0].id;
  });
  await options.evaluate((id) => chrome.runtime.sendMessage({ type: "open_once", eventId: id }), eventId);
  await expect(page).toHaveURL("http://localhost:4173/ad");
});

test("arms the same-tab guard before a fast destination can redirect", async ({ context, extensionId }) => {
  const controls = context.pages()[0] ?? (await context.newPage());
  await controls.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await controls.evaluate(() => chrome.runtime.sendMessage({ type: "set_global_mode", mode: "strict" }));
  await controls.close();

  const page = await context.newPage();
  await page.goto("/same-tab-guard-source");
  await page.locator("#abuse").click();
  await page.waitForTimeout(250);
  expect(context.pages()).toHaveLength(1);

  await page.locator("#continue-fast").click();
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/same-tab-guard-source$/);
  await expect(page.locator("#popintent-notice-host")).toBeAttached();
});

test("allows the same delayed redirect when there is no prior abuse evidence", async ({ context, extensionId }) => {
  const controls = context.pages()[0] ?? (await context.newPage());
  await controls.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await controls.evaluate(() => chrome.runtime.sendMessage({ type: "set_global_mode", mode: "strict" }));
  await controls.close();

  const page = await context.newPage();
  await page.goto("/same-tab-plain-source");
  await page.locator("#continue").click();
  await expect(page).toHaveURL("http://localhost:4173/ad");
});

test("allows a user-initiated third-party navigation while the same-tab guard is active", async ({
  context,
  extensionId
}) => {
  const controls = context.pages()[0] ?? (await context.newPage());
  await controls.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await controls.evaluate(() => chrome.runtime.sendMessage({ type: "set_global_mode", mode: "strict" }));
  await controls.close();

  const page = await context.newPage();
  await page.goto("/same-tab-guard-source");
  await page.locator("#abuse").click();
  await page.waitForTimeout(250);
  await page.locator("#continue-user").click();
  await expect(page).toHaveURL(/\/same-tab-user-landing$/);
  await page.locator("#external").click();
  await expect(page).toHaveURL("http://localhost:4173/legitimate");
});

test("allows a first-party automatic navigation while the same-tab guard is active", async ({
  context,
  extensionId
}) => {
  const controls = context.pages()[0] ?? (await context.newPage());
  await controls.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await controls.evaluate(() => chrome.runtime.sendMessage({ type: "set_global_mode", mode: "strict" }));
  await controls.close();

  const page = await context.newPage();
  await page.goto("/same-tab-guard-source");
  await page.locator("#abuse").click();
  await page.waitForTimeout(250);
  await page.locator("#continue-first-party").click();
  await expect(page).toHaveURL(/\/legitimate$/);
});

test("does not treat an ambiguous semantic Strict popup as high-confidence abuse", async ({
  context,
  extensionId
}) => {
  const controls = context.pages()[0] ?? (await context.newPage());
  await controls.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await controls.evaluate(() => chrome.runtime.sendMessage({ type: "set_global_mode", mode: "strict" }));
  await controls.close();

  const page = await context.newPage();
  await page.goto("/script-popup");
  await page.locator("#oauth").click();
  await page.waitForTimeout(250);
  expect(context.pages()).toHaveLength(1);
  await page.evaluate(() => {
    const link = document.createElement("a");
    link.id = "continue";
    link.href = "/same-tab-guarded-landing";
    link.textContent = "Continue";
    document.body.append(link);
  });
  await page.locator("#continue").click();
  await expect(page).toHaveURL("http://localhost:4173/ad");
});

test("expires the same-tab guard before a later automatic navigation", async ({
  context,
  extensionId
}) => {
  const controls = context.pages()[0] ?? (await context.newPage());
  await controls.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await controls.evaluate(() => chrome.runtime.sendMessage({ type: "set_global_mode", mode: "strict" }));
  await controls.close();

  const page = await context.newPage();
  await page.goto("/same-tab-guard-source");
  await page.locator("#abuse").click();
  await page.waitForTimeout(250);
  await page.locator("#continue-user").click();
  await expect(page).toHaveURL(/\/same-tab-user-landing$/);
  await page.waitForTimeout(3_250);
  await page.evaluate(() => {
    location.href = "http://localhost:4173/legitimate";
  });
  await expect(page).toHaveURL("http://localhost:4173/legitimate");
});

test("clears an active same-tab guard when protection is Paused", async ({ context, extensionId }) => {
  const controls = context.pages()[0] ?? (await context.newPage());
  await controls.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await controls.evaluate(() => chrome.runtime.sendMessage({ type: "set_global_mode", mode: "strict" }));
  await controls.close();

  const page = await context.newPage();
  await page.goto("/same-tab-guard-source");
  await page.locator("#abuse").click();
  await page.waitForTimeout(250);
  await page.locator("#continue-user").click();
  await expect(page).toHaveURL(/\/same-tab-user-landing$/);

  const settings = await context.newPage();
  await settings.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await settings.evaluate(() => chrome.runtime.sendMessage({ type: "set_global_mode", mode: "paused" }));
  await settings.close();
  await page.evaluate(() => {
    location.href = "http://localhost:4173/legitimate";
  });
  await expect(page).toHaveURL("http://localhost:4173/legitimate");
});
