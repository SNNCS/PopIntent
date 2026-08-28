import { describe, expect, it } from "vitest";

import { isIncognitoExtensionContext } from "../../src/core/browser-context";

describe("isIncognitoExtensionContext", () => {
  it("defaults to a normal context when the legacy extension API is unavailable", () => {
    expect(isIncognitoExtensionContext(undefined)).toBe(false);
  });

  it("returns the browser-provided incognito state", () => {
    expect(isIncognitoExtensionContext({ inIncognitoContext: false })).toBe(false);
    expect(isIncognitoExtensionContext({ inIncognitoContext: true })).toBe(true);
  });
});
