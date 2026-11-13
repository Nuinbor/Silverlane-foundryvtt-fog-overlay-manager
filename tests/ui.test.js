import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { readFile } from "node:fs/promises";
import Handlebars from "handlebars";
import { JSDOM } from "jsdom";
import { installFoundryUI } from "./helpers/foundry.js";
import { MODULE_ID } from "../scripts/model.js";
installFoundryUI();
const { FogOverlayManager } = await import("../scripts/manager.js");
const { AlignmentEditor } = await import("../scripts/alignment.js");
const en = JSON.parse(await readFile(new URL("../lang/en.json", import.meta.url), "utf8"));
Handlebars.registerHelper("localize", key => key.split(".").reduce((v, p) => v?.[p], en) ?? key);

let scene, updates;
beforeEach(() => {
  updates = [];
  scene = { id: "s1", name: "Dungeon", width: 2000, height: 2000, tokenVision: true, fog: { mode: 1 },
    dimensions: { sceneX: 200, sceneY: 100 }, grid: { size: 100, distance: 5, units: "ft" },
    levels: new Map([["ground", { id: "ground", name: "Ground", sort: 0, elevation: { bottom: 0, top: 10 } }],
      ["upper", { id: "upper", name: "Upper", sort: 1, elevation: { bottom: 10, top: 20 } }]]),
    update: async value => updates.push(value), flags: {} };
  globalThis.game = { user: { isGM: true }, users: [
    { id: "alice", name: "Alice", active: true }, { id: "bob", name: '<script>bad()</script>', active: false }, { id: "gm", name: "GM", isGM: true }
  ], scenes: [scene], i18n: { localize: key => key.split(".").reduce((v, p) => v?.[p], en) ?? key } };
  globalThis.ui = { notifications: { error: () => {}, warn: () => {}, info: () => {} } };
  globalThis.canvas = { scene, level: { id: "ground" }, ready: true };
});

test("manager renders a user-by-Level matrix with image pickers and alignment actions", async () => {
  const manager = new FogOverlayManager({ scene });
  const context = await manager._prepareContext({});
  const template = await readFile(new URL("../templates/manager.hbs", import.meta.url), "utf8");
  const { window } = new JSDOM(Handlebars.compile(template)(context));
  assert.equal(window.document.querySelectorAll("thead th[data-level-id]").length, 2);
  assert.equal(window.document.querySelectorAll("tbody tr[data-user-id]").length, 2);
  assert.equal(window.document.querySelectorAll('button[data-action="browse"]').length, 4);
  assert.equal(window.document.querySelectorAll('button[data-action="align"]').length, 4);
  assert.equal(window.document.querySelector("script"), null);
  assert.ok(window.document.body.textContent.includes('<script>bad()</script>'));
});

test("setting one image retains its transform and writes only its selected cell", async () => {
  scene.flags[MODULE_ID] = { assignments: { ground: { alice: { src: "old.webp", x: 230, y: 140, width: 1500, height: 1200, rotation: 5 } } } };
  const manager = new FogOverlayManager({ scene });
  await manager.setImage("ground", "alice", "new.webp");
  assert.deepEqual(updates, [{ [`flags.${MODULE_ID}.assignments.ground.alice`]: {
    src: "new.webp", enabled: true, x: 230, y: 140, width: 1500, height: 1200, rotation: 5
  } }]);
});

test("image picker is namespaced v14 API and its callback saves the chosen image", async () => {
  let pickerOptions;
  foundry.applications.apps.FilePicker = class { constructor(options) { pickerOptions = options; } render() {} };
  const manager = new FogOverlayManager({ scene });
  manager.browseImage("upper", "alice");
  assert.equal(pickerOptions.type, "image");
  await pickerOptions.callback("floors/upper.webp");
  assert.equal(updates[0][`flags.${MODULE_ID}.assignments.upper.alice`].src, "floors/upper.webp");
});

test("player cannot render manager or use direct assignment writes", async () => {
  game.user.isGM = false;
  const manager = new FogOverlayManager({ scene });
  assert.equal(manager._canRender({}), false);
  await assert.rejects(manager.setImage("ground", "alice", "plan.webp"), /GM/);
  assert.equal(updates.length, 0);
});

test("alignment fit targets the 100x100-foot scene while arbitrary 75x60 dimensions remain editable", () => {
  const editor = new AlignmentEditor({ scene, levelId: "upper", userId: "alice", assignment: { src: "plan.webp", x: 200, y: 100, width: 1500, height: 1200, rotation: 0 } });
  assert.deepEqual(editor.gridSize(), { width: 75, height: 60, units: "ft" });
  editor.fitToScene();
  assert.deepEqual(editor.gridSize(), { width: 100, height: 100, units: "ft" });
  editor.resetAlignment();
  assert.equal(editor.assignment.width, 1500); assert.equal(editor.assignment.height, 1200);
});

test("saving alignment writes its exact user/floor and closing without save performs no write", async () => {
  const options = { scene, levelId: "upper", userId: "alice", assignment: { src: "plan.webp", x: 200, y: 100, width: 1500, height: 1200, rotation: 0 } };
  const canceled = new AlignmentEditor(options); await canceled.close(); assert.equal(updates.length, 0);
  const editor = new AlignmentEditor(options); await editor.saveAlignment();
  assert.equal(updates.length, 1);
  assert.equal(updates[0][`flags.${MODULE_ID}.assignments.upper.alice`].width, 1500);
});

test("alignment template exposes independent dimensions, units, reset, fit and save", async () => {
  const editor = new AlignmentEditor({ scene, levelId: "upper", userId: "alice", assignment: { src: "plan.webp", x: 200, y: 100, width: 1500, height: 1200, rotation: 0 } });
  const html = Handlebars.compile(await readFile(new URL("../templates/alignment.hbs", import.meta.url), "utf8"))(await editor._prepareContext({}));
  const { window } = new JSDOM(html);
  assert.equal(window.document.querySelector('[name="width"]').value, "1500");
  assert.equal(window.document.querySelector('[name="height"]').value, "1200");
  assert.ok(window.document.querySelector('[data-action="save"]'));
  assert.ok(window.document.querySelector('[data-action="fit"]'));
  assert.ok(window.document.querySelector('[data-action="reset"]'));
});
