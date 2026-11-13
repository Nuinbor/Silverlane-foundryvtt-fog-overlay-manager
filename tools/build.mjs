import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { zipSync, strToU8 } from "fflate";

const DIRECTORIES = ["scripts", "styles", "templates", "lang"];
const FILES = ["module.json", "README.md", "LICENSE", "CHANGELOG.md"];

async function walk(root, prefix) {
  const paths = [];
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) paths.push(...await walk(root, path));
    else if (entry.isFile()) paths.push(path);
  }
  return paths;
}

/** The same allowlist is used by CI, the local build and the round-trip test. */
export async function buildArchive(root) {
  const manifest = JSON.parse(await readFile(join(root, "module.json"), "utf8"));
  const paths = [...FILES];
  for (const directory of DIRECTORIES) paths.push(...await walk(root, directory));
  const entries = {};
  for (const path of paths.sort()) {
    const bytes = path === "module.json" ? strToU8(JSON.stringify(manifest, null, 2) + "\n") : new Uint8Array(await readFile(join(root, path)));
    entries[path] = [bytes, { mtime: new Date("2026-01-01T00:00:00Z") }];
  }
  return { archive: zipSync(entries, { level: 9 }), manifest };
}

async function main() {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const { archive, manifest } = await buildArchive(root);
  const output = join(root, "dist"); await mkdir(output, { recursive: true });
  const json = JSON.stringify(manifest, null, 2) + "\n";
  await writeFile(join(output, "module.zip"), archive);
  await writeFile(join(output, "module.json"), json);
  const hash = value => createHash("sha256").update(value).digest("hex");
  await writeFile(join(output, "SHA256SUMS.txt"), `${hash(archive)}  module.zip\n${hash(json)}  module.json\n`);
  console.log(`Built dist/module.zip (${archive.length} bytes), module.json and SHA256SUMS.txt for v${manifest.version}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
