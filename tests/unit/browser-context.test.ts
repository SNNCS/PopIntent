import { describe, expect, it } from "vitest";

import { allowsPersistentData, stampBrowserTabContext } from "../../src/core/browser-context";

describe("allowsPersistentData", () => {
  it("fails closed when the browser-owned tab context is unavailable", () => {
    expect(allowsPersistentData(undefined)).toBe(false);
    expect(allowsPersistentData({})).toBe(false);
  });

  it("allows persistence only for a browser-confirmed normal tab", () => {
    expect(allowsPersistentData({ incognito: false })).toBe(true);
    expect(allowsPersistentData({ incognito: true })).toBe(false);
  });

  it("overrides a client-supplied private-context value with browser tab metadata", () => {
    const untrusted = { sourceUrl: "https://example.test", incognito: false };

    expect(stampBrowserTabContext(untrusted, { incognito: true })).toEqual({
      sourceUrl: "https://example.test",
      incognito: true
    });
    expect(stampBrowserTabContext(untrusted, undefined).incognito).toBe(true);
  });
});
