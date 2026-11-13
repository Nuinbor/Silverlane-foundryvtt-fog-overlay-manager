import { MODULE_ID, requireGM, normalizeAssignment, saveAssignment, getLevels } from "./model.js";
import { sceneRect } from "./geometry.js";
import { CanvasAlignmentPreview } from "./preview.js";
import { t, reportError } from "./ui.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
export const alignmentEditors = new Set();

export class AlignmentEditor extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "silverlane-fog-alignment", tag: "section", classes: ["sfo", "sfo-alignment"],
    position: { width: 380, height: "auto", left: 110, top: 90 },
    window: { title: "SFO.alignmentTitle", icon: "fa-solid fa-up-down-left-right", resizable: true },
    actions: {
      fit() { this.fitToScene(); }, reset() { this.resetAlignment(); },
      save() { void this.saveAlignment().catch(reportError); }, cancel() { void this.close(); }
    }
  };
  static PARTS = { content: { template: `modules/${MODULE_ID}/templates/alignment.hbs` } };
  #listeners;
  #saving = false;

  constructor({ scene, levelId, userId, assignment, onSave = () => {}, ...options } = {}) {
    super(options);
    this.scene = scene; this.levelId = levelId; this.userId = userId; this.onSave = onSave;
    this.assignment = normalizeAssignment(assignment, sceneRect(scene));
    this.original = { ...this.assignment };
  }

  static async open(options) {
    requireGM();
    for (const editor of [...alignmentEditors]) await editor.close();
    if (!options.scene || !getLevels(options.scene).some(l => l.id === options.levelId)) throw new Error("The Level no longer exists.");
    if (canvas.loading) { ui.notifications.warn(t("canvasBusy")); return; }
    await options.scene.view({ level: options.levelId });
    if (!canvas.ready || canvas.scene?.id !== options.scene.id || canvas.level?.id !== options.levelId) {
      throw new Error("The requested scene Level could not be viewed.");
    }
    return new this(options).render({ force: true });
  }

  _canRender() { return !!game.user.isGM && !!this.assignment; }

  gridSize() {
    const grid = this.scene.grid;
    const factor = grid?.size > 0 ? (grid.distance ?? 1) / grid.size : 1;
    return { width: +(this.assignment.width * factor).toFixed(2), height: +(this.assignment.height * factor).toFixed(2), units: grid?.units || "px" };
  }

  async _prepareContext(options) {
    return { ...await super._prepareContext(options), assignment: this.assignment,
      playerName: Array.from(game.users).find(u => u.id === this.userId)?.name ?? this.userId,
      floorName: getLevels(this.scene).find(l => l.id === this.levelId)?.name ?? this.levelId,
      grid: this.gridSize(), sceneName: this.scene.name };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    alignmentEditors.add(this);
    this.#listeners?.abort(); this.#listeners = new AbortController();
    const opts = { signal: this.#listeners.signal };
    this.element.addEventListener("input", event => {
      if (event.target.name === "previewOpacity") this.preview?.setOpacity(event.target.value);
      else if (["x", "y", "width", "height", "rotation"].includes(event.target.name) && event.target.checkValidity()) {
        this.assignment = normalizeAssignment({ ...this.assignment, [event.target.name]: event.target.value }, sceneRect(this.scene));
        this.preview?.update(this.assignment); this.#updateUnits();
      }
    }, opts);
    if (!this.preview) {
      this.preview = new CanvasAlignmentPreview({ canvas, assignment: this.assignment, onError: reportError,
        onChange: value => { this.assignment = value; this.#syncFields(); } });
      void this.preview.start().then(ok => { if (!ok && this.rendered) ui.notifications.warn(t("previewUnavailable")); }).catch(reportError);
    }
  }

  #updateUnits() {
    const output = this.element?.querySelector("[data-grid-size]");
    if (output) { const grid = this.gridSize(); output.textContent = `${grid.width} × ${grid.height} ${grid.units}`; }
  }

  #syncFields() {
    for (const key of ["x", "y", "width", "height", "rotation"]) {
      const input = this.element?.querySelector(`[name="${key}"]`);
      if (input) input.value = Number(this.assignment[key].toFixed(2));
    }
    this.#updateUnits(); this.preview?.update(this.assignment);
  }

  fitToScene() { this.assignment = { ...this.assignment, ...sceneRect(this.scene), rotation: 0 }; this.#syncFields(); }
  resetAlignment() { this.assignment = { ...this.original }; this.#syncFields(); }

  async saveAlignment() {
    requireGM();
    if (this.#saving) return;
    for (const input of this.element?.querySelectorAll('input[type="number"]') ?? []) if (!input.reportValidity()) return;
    this.#saving = true;
    try {
      await saveAssignment(this.scene, this.levelId, this.userId, this.assignment);
      this.onSave(); ui.notifications.info(t("saved")); await this.close();
    } finally { this.#saving = false; }
  }

  _onClose(options) {
    this.#listeners?.abort(); this.preview?.destroy(); alignmentEditors.delete(this);
    super._onClose(options);
  }
}
