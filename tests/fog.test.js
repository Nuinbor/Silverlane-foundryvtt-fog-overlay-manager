import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { FogOverlayController } from "../scripts/fog.js";
import { MODULE_ID } from "../scripts/model.js";

const assignment = { src: "worlds/demo/plan.webp", x: 200, y: 100, width: 1500, height: 1200, rotation: 30 };
function fixture() {
  return { scene: { id: "scene1", tokenVision: true, width: 2000, height: 2000, fog: { mode: 1 },
    flags: { [MODULE_ID]: { assignments: { ground: { alice: assignment }, upper: { alice: { ...assignment, src: "upper.webp" } } } } } },
  level: { id: "ground" }, sceneTextures: {}, loadTexturesOptions: { additionalSources: [] }, ready: true, loading: false };
}
beforeEach(() => {
  globalThis.game = { user: { id: "alice", isGM: false } };
  globalThis.CONST = { FOG_EXPLORATION_MODES: { DISABLED: 0, SHARED: 2 } };
});

test("preloads just the local player's currently viewed Level image", () => {
  const canvas = fixture(); const fog = new FogOverlayController({ getCanvas: () => canvas });
  fog.onCanvasInit(canvas);
  assert.equal(canvas.sceneTextures.fogOverlay, "worlds/demo/plan.webp");
  assert.deepEqual(canvas.loadTexturesOptions.additionalSources, ["worlds/demo/plan.webp"]);
  canvas.level = { id: "upper" }; fog.onCanvasInit(canvas);
  assert.equal(canvas.sceneTextures.fogOverlay, "upper.webp");
});

test("GM, unassigned players, disabled assignments and scenes without persistent fog keep native overlays", () => {
  for (const change of [
    () => { game.user.isGM = true; },
    () => { game.user.id = "bob"; },
    c => { c.scene.flags[MODULE_ID].assignments.ground.alice = { ...assignment, enabled: false }; },
    c => { c.scene.fog.mode = 0; },
    c => { c.scene.tokenVision = false; }
  ]) {
    game.user = { id: "alice", isGM: false };
    const canvas = fixture(); canvas.sceneTextures.fogOverlay = "native.webp";
    change(canvas); new FogOverlayController().onCanvasInit(canvas);
    assert.equal(canvas.sceneTextures.fogOverlay, "native.webp");
  }
});

test("canvasDraw binds the already-loaded PIXI texture rather than reloading it", () => {
  const canvas = fixture(); const texture = { valid: true };
  const controller = new FogOverlayController({ getCanvas: () => canvas, getTexture: src => src === assignment.src ? texture : null });
  controller.onCanvasInit(canvas);
  delete canvas.sceneTextures.fogOverlay; // v14's preload normalization may discard named string entries
  controller.onCanvasDraw(canvas);
  assert.equal(canvas.sceneTextures.fogOverlay, texture);
});

test("native overlay is aligned once, with no tiling or scene-background tint", () => {
  const canvas = fixture();
  const controller = new FogOverlayController({ getCanvas: () => canvas, getTexture: () => ({ valid: true }) });
  controller.onCanvasInit(canvas); controller.onCanvasDraw(canvas);
  const group = { visibilityOverlay: { scale: { set() {} }, skew: { set() {} }, pivot: { set() {} }, anchor: { set(x) { this.x = this.y = x; } },
    position: { set(x, y) { this.x = x; this.y = y; } } }, filter: { uniforms: { dimensions: [2400, 2400, 2000, 2000] } } };
  controller.onVisibilityDraw(group);
  assert.equal(group.visibilityOverlay.anchor.x, 0.5);
  assert.deepEqual(group.visibilityOverlay.position, { set: group.visibilityOverlay.position.set, x: 950, y: 700 });
  assert.equal(group.visibilityOverlay.width, 1500); assert.equal(group.visibilityOverlay.height, 1200);
  assert.ok(Math.abs(group.visibilityOverlay.rotation - Math.PI / 6) < 1e-9);
  assert.deepEqual(Array.from(group.filter.uniforms.dimensions), [1, 1, 1, 1]);
  assert.deepEqual(group.filter.uniforms.backgroundColor, [1, 1, 1]);
});

test("a failed load or changed Level never transforms the native fallback image", () => {
  const canvas = fixture(); const controller = new FogOverlayController({ getCanvas: () => canvas, getTexture: () => null });
  controller.onCanvasInit(canvas); controller.onCanvasDraw(canvas);
  const group = { visibilityOverlay: { width: 99 }, filter: { uniforms: {} } };
  controller.onVisibilityDraw(group); assert.equal(group.visibilityOverlay.width, 99);
  canvas.level = { id: "upper" }; controller.onVisibilityDraw(group);
  assert.equal(group.visibilityOverlay.width, 99);
});

test("lighting refresh preserves untinted custom images after native background colour updates", () => {
  const canvas = fixture();
  const controller = new FogOverlayController({ getCanvas: () => canvas, getTexture: () => ({ valid: true }) });
  controller.onCanvasInit(canvas); controller.onCanvasDraw(canvas);
  canvas.visibility = { filter: { uniforms: { backgroundColor: [0, 0, 0] } } };
  controller.onLightingRefresh();
  assert.deepEqual(canvas.visibility.filter.uniforms.backgroundColor, [1, 1, 1]);
  canvas.visibility.filter.uniforms.backgroundColor = [0.2, 0.1, 0.3];
  canvas.level = { id: "upper" }; controller.onLightingRefresh();
  assert.deepEqual(canvas.visibility.filter.uniforms.backgroundColor, [0.2, 0.1, 0.3]);
});

test("redraw requests are coalesced and serialized across flag bursts", async () => {
  const canvas = fixture(); let draws = 0, active = 0, max = 0;
  canvas.draw = async () => { draws++; active++; max = Math.max(max, active); await new Promise(r => setTimeout(r, 15)); active--; };
  const controller = new FogOverlayController({ getCanvas: () => canvas, redrawDelay: 1 });
  await Promise.all([controller.requestRedraw(), controller.requestRedraw(), controller.requestRedraw()]);
  assert.equal(draws, 1); assert.equal(max, 1);
  await controller.requestRedraw(); assert.equal(draws, 2);
});

test("redraw aborts when the canvas is blank and reports failures without unhandled rejection", async () => {
  const canvas = fixture(); const errors = [];
  const controller = new FogOverlayController({ getCanvas: () => canvas, onError: e => errors.push(e.message), redrawDelay: 0 });
  canvas.draw = async () => { throw new Error("draw failed"); };
  await controller.requestRedraw(); assert.deepEqual(errors, ["draw failed"]);
  canvas.scene = null; await controller.requestRedraw(); assert.equal(errors.length, 1);
});
