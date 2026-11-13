import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import * as model from "../scripts/model.js";

const { MODULE_ID, getLevels, readAssignment, normalizeAssignment, saveAssignment, canViewTile } = model;
const rect = { x: 200, y: 100, width: 2000, height: 2000 };
const assignment = { src: "worlds/demo/plan.webp", enabled: true, ...rect, rotation: 0 };
beforeEach(() => { globalThis.game = { user: { id: "gm", isGM: true } }; });

test("levels use native IDs, ordered by sort, without inventing floors", () => {
  const scene = { levels: { contents: [
    { id: "upper", name: "Upper", sort: 10, elevation: { bottom: 10, top: 20 } },
    { id: "ground", name: "Ground", sort: 0, elevation: { bottom: 0, top: 10 } }
  ] } };
  assert.deepEqual(getLevels(scene).map(l => l.id), ["ground", "upper"]);
  assert.deepEqual(getLevels({}), []);
});

test("only the exact user's floor assignment is read", () => {
  const scene = { dimensions: { sceneX: 200, sceneY: 100 }, width: 2000, height: 2000,
    flags: { [MODULE_ID]: { assignments: { ground: { alice: assignment } } } } };
  assert.deepEqual(readAssignment(scene, "ground", "alice"), assignment);
  assert.equal(readAssignment(scene, "ground", "bob"), null);
  assert.equal(readAssignment(scene, "upper", "alice"), null);
});

test("normalization preserves independent width and height and padded offsets", () => {
  assert.deepEqual(normalizeAssignment({ src: "plan.webp", width: 1500, height: 1200, rotation: 450 }, rect), {
    src: "plan.webp", enabled: true, x: 200, y: 100, width: 1500, height: 1200, rotation: 90
  });
});

test("corrupted geometry cannot send NaN, infinity, or nonpositive scales to PIXI", () => {
  const value = normalizeAssignment({ src: "plan.webp", x: NaN, width: -10, height: Infinity }, rect);
  assert.deepEqual(value, { src: "plan.webp", enabled: true, ...rect, rotation: 0 });
  assert.equal(normalizeAssignment({ src: "" }, rect), null);
});

test("rejects script, data, file and protocol-relative asset paths", () => {
  for (const src of ["javascript:alert(1)", "data:image/svg+xml,test", "file:///secret", "//example.com/a.png", "a\n.png"]) {
    assert.equal(normalizeAssignment({ src }, rect), null, src);
  }
  assert.equal(normalizeAssignment({ src: "https://cdn.example.com/plan.png" }, rect).src, "https://cdn.example.com/plan.png");
});

test("saving emits only a single cell update, preserving unrelated assignments", async () => {
  const updates = [];
  const scene = { levels: new Map([["ground", { id: "ground" }]]), width: 2000, height: 2000,
    dimensions: { sceneX: 200, sceneY: 100 }, update: async value => { updates.push(value); } };
  await saveAssignment(scene, "ground", "alice", assignment);
  assert.deepEqual(updates, [{ [`flags.${MODULE_ID}.assignments.ground.alice`]: assignment }]);
  await saveAssignment(scene, "ground", "alice", null);
  assert.deepEqual(updates[1], { [`flags.${MODULE_ID}.assignments.ground.-=alice`]: null });
});

test("players and unsafe IDs cannot write assignments", async () => {
  const scene = { update: () => { throw new Error("must not write"); } };
  game.user.isGM = false;
  await assert.rejects(saveAssignment(scene, "ground", "alice", assignment), /GM/);
  game.user.isGM = true;
  await assert.rejects(saveAssignment(scene, "ground.bad", "alice", assignment), /identifier/i);
});

test("saving invalid or deleted-floor assignments fails without clearing a valid cell", async () => {
  const scene = { levels: new Map([["ground", { id: "ground" }]]), update: () => { throw new Error("must not write"); } };
  await assert.rejects(saveAssignment(scene, "ground", "alice", { src: "javascript:bad" }), /image/i);
  await assert.rejects(saveAssignment(scene, "deleted", "alice", assignment), /level/i);
});

test("tile restrictions allow selected users only, empty means no players, GM bypasses", () => {
  const tile = { flags: { [MODULE_ID]: { visibility: { restricted: true, users: { alice: true, bob: false } } } } };
  assert.equal(canViewTile(tile, { id: "alice" }), true);
  assert.equal(canViewTile(tile, { id: "bob" }), false);
  assert.equal(canViewTile(tile, { id: "eve" }), false);
  assert.equal(canViewTile(tile, { id: "gm", isGM: true }), true);
  tile.flags[MODULE_ID].visibility.users = {};
  assert.equal(canViewTile(tile, { id: "alice" }), false);
  tile.flags[MODULE_ID].visibility.restricted = false;
  assert.equal(canViewTile(tile, { id: "alice" }), true);
  assert.equal(canViewTile({}, { id: "alice" }), true);
});
