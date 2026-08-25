const KNOWN_REDIRECTOR_DOMAINS: readonly string[] = [];

export function isKnownRedirector(value: string): boolean {
  try {
    const host = new URL(value).hostname;
    return KNOWN_REDIRECTOR_DOMAINS.some(
      (domain) => host === domain || host.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}
