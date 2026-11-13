import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { installTileVisibility, injectTileVisibility } from "../scripts/tiles.js";
import { MODULE_ID } from "../scripts/model.js";

test("the Tile subclass composes native visibility and interaction without revealing hidden tiles", () => {
  globalThis.game = { user: { id: "alice", isGM: false } };
  class NativeTile {
    get isVisible() { return !this.document.hidden; }
    get isInteractable() { return true; }
  }
  globalThis.CONFIG = { Tile: { objectClass: NativeTile } };
  installTileVisibility(); const Tile = CONFIG.Tile.objectClass;
  assert.ok(Tile.prototype instanceof NativeTile);
  const tile = new Tile();
  tile.document = { flags: { [MODULE_ID]: { visibility: { restricted: true, users: { alice: true } } } } };
  assert.equal(tile.isVisible, true);
  tile.document.hidden = true; assert.equal(tile.isVisible, false);
  tile.document.hidden = false; game.user.id = "bob";
  assert.equal(tile.isVisible, false); assert.equal(tile.isInteractable, false);
  game.user.isGM = true; assert.equal(tile.isVisible, true);
});

test("tile configuration injects boolean flag fields for every player without unsafe HTML", () => {
  const { window } = new JSDOM('<form><section class="tab" data-tab="basic"></section><footer></footer></form>');
  globalThis.document = window.document;
  globalThis.game = { user: { isGM: true }, i18n: { localize: x => x }, users: [
    { id: "alice", name: '<img src=x onerror="bad()">', isGM: false },
    { id: "bob", name: "Bob", isGM: false }, { id: "gm", name: "GM", isGM: true }
  ] };
  const app = { document: { flags: { [MODULE_ID]: { visibility: { restricted: true, users: { alice: true, bob: false } } } } } };
  injectTileVisibility(app, document.body); injectTileVisibility(app, document.body);
  assert.equal(document.querySelectorAll("fieldset[data-silverlane]").length, 1);
  assert.equal(document.querySelectorAll('input[type="checkbox"]').length, 3);
  assert.equal(document.querySelector(`input[name="flags.${MODULE_ID}.visibility.restricted"]`).checked, true);
  assert.equal(document.querySelector(`input[name="flags.${MODULE_ID}.visibility.users.alice"]`).checked, true);
  assert.equal(document.querySelector(`input[name="flags.${MODULE_ID}.visibility.users.bob"]`).checked, false);
  assert.equal(document.querySelector("img"), null);
  assert.ok(document.body.textContent.includes('<img src=x onerror="bad()">'));
});

test("non-GMs never receive tile permission controls", () => {
  const { window } = new JSDOM("<form></form>"); globalThis.document = window.document;
  globalThis.game = { user: { isGM: false } };
  injectTileVisibility({ document: {} }, document.body);
  assert.equal(document.querySelector("fieldset"), null);
});
