export interface BrowserTabContextLike {
  incognito?: boolean;
}

/**
 * Persistent data is allowed only when the browser explicitly identifies the
 * sender tab as non-incognito. Unknown context fails closed.
 */
export function allowsPersistentData(context: BrowserTabContextLike | undefined): boolean {
  return context?.incognito === false;
}

export function stampBrowserTabContext<T extends object>(
  value: T,
  context: BrowserTabContextLike | undefined
): Omit<T, "incognito"> & { incognito: boolean } {
  return {
    ...value,
    incognito: !allowsPersistentData(context)
  };
}
