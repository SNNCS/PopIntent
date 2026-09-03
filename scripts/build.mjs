import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const diagnosticBuild = process.argv.includes("--diagnostic");
const betaBuild = process.argv.includes("--beta");
if (diagnosticBuild && betaBuild) throw new Error("Choose either --diagnostic or --beta.");
const outputName = diagnosticBuild ? "dist-diagnostic" : betaBuild ? "dist-beta" : "dist";
const distDir = path.resolve(projectRoot, outputName);
if (path.dirname(distDir) !== projectRoot || path.basename(distDir) !== outputName) {
  throw new Error(`Refusing to clean unexpected output path: ${distDir}`);
}

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await cp(path.join(projectRoot, "extension"), distDir, { recursive: true });
if (diagnosticBuild) {
  const manifestPath = path.join(distDir, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.name = "PopIntent Diagnostic";
  manifest.version_name = `${manifest.version}-diagnostic`;
  manifest.description = "Temporary local-only diagnostic build for missed popup navigation traces.";
  manifest.action.default_title = "PopIntent Diagnostic";
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
} else if (betaBuild) {
  const manifestPath = path.join(distDir, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.name = "PopIntent Beta";
  manifest.version_name = `${manifest.version}-beta`;
  manifest.description = `BETA: ${manifest.description}`;
  manifest.action.default_title = "PopIntent Beta";
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
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
  define: { __POPINTENT_DIAGNOSTIC__: JSON.stringify(diagnosticBuild) },
  dropLabels: diagnosticBuild ? [] : ["DIAGNOSTIC"],
  minifySyntax: true,
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
  define: { __POPINTENT_DIAGNOSTIC__: JSON.stringify(diagnosticBuild) },
  dropLabels: diagnosticBuild ? [] : ["DIAGNOSTIC"],
  minifySyntax: true,
  sourcemap: false,
  logLevel: "info"
});
