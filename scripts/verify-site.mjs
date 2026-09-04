import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteRoot = path.join(projectRoot, "site");
const files = await walk(siteRoot);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const forbidden = [/google-analytics/i, /googletagmanager/i, /segment\.com/i, /<script[^>]+src=["']https?:/i];

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(html)) throw new Error(`Tracking or remote script pattern in ${path.relative(siteRoot, file)}`);
  }
  for (const match of html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      throw new Error(`Invalid JSON-LD in ${path.relative(siteRoot, file)}`, { cause: error });
    }
  }
  for (const match of html.matchAll(/(?:href|src)=["']([^"'#?]+)["']/g)) {
    const reference = match[1];
    if (/^(?:https?:|mailto:|javascript:)/.test(reference)) continue;
    const target = reference.endsWith("/")
      ? path.join(path.dirname(file), reference, "index.html")
      : path.resolve(path.dirname(file), reference);
    await access(target).catch(() => {
      throw new Error(`Broken local reference ${reference} in ${path.relative(siteRoot, file)}`);
    });
  }
}

for (const required of [
  "index.html",
  "test/index.html",
  "test/test.js",
  "guides/edge-opens-random-tabs/index.html",
  "guides/stop-redirects-in-edge/index.html",
  "dbddff1968f647eb84acee9eaa958058.txt",
  "robots.txt",
  "sitemap.xml",
  "assets/logo.svg",
  "assets/og.png"
]) {
  await access(path.join(siteRoot, required));
}

console.log(`Verified ${htmlFiles.length} HTML pages and ${files.length} public site files.`);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  }));
  return nested.flat();
}
