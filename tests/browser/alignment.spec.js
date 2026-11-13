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
