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

  const popup = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await popup.goto(pathToFileURL(path.join(projectRoot, "extension", "ui", "popup.html")).href);
  await popup.addStyleTag({
    content: `
      html { min-height: 100%; background: linear-gradient(135deg, #edf3ff, #f8fafc 48%, #dce8ff); }
      body.popup { margin: 84px auto 0; border: 1px solid #b8c4d8; border-radius: 14px; background: #f8fafc;
        box-shadow: 0 28px 80px #18376b33; }
      body.popup::before { content: "Keep the click you intended."; position: fixed; left: 80px; top: 300px;
        width: 380px; color: #102a73; font: 750 44px/1.05 system-ui, sans-serif; letter-spacing: -2px; }
      body.popup::after { content: "Local-first popup protection for Microsoft Edge"; position: fixed;
        left: 82px; top: 410px; width: 330px; color: #475467; font: 17px/1.5 system-ui, sans-serif; }
    `
  });
  await popup.evaluate(() => {
    document.querySelector("#domain").textContent = "video.example";
    document.querySelector("#global-mode").value = "default";
    document.querySelector("#recent").textContent = "popup.example · target_mismatch";
    document.querySelector("#open-once").hidden = false;
    document.querySelector("#mark-incorrect").hidden = false;
  });
  await popup.screenshot({ path: path.join(storeDir, "popup-protection-1280x800.png") });
  await popup.close();

  const blocked = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await blocked.setContent(blockedPopupMarkup());
  await blocked.screenshot({ path: path.join(storeDir, "blocked-popup-1280x800.png") });
  await blocked.close();
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

function blockedPopupMarkup() {
  return `<!doctype html><html><body style="margin:0;width:1280px;height:800px;overflow:hidden;font-family:Arial,sans-serif;background:#0c1220;color:white">
    <header style="height:58px;display:flex;align-items:center;padding:0 28px;border-bottom:1px solid #2d3748;background:#121a2a">
      <strong style="font-size:18px">Example video page</strong><span style="margin-left:auto;color:#98a2b3;font-size:13px">Harmless demonstration</span>
    </header>
    <main style="position:relative;height:742px;background:radial-gradient(circle at 50% 35%,#25334c,#0c1220 65%);display:grid;place-items:center">
      <div style="text-align:center;color:#d0d5dd"><div style="width:96px;height:96px;margin:auto;border:2px solid #667085;border-radius:50%;display:grid;place-items:center;font-size:38px">▶</div><p style="font-size:18px">The page tried to open a different destination.</p></div>
      <section style="position:absolute;right:28px;bottom:28px;width:390px;padding:18px;border:1px solid #475467;border-radius:12px;background:#17202a;box-shadow:0 14px 45px #0009">
        <div style="display:flex;align-items:center;gap:10px"><span style="display:grid;width:34px;height:34px;place-items:center;border-radius:9px;background:#155eef;font-weight:800">P</span><strong style="font-size:16px">Unexpected tab closed</strong></div>
        <p style="margin:14px 0;color:#d0d5dd;line-height:1.45">PopIntent closed a destination that did not match the link you selected.</p>
        <div style="display:flex;gap:8px"><span style="padding:8px 11px;border-radius:7px;background:white;color:#17202a;font-size:12px;font-weight:700">Open anyway</span><span style="padding:8px 11px;border:1px solid #667085;border-radius:7px;font-size:12px;font-weight:700">Incorrect block</span></div>
      </section>
    </main>
  </body></html>`;
}
