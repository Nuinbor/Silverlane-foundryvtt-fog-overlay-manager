import assert from "node:assert/strict";
import { readFile, readdir, access } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import Handlebars from "handlebars";

const root = fileURLToPath(new URL("../", import.meta.url));
const json = async path => JSON.parse(await readFile(join(root, path), "utf8"));
const manifest = await json("module.json"), pkg = await json("package.json");
assert.equal(manifest.id, pkg.name); assert.equal(manifest.version, pkg.version);
assert.equal(manifest.compatibility.minimum, "14"); assert.equal(manifest.compatibility.maximum, "14");
assert.ok(!manifest.relationships?.requires?.length, "No mandatory runtime modules");
assert.ok(manifest.download.endsWith(`/v${manifest.version}/module.zip`));
for (const path of [...manifest.esmodules, ...manifest.styles, ...manifest.languages.map(l => l.path), manifest.license, manifest.readme]) {
  assert.ok(!path.includes("..") && !path.startsWith("/")); await access(join(root, path));
}
const locales = await Promise.all(manifest.languages.map(l => json(l.path)));
const keys = Object.keys(locales[0].SFO).sort();
for (const locale of locales) {
  assert.deepEqual(Object.keys(locale.SFO).sort(), keys);
  for (const value of Object.values(locale.SFO)) assert.ok(typeof value === "string" && value.trim());
}
for (const file of await readdir(join(root, "scripts"))) {
  if (!file.endsWith(".js")) continue;
  execFileSync(process.execPath, ["--check", join(root, "scripts", file)], { stdio: "pipe" });
  const text = await readFile(join(root, "scripts", file), "utf8");
  for (const match of text.matchAll(/\bt\(["'](\w+)["']\)/g)) assert.ok(keys.includes(match[1]), `${file}: missing ${match[1]}`);
  for (const match of text.matchAll(/from\s+["']\.\/([^"']+)["']/g)) await access(join(root, "scripts", match[1]));
}
for (const file of await readdir(join(root, "templates"))) {
  const source = await readFile(join(root, "templates", file), "utf8");
  Handlebars.precompile(source);
  for (const match of source.matchAll(/SFO\.(\w+)/g)) assert.ok(keys.includes(match[1]), `${file}: missing ${match[1]}`);
}
console.log(`Validated v${manifest.version}: manifest, runtime syntax/imports, templates, ${keys.length} locale keys in ${locales.length} languages.`);
