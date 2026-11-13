import assert from "node:assert/strict";
import { test } from "node:test";
import { sceneRect, resizeRect, moveRect } from "../scripts/geometry.js";

test("scene rectangle uses the unpadded map at its padded canvas origin", () => {
  assert.deepEqual(sceneRect({ width: 2000, height: 1500, dimensions: { sceneX: 200, sceneY: 100, width: 2400, height: 1700 } }),
    { x: 200, y: 100, width: 2000, height: 1500 });
});

test("drag translates without changing independent scales", () => {
  assert.deepEqual(moveRect({ x: 200, y: 100, width: 1500, height: 1200, rotation: 0 }, { x: -50, y: 35 }),
    { x: 150, y: 135, width: 1500, height: 1200, rotation: 0 });
});

test("east and south handles stretch axes independently", () => {
  const rect = { x: 200, y: 100, width: 1500, height: 1200, rotation: 0 };
  assert.deepEqual(resizeRect(rect, "e", { x: 200, y: 900 }), { ...rect, width: 1700 });
  assert.deepEqual(resizeRect(rect, "s", { x: 900, y: -300 }), { ...rect, height: 900 });
  assert.deepEqual(resizeRect(rect, "nw", { x: 100, y: 100 }), { ...rect, x: 300, y: 200, width: 1400, height: 1100 });
});

test("resize clamps at one pixel instead of flipping the image", () => {
  assert.deepEqual(resizeRect({ x: 0, y: 0, width: 10, height: 10, rotation: 0 }, "w", { x: 99, y: 0 }),
    { x: 9, y: 0, width: 1, height: 10, rotation: 0 });
});

test("rotated resize uses local axes while keeping opposite anchor fixed", () => {
  const value = resizeRect({ x: 200, y: 100, width: 100, height: 100, rotation: 90 }, "e", { x: 0, y: 50 });
  assert.ok(Math.abs(value.width - 150) < 1e-8);
  assert.ok(Math.abs(value.x - 175) < 1e-8);
  assert.ok(Math.abs(value.y - 125) < 1e-8);
  assert.equal(value.height, 100);
});
