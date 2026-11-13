import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => { await page.goto("/"); await page.waitForFunction(() => window.testReady === true); });

test("dragging moves the real PIXI image without modifying dimensions", async ({ page }) => {
  await page.mouse.move(160, 150); await page.mouse.down(); await page.mouse.move(210, 180); await page.mouse.up();
  expect(await page.evaluate(() => ({ ...preview.assignment }))).toMatchObject({ x: 150, y: 130, width: 200, height: 160 });
});

test("east handle stretches width independently of height", async ({ page }) => {
  await page.mouse.move(300, 180); await page.mouse.down(); await page.mouse.move(370, 210); await page.mouse.up();
  expect(await page.evaluate(() => ({ ...preview.assignment }))).toMatchObject({ x: 100, y: 100, width: 270, height: 160 });
});

test("southwest handle can shrink and stretch independently", async ({ page }) => {
  await page.mouse.move(100, 260); await page.mouse.down(); await page.mouse.move(140, 290); await page.mouse.up();
  expect(await page.evaluate(() => ({ ...preview.assignment }))).toMatchObject({ x: 140, y: 100, width: 160, height: 190 });
});

test("Escape restores the pre-drag geometry and destroy removes only owned resources", async ({ page }) => {
  await page.mouse.move(160, 150); await page.mouse.down(); await page.mouse.move(210, 180);
  await page.keyboard.press("Escape"); await page.mouse.up();
  expect(await page.evaluate(() => preview.assignment.x)).toBe(100);
  await page.evaluate(() => { const other = new PIXI.Container(); canvas.interface.addChild(other); preview.destroy(); window.other = other; });
  expect(await page.evaluate(() => canvas.interface.children.length)).toBe(1);
  expect(await page.evaluate(() => other.destroyed)).toBe(false);
});

test("drag distance is in scene coordinates at non-unit zoom", async ({ page }) => {
  await page.evaluate(() => { canvas.stage.scale.set(2); preview.refresh(); });
  await page.mouse.move(320, 300); await page.mouse.down(); await page.mouse.move(420, 360); await page.mouse.up();
  expect(await page.evaluate(() => ({ ...preview.assignment }))).toMatchObject({ x: 150, y: 130, width: 200, height: 160 });
});

test("destroy remains safe if Foundry already destroyed the preview's parent group", async ({ page }) => {
  const result = await page.evaluate(() => {
    canvas.interface.destroy({ children: true });
    try { preview.destroy(); preview.destroy(); return "safe"; } catch (error) { return error.message; }
  });
  expect(result).toBe("safe");
});

test("custom fog transform does not inherit background mirror or skew", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { FogOverlayController } = await import("/scripts/fog.js");
    const { MODULE_ID } = await import("/scripts/model.js");
    game.user = { id: "alice", isGM: false };
    const local = { scene: { id: "s1", tokenVision: true, fog: { mode: 1 }, width: 500, height: 500,
      flags: { [MODULE_ID]: { assignments: { ground: { alice: { src: "plan.webp", x: 10, y: 20, width: 200, height: 150, rotation: 0 } } } } } },
      level: { id: "ground" }, sceneTextures: {}, loadTexturesOptions: { additionalSources: [] } };
    const controller = new FogOverlayController({ getCanvas: () => local, getTexture: () => PIXI.Texture.WHITE });
    controller.onCanvasInit(local); controller.onCanvasDraw(local);
    const sprite = new PIXI.Sprite(PIXI.Texture.WHITE); sprite.scale.set(-2, -2); sprite.skew.set(0.2, 0.3);
    controller.onVisibilityDraw({ visibilityOverlay: sprite, filter: { uniforms: {} } });
    return { positiveX: sprite.scale.x > 0, positiveY: sprite.scale.y > 0, skewX: sprite.skew.x, skewY: sprite.skew.y };
  });
  expect(result).toEqual({ positiveX: true, positiveY: true, skewX: 0, skewY: 0 });
});
