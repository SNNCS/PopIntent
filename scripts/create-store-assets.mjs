import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "@playwright/test";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconDir = path.join(projectRoot, "extension", "icons");
const storeDir = path.join(projectRoot, "store-assets");
await Promise.all([mkdir(iconDir, { recursive: true }), mkdir(storeDir, { recursive: true })]);

const browser = await chromium.launch({ headless: true });
try {
  for (const size of [16, 32, 48, 128]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(iconMarkup(size));
    await page.screenshot({ path: path.join(iconDir, `icon-${size}.png`), omitBackground: true });
    await page.close();
  }

  const edgeLogo = await browser.newPage({ viewport: { width: 300, height: 300 } });
  await edgeLogo.setContent(iconMarkup(300));
  await edgeLogo.screenshot({ path: path.join(storeDir, "edge-logo-300x300.png"), omitBackground: true });
  await edgeLogo.close();

  const promo = await browser.newPage({ viewport: { width: 440, height: 280 } });
  await promo.setContent(promoMarkup());
  await promo.screenshot({ path: path.join(storeDir, "small-promo-440x280.png") });
  await promo.close();

  const screenshot = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await screenshot.goto(pathToFileURL(path.join(projectRoot, "extension", "ui", "options.html")).href);
  await screenshot.evaluate(() => {
    const counters = document.querySelector("#counters");
    const mode = document.querySelector("#global-mode");
    const events = document.querySelector("#events-body");
    if (counters) counters.textContent = "12 blocked navigations · 1 opened anyway · 0 missed redirects";
    if (mode) mode.textContent = "Strict protection is active for all sites.";
    if (events) {
      events.innerHTML = `
        <tr><td>Just now</td><td>reader.example</td><td>unrelated.example</td><td>same_tab_redirect</td><td>Not reviewed</td></tr>
        <tr><td>2 minutes ago</td><td>video.example</td><td>popup.example</td><td>target_mismatch</td><td>Correct block</td></tr>`;
    }
  });
  await screenshot.screenshot({ path: path.join(storeDir, "settings-1280x800.png") });
  await screenshot.close();
} finally {
  await browser.close();
}

console.log(`Created extension icons in ${iconDir} and listing graphics in ${storeDir}.`);

function iconMarkup(size) {
  return `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;background:transparent">
    <svg width="${size}" height="${size}" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" aria-label="PopIntent shield">
      <rect x="16" y="16" width="96" height="96" rx="26" fill="#155eef"/>
      <path d="M64 31 92 42v21c0 19-10 32-28 42-18-10-28-23-28-42V42l28-11Z" fill="#fff"/>
      <rect x="48" y="49" width="32" height="24" rx="5" fill="none" stroke="#155eef" stroke-width="7"/>
      <path d="m48 83 32-32" stroke="#155eef" stroke-width="7" stroke-linecap="round"/>
    </svg></body></html>`;
}

function promoMarkup() {
  return `<!doctype html><html><body style="margin:0;width:440px;height:280px;overflow:hidden;font-family:Arial,sans-serif;background:linear-gradient(135deg,#102a73,#155eef);color:white">
    <div style="display:flex;height:100%;align-items:center;padding:36px;gap:26px;box-sizing:border-box">
      <div style="width:128px;height:128px;flex:none">${iconMarkup(128).match(/<svg[\s\S]*<\/svg>/)[0]}</div>
      <div><div style="font-size:32px;font-weight:750;letter-spacing:-1px">PopIntent</div><div style="display:inline-block;margin:8px 0 14px;padding:4px 9px;border:1px solid #b2ccff;border-radius:999px;font-size:13px;font-weight:700">BETA</div><div style="max-width:200px;font-size:18px;line-height:1.35;color:#eaf1ff">Keep the click you intended.</div></div>
    </div></body></html>`;
}
