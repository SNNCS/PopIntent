import path from "node:path";

import { chromium, test as base, type BrowserContext } from "@playwright/test";

export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  context: async ({}, use) => {
    const extensionPath = path.resolve(process.env.POPINTENT_EXTENSION_PATH ?? "dist");
    const browserChannel = process.env.POPINTENT_BROWSER_CHANNEL === "msedge" ? "msedge" : "chromium";
    const context = await chromium.launchPersistentContext("", {
      channel: browserChannel,
      headless: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent("serviceworker");
    await use(new URL(worker.url()).hostname);
  }
});

export const expect = test.expect;
