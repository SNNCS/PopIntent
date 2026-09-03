import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const diagnosticBuild = process.argv.includes("--diagnostic");
const betaBuild = process.argv.includes("--beta");
if (diagnosticBuild && betaBuild) throw new Error("Choose either --diagnostic or --beta.");

const variant = diagnosticBuild ? "diagnostic" : betaBuild ? "beta" : "standard";
const outputName = diagnosticBuild ? "dist-diagnostic" : betaBuild ? "dist-beta" : "dist";
const distDir = path.resolve(projectRoot, outputName);
const releaseDir = path.resolve(projectRoot, "release");
assertDirectChild(projectRoot, distDir, outputName);
assertDirectChild(projectRoot, releaseDir, "release");

const packageJson = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
const manifest = JSON.parse(await readFile(path.join(distDir, "manifest.json"), "utf8"));
if (manifest.version !== packageJson.version) {
  throw new Error("Built manifest and package versions differ.");
}

const suffix = variant === "standard" ? "" : `-${variant}`;
const archiveName = `popintent-${packageJson.version}${suffix}.zip`;
const archivePath = path.join(releaseDir, archiveName);
const entries = await collectFiles(distDir);
const first = await createDeterministicZip(entries);
const second = await createDeterministicZip(entries);
if (!first.equals(second)) throw new Error("ZIP generation was not reproducible.");

await mkdir(releaseDir, { recursive: true });
await writeFile(archivePath, first);
const digest = createHash("sha256").update(first).digest("hex");
await writeFile(`${archivePath}.sha256`, `${digest}  ${archiveName}\n`, "utf8");

console.log(`Created reproducible ${archivePath}`);
console.log(`SHA-256 ${digest}`);

async function collectFiles(root) {
  const files = [];
  await visit(root, "");
  return files.sort((left, right) => left.name.localeCompare(right.name, "en"));

  async function visit(directory, relativeDirectory) {
    const directoryEntries = await readdir(directory, { withFileTypes: true });
    directoryEntries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of directoryEntries) {
      const relativePath = path.posix.join(relativeDirectory, entry.name);
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolutePath, relativePath);
      else if (entry.isFile()) files.push({ name: relativePath, data: await readFile(absolutePath) });
      else throw new Error(`Unsupported package entry: ${absolutePath}`);
    }
  }
}

async function createDeterministicZip(entries) {
  const localRecords = [];
  const centralRecords = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const compressed = deflateRawSync(entry.data, { level: 9 });
    const checksum = crc32(entry.data);

    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x0021, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    name.copy(local, 30);
    localRecords.push(local, compressed);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x0021, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centralRecords.push(central);

    offset += local.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralRecords);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localRecords, centralDirectory, end]);
}

function crc32(data) {
  let value = 0xffffffff;
  for (const byte of data) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
    }
  }
  return (value ^ 0xffffffff) >>> 0;
}

function assertDirectChild(parent, candidate, name) {
  if (path.dirname(candidate) !== parent || path.basename(candidate) !== name) {
    throw new Error(`Refusing unexpected path: ${candidate}`);
  }
}
