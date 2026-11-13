import assert from "node:assert/strict";
import { test } from "node:test";
import { CanvasAlignmentPreview } from "../scripts/preview.js";

test("delayed image loading cannot attach a preview after cancellation", async () => {
  let resolve; let children = 0;
  globalThis.game = { user: { isGM: true } };
  const canvas = { ready: true, scene: { id: "s1" }, level: { id: "ground" }, interface: { addChild: () => children++ } };
  const preview = new CanvasAlignmentPreview({ canvas, assignment: { src: "plan.webp" }, loadTexture: () => new Promise(r => { resolve = r; }) });
  const pending = preview.start(); preview.destroy(); resolve({ valid: true });
  assert.equal(await pending, false); assert.equal(children, 0);
});

test("a delayed preview never attaches to another scene or Level", async () => {
  globalThis.game = { user: { isGM: true } };
  const canvas = { ready: true, scene: { id: "s1" }, level: { id: "ground" } };
  let resolve;
  const preview = new CanvasAlignmentPreview({ canvas, assignment: { src: "plan.webp" }, loadTexture: () => new Promise(r => { resolve = r; }) });
  const pending = preview.start(); canvas.level = { id: "upper" }; resolve({ valid: true });
  assert.equal(await pending, false);
});

test("players cannot start GM alignment previews, even through the API", async () => {
  globalThis.game = { user: { isGM: false } };
  const preview = new CanvasAlignmentPreview({ canvas: {}, assignment: {} });
  await assert.rejects(preview.start(), /GM/);
});
