import { MODULE_ID, requireGM } from "./model.js";
import { FogOverlayController } from "./fog.js";
import { installTileVisibility, injectTileVisibility, refreshTileVisibility } from "./tiles.js";
import { FogOverlayManager } from "./manager.js";
import { alignmentEditors } from "./alignment.js";
import { t, reportError } from "./ui.js";

const fog = new FogOverlayController({ onError: reportError });
let manager;

export function openManager(scene = canvas?.scene) {
  requireGM();
  const document = typeof scene === "string" ? game.scenes.get(scene) : scene;
  manager ??= new FogOverlayManager({ scene: document });
  if (document) manager.scene = document;
  return manager.render({ force: true });
}

function moduleChanged(changes) {
  return !!changes.flags?.[MODULE_ID] || Object.hasOwn(changes.flags ?? {}, `-=${MODULE_ID}`)
    || Object.keys(changes).some(key => key.startsWith(`flags.${MODULE_ID}.`));
}

Hooks.once("init", () => {
  installTileVisibility();
  game.settings.registerMenu(MODULE_ID, "manager", {
    name: "SFO.managerTitle", label: "SFO.openManager", hint: "SFO.menuHint",
    icon: "fa-solid fa-map", type: FogOverlayManager, restricted: true
  });
});

Hooks.on("canvasInit", canvas => fog.onCanvasInit(canvas));
Hooks.on("canvasDraw", canvas => fog.onCanvasDraw(canvas));
Hooks.on("drawCanvasVisibility", group => fog.onVisibilityDraw(group));
Hooks.on("canvasPan", () => { for (const editor of alignmentEditors) editor.preview?.refresh(); });
Hooks.on("canvasTearDown", () => {
  for (const editor of [...alignmentEditors]) {
    editor.preview?.destroy();
    void editor.close().catch(reportError);
  }
});

Hooks.on("updateScene", (scene, changes) => {
  if (moduleChanged(changes)) {
    if (scene.id === globalThis.canvas?.scene?.id && !game.user.isGM) void fog.requestRedraw();
    if (manager?.rendered && manager.scene?.id === scene.id) void manager.render({ force: true });
  }
});
for (const event of ["createLevel", "updateLevel", "deleteLevel"]) {
  Hooks.on(event, level => { if (manager?.rendered && manager.scene?.id === level.parent?.id) void manager.render({ force: true }); });
}
for (const event of ["createUser", "updateUser", "deleteUser"]) {
  Hooks.on(event, () => { if (manager?.rendered) void manager.render({ force: true }); });
}

Hooks.on("renderTileConfig", injectTileVisibility);
Hooks.on("updateTile", (document, changes) => { if (moduleChanged(changes)) refreshTileVisibility(document); });

Hooks.on("getSceneControlButtons", controls => {
  if (!game.user.isGM || !controls.tokens) return;
  controls.tokens.tools[MODULE_ID] = {
    name: MODULE_ID, title: t("openManager"), icon: "fa-solid fa-map", button: true,
    onChange: () => openManager()
  };
});
Hooks.on("getSceneContextOptions", (directory, entries) => {
  entries.push({ name: t("openManager"), icon: '<i class="fa-solid fa-map"></i>',
    condition: () => !!game.user.isGM,
    callback: element => {
      const root = element?.[0] ?? element;
      return openManager(root.dataset.entryId ?? root.dataset.documentId);
    }
  });
});

Hooks.once("ready", () => {
  game.modules.get(MODULE_ID).api = Object.freeze({ openManager, refresh: () => fog.requestRedraw() });
});
