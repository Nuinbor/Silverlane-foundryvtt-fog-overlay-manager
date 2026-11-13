import { MODULE_ID, getLevels, requireGM, readAssignment, saveAssignment } from "./model.js";
import { sceneRect } from "./geometry.js";
import { AlignmentEditor } from "./alignment.js";
import { t, reportError } from "./ui.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class FogOverlayManager extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "silverlane-fog-overlay-manager", tag: "section", classes: ["sfo", "sfo-manager"],
    position: { width: 1050, height: 600 },
    window: { title: "SFO.managerTitle", icon: "fa-solid fa-map", resizable: true },
    actions: {
      browse(event, target) { const cell = target.closest("td"); this.browseImage(cell.dataset.levelId, cell.dataset.userId); },
      align(event, target) { const cell = target.closest("td"); void this.alignImage(cell.dataset.levelId, cell.dataset.userId).catch(reportError); },
      clear(event, target) { const cell = target.closest("td"); void this.clearImage(cell.dataset.levelId, cell.dataset.userId).catch(reportError); }
    }
  };
  static PARTS = { content: { template: `modules/${MODULE_ID}/templates/manager.hbs`, scrollable: [".sfo-table-scroll"] } };
  #listeners;

  constructor({ scene, ...options } = {}) { super(options); this.scene = scene ?? globalThis.canvas?.scene ?? Array.from(game.scenes)[0]; }
  _canRender() { return !!game.user.isGM; }

  async _prepareContext(options) {
    const levels = getLevels(this.scene), users = Array.from(game.users).filter(u => !u.isGM);
    return { ...await super._prepareContext(options), scene: this.scene,
      scenes: Array.from(game.scenes).map(s => ({ id: s.id, name: s.name, selected: s.id === this.scene?.id })),
      levels: levels.map(l => ({ id: l.id, name: l.name, bottom: l.elevation?.bottom, top: l.elevation?.top })),
      rows: users.map(user => ({ id: user.id, name: user.name, active: user.active,
        cells: levels.map(level => { const a = readAssignment(this.scene, level.id, user.id);
          return { levelId: level.id, userId: user.id, src: a?.src ?? "", enabled: a?.enabled ?? false, hasImage: !!a,
            geometry: a ? `${Math.round(a.width)} × ${Math.round(a.height)} px` : t("noImage") }; }) })),
      noLevels: !levels.length, noPlayers: !users.length,
      fogDisabled: this.scene && (!this.scene.tokenVision || !(this.scene.fog?.mode > 0)),
      sharedFog: this.scene?.fog?.mode === globalThis.CONST?.FOG_EXPLORATION_MODES?.SHARED };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.#listeners?.abort(); this.#listeners = new AbortController();
    this.element.addEventListener("change", event => {
      const input = event.target;
      if (input.name === "scene") { this.scene = game.scenes.get(input.value); void this.render({ force: true }); return; }
      const cell = input.closest("td"); if (!cell) return;
      const { levelId, userId } = cell.dataset;
      if (input.name === "image") void this.setImage(levelId, userId, input.value).catch(error => { reportError(error); void this.render({ force: true }); });
      else if (input.name === "enabled") {
        const a = readAssignment(this.scene, levelId, userId);
        if (a) void saveAssignment(this.scene, levelId, userId, { ...a, enabled: input.checked }).catch(reportError);
      }
    }, { signal: this.#listeners.signal });
  }

  async setImage(levelId, userId, src) {
    requireGM();
    if (!src.trim()) return this.clearImage(levelId, userId);
    const current = readAssignment(this.scene, levelId, userId);
    await saveAssignment(this.scene, levelId, userId, { ...sceneRect(this.scene), ...current, src, enabled: true });
    await this.render({ force: true });
  }

  browseImage(levelId, userId) {
    requireGM();
    const scene = this.scene;
    const current = readAssignment(scene, levelId, userId)?.src ?? "";
    return new foundry.applications.apps.FilePicker({ type: "image", current,
      callback: async src => {
        // Keep the original scene even if the GM changes the manager's dropdown.
        try {
          const existing = readAssignment(scene, levelId, userId);
          await saveAssignment(scene, levelId, userId, { ...sceneRect(scene), ...existing, src, enabled: true });
          await this.render({ force: true });
        } catch (error) { reportError(error); }
      }
    }).render({ force: true });
  }

  async clearImage(levelId, userId) { await saveAssignment(this.scene, levelId, userId, null); await this.render({ force: true }); }

  async alignImage(levelId, userId) {
    requireGM();
    const assignment = readAssignment(this.scene, levelId, userId);
    if (!assignment) { ui.notifications.warn(t("chooseImage")); return; }
    return AlignmentEditor.open({ scene: this.scene, levelId, userId, assignment, onSave: () => void this.render({ force: true }) });
  }

  _onClose(options) { this.#listeners?.abort(); super._onClose(options); }
}
