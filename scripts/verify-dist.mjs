import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const diagnosticBuild = process.argv.includes("--diagnostic");
const betaBuild = process.argv.includes("--beta");
if (diagnosticBuild && betaBuild) throw new Error("Choose either --diagnostic or --beta.");
const outputName = diagnosticBuild ? "dist-diagnostic" : betaBuild ? "dist-beta" : "dist";
const distDir = path.resolve(projectRoot, outputName);
if (path.dirname(distDir) !== projectRoot || path.basename(distDir) !== outputName) {
  throw new Error(`Unexpected distribution path: ${distDir}`);
}

const packageJson = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
const manifest = JSON.parse(await readFile(path.join(distDir, "manifest.json"), "utf8"));
const allowedPermissions = new Set(["storage", "webNavigation", "declarativeNetRequest"]);

if (manifest.manifest_version !== 3) throw new Error("Only Manifest V3 packages are allowed.");
if (manifest.version !== packageJson.version) throw new Error("Manifest and package versions differ.");
if (diagnosticBuild) {
  if (manifest.name !== "PopIntent Diagnostic") throw new Error("Diagnostic build name is missing.");
  if (manifest.version_name !== `${manifest.version}-diagnostic`) {
    throw new Error("Diagnostic version name is missing.");
  }
} else if (betaBuild) {
  if (manifest.name !== "PopIntent Beta") throw new Error("Beta build name is missing.");
  if (manifest.version_name !== `${manifest.version}-beta`) {
    throw new Error("Beta version name is missing.");
  }
} else if (manifest.name !== "PopIntent" || manifest.version_name !== undefined) {
  throw new Error("Standard build contains diagnostic manifest metadata.");
}
for (const permission of manifest.permissions ?? []) {
  if (!allowedPermissions.has(permission)) throw new Error(`Unexpected permission: ${permission}`);
}
if (manifest.update_url !== undefined) throw new Error("A validation build must not define update_url.");
if (manifest.externally_connectable !== undefined) {
  throw new Error("A validation build must not expose externally_connectable.");
}

const files = await walk(distDir);
const forbiddenPatterns = [
  { label: "eval", pattern: /\beval\s*\(/ },
  { label: "Function constructor", pattern: /\bnew\s+Function\s*\(/ },
  { label: "remote script URL", pattern: /https?:\/\// }
];
const diagnosticRuntimePattern =
  /diagnosticEvents|diagnostic-watch|export_diagnostic_trace|clear_diagnostic_trace|Diagnostic trace|PopIntent Diagnostic/;
for (const file of files.filter((value) => value.endsWith(".js"))) {
  const source = await readFile(file, "utf8");
  for (const forbidden of forbiddenPatterns) {
    if (forbidden.pattern.test(source)) {
      throw new Error(`${forbidden.label} found in ${path.relative(distDir, file)}`);
    }
  }
  if (!diagnosticBuild && diagnosticRuntimePattern.test(source)) {
    throw new Error(`Diagnostic runtime found in standard build: ${path.relative(distDir, file)}`);
  }
}

const contentScript = await readFile(path.join(distDir, "content", "gesture-tracker.js"), "utf8");
if (/chrome\.extension|inIncognitoContext/.test(contentScript)) {
  throw new Error("Content script must not infer or report private-browsing context.");
}

JSON.parse(await readFile(path.join(distDir, "rules", "known-redirectors.json"), "utf8"));
console.log(
  `Verified ${files.length} packaged files for ${manifest.name} ${manifest.version_name ?? manifest.version}.`
);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const absolute = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(absolute) : [absolute];
    })
  );
  return nested.flat();
}
