import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { unzipSync, strFromU8 } from "fflate";
import { buildArchive } from "../tools/build.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
test("ZIP round-trip includes a root manifest and every referenced runtime file but no dev files", async () => {
  const { archive, manifest } = await buildArchive(root);
  const files = unzipSync(archive);
  assert.equal(JSON.parse(strFromU8(files["module.json"])).id, "silverlane-fog-overlay-manager");
  assert.equal(manifest.version, "0.1.0");
  for (const path of [...manifest.esmodules, ...manifest.styles, ...manifest.languages.map(l => l.path), "templates/manager.hbs", "templates/alignment.hbs", "README.md", "LICENSE", "CHANGELOG.md"]) assert.ok(files[path], path);
  for (const path of Object.keys(files)) {
    assert.ok(!path.includes("node_modules") && !path.startsWith("tests/") && !path.startsWith(".git"), path);
    if (path.startsWith("scripts/") && path.endsWith(".js")) {
      const source = strFromU8(files[path]);
      for (const match of source.matchAll(/from\s+["']\.\/([^"']+)["']/g)) assert.ok(files[`scripts/${match[1]}`], `${path}: ${match[1]}`);
    }
  }
});

test("identical inputs produce identical installable archive bytes", async () => {
  const first = await buildArchive(root), second = await buildArchive(root);
  assert.deepEqual(first.archive, second.archive);
});
