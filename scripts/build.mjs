import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.resolve(projectRoot, "dist");
if (path.dirname(distDir) !== projectRoot || path.basename(distDir) !== "dist") {
  throw new Error(`Refusing to clean unexpected output path: ${distDir}`);
}

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await cp(path.join(projectRoot, "extension"), distDir, { recursive: true });
for (const document of ["LICENSE", "PRIVACY.md", "README.md"]) {
  await cp(path.join(projectRoot, document), path.join(distDir, document));
}
await cp(path.join(projectRoot, "docs"), path.join(distDir, "docs"), { recursive: true });

await build({
  entryPoints: { "background/service-worker": path.join(projectRoot, "src/background/service-worker.ts") },
  outdir: distDir,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "chrome102",
  sourcemap: false,
  logLevel: "info"
});

await build({
  entryPoints: {
    "content/gesture-tracker": path.join(projectRoot, "src/content/gesture-tracker.ts"),
    "ui/popup": path.join(projectRoot, "src/ui/popup.ts"),
    "ui/options": path.join(projectRoot, "src/ui/options.ts")
  },
  outdir: distDir,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "chrome102",
  sourcemap: false,
  logLevel: "info"
});
