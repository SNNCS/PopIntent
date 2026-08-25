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

test("closes an unproven button popup when the source site is strict", async ({
  context,
  extensionId
}) => {
  const controls = context.pages()[0] ?? (await context.newPage());
  await controls.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await controls.evaluate(() =>
    chrome.runtime.sendMessage({
      type: "set_site_mode",
      sourceUrl: "http://127.0.0.1:4173/script-popup",
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

test("allows mismatched targets while protection is globally disabled", async ({
  context,
  extensionId
}) => {
  const controls = context.pages()[0] ?? (await context.newPage());
  await controls.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await controls.evaluate(() =>
    chrome.runtime.sendMessage({ type: "set_global_enabled", enabled: false })
  );

  const page = await context.newPage();
  await page.goto("/target-mismatch");
  await page.locator("#trick").click();

  await expect.poll(() => context.pages().length).toBe(3);
  await expect(context.pages().at(-1)!).toHaveURL(/\/ad$/);
});

test("allows mismatched targets on a paused site", async ({ context, extensionId }) => {
  const controls = context.pages()[0] ?? (await context.newPage());
  await controls.goto(`chrome-extension://${extensionId}/ui/options.html`);
  await controls.evaluate(() =>
    chrome.runtime.sendMessage({
      type: "set_site_mode",
      sourceUrl: "http://127.0.0.1:4173/target-mismatch",
      mode: "paused"
    })
  );

  const page = await context.newPage();
  await page.goto("/target-mismatch");
  await page.locator("#trick").click();

  await expect.poll(() => context.pages().length).toBe(3);
  await expect(context.pages().at(-1)!).toHaveURL(/\/ad$/);
});

test("prevents an overlay inside an iframe and notifies the top page", async ({ context }) => {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("/iframe-overlay");
  await page.frameLocator("#player").locator("#overlay").click();

  await expect.poll(() => context.pages().length).toBe(1);
  await expect(page.locator("#popintent-notice-host")).toBeAttached();
});
