export function domainFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.hostname : null;
  } catch {
    return null;
  }
}

export function isSafeHttpUrl(value: string): boolean {
  return domainFromUrl(value) !== null;
}
