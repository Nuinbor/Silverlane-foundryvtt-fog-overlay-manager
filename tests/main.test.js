import assert from "node:assert/strict";
import { test } from "node:test";
import { installFoundryUI } from "./helpers/foundry.js";
import { MODULE_ID } from "../scripts/model.js";
installFoundryUI();
const once = new Map(), hooks = new Map(), menus = [];
globalThis.Hooks = { once: (name, fn) => once.set(name, fn), on: (name, fn) => hooks.set(name, fn) };
globalThis.CONFIG = { Tile: { objectClass: class {} } };
globalThis.canvas = { ready: true, scene: { id: "s1" } };
const module = {};
globalThis.game = { user: { isGM: true }, settings: { registerMenu: (...args) => menus.push(args) },
  modules: new Map([[MODULE_ID, module]]), scenes: new Map(), i18n: { localize: key => key } };
await import("../scripts/main.js");

test("entry point registers native fog hooks and a restricted settings menu", () => {
  once.get("init")(); once.get("ready")();
  for (const name of ["canvasInit", "canvasDraw", "drawCanvasVisibility", "canvasTearDown", "renderTileConfig", "updateTile", "updateScene"]) assert.ok(hooks.has(name), name);
  assert.equal(menus[0][0], MODULE_ID); assert.equal(menus[0][2].restricted, true);
  assert.equal(typeof module.api.openManager, "function");
});

test("v14 token tools expose the GM manager button but no controls to players", () => {
  const controls = { tokens: { tools: {} } };
  hooks.get("getSceneControlButtons")(controls);
  assert.equal(controls.tokens.tools[MODULE_ID].button, true);
  assert.equal(typeof controls.tokens.tools[MODULE_ID].onChange, "function");
  game.user.isGM = false;
  const playerControls = { tokens: { tools: {} } }; hooks.get("getSceneControlButtons")(playerControls);
  assert.deepEqual(playerControls.tokens.tools, {}); game.user.isGM = true;
});

test("native Scene context menu has a GM-only entry", () => {
  const entries = []; hooks.get("getSceneContextOptions")({}, entries);
  assert.equal(entries.length, 1); assert.equal(entries[0].condition(), true);
  game.user.isGM = false; assert.equal(entries[0].condition(), false);
});
