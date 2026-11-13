import { readAssignment } from "./model.js";

/** Adapts the client's native fog texture; never writes exploration or scene data. */
export class FogOverlayController {
  #active = null;
  #timer = null;
  #running = false;
  #dirty = false;
  #waiters = [];

  constructor({ getCanvas = () => globalThis.canvas,
    getTexture = src => foundry.canvas.getTexture(src),
    onError = error => console.error("Silverlane Fog Overlay Manager", error), redrawDelay = 100 } = {}) {
    this.getCanvas = getCanvas;
    this.getTexture = getTexture;
    this.onError = onError;
    this.redrawDelay = redrawDelay;
  }

  onCanvasInit(canvas) {
    this.#active = null;
    if (game.user.isGM || !canvas.scene?.tokenVision || !(canvas.scene.fog?.mode > 0)) return;
    const assignment = readAssignment(canvas.scene, canvas.level?.id, game.user.id);
    if (!assignment?.enabled) return;
    this.#active = { sceneId: canvas.scene.id, levelId: canvas.level.id, assignment, loaded: false };
    canvas.sceneTextures.fogOverlay = assignment.src;
    canvas.loadTexturesOptions.additionalSources.push(assignment.src);
  }

  #matches(canvas) {
    return this.#active && canvas?.scene?.id === this.#active.sceneId && canvas?.level?.id === this.#active.levelId;
  }

  onCanvasDraw(canvas) {
    if (!this.#matches(canvas)) return;
    const texture = this.getTexture(this.#active.assignment.src);
    if (!texture?.valid) {
      // Let Foundry fall back to the Level's normal fog image/colour.
      if (canvas.sceneTextures.fogOverlay === this.#active.assignment.src) delete canvas.sceneTextures.fogOverlay;
      return;
    }
    // Bind the cached Texture explicitly: v14 builds differ in how named string
    // sceneTextures entries are normalized during their preload step.
    canvas.sceneTextures.fogOverlay = texture;
    this.#active.loaded = true;
  }

  onVisibilityDraw(group) {
    if (!this.#matches(this.getCanvas()) || !this.#active.loaded) return;
    const sprite = group.visibilityOverlay, uniforms = group.filter?.uniforms;
    if (!sprite || !uniforms) return;
    const a = this.#active.assignment;
    // A same-sized native overlay may have inherited a mirrored/skewed
    // background transform. Assigning width preserves its scale sign in PIXI.
    sprite.scale.set(1, 1);
    sprite.skew.set(0, 0);
    sprite.pivot.set(0, 0);
    sprite.anchor.set(0.5);
    sprite.position.set(a.x + a.width / 2, a.y + a.height / 2);
    sprite.width = a.width;
    sprite.height = a.height;
    sprite.rotation = a.rotation * Math.PI / 180;
    // Native filter still clips against vision and saved exploration. Only
    // automatic texture tiling/tinting is disabled for this local assignment.
    uniforms.dimensions = [1, 1, 1, 1];
    uniforms.backgroundColor = [1, 1, 1];
  }

  onLightingRefresh() {
    const canvas = this.getCanvas();
    if (!this.#matches(canvas) || !this.#active.loaded) return;
    // Core refreshLighting reapplies the scene background tint, including on
    // initial perception. Reassert only for this client's active custom image.
    const uniforms = canvas.visibility?.filter?.uniforms;
    if (uniforms) uniforms.backgroundColor = [1, 1, 1];
  }

  /** Resolve after all coalesced redraws; callers may await this via the API. */
  requestRedraw() {
    this.#dirty = true;
    const done = new Promise(resolve => this.#waiters.push(resolve));
    if (!this.#timer && !this.#running) this.#schedule();
    return done;
  }

  #schedule(delay = this.redrawDelay) {
    this.#timer = setTimeout(() => { this.#timer = null; void this.#flush(); }, delay);
  }

  async #flush() {
    const canvas = this.getCanvas();
    if (canvas?.scene && canvas.loading) { this.#schedule(100); return; }
    this.#dirty = false;
    this.#running = true;
    try {
      if (canvas?.scene && canvas.ready) await canvas.draw(canvas.scene);
    } catch (error) {
      this.onError(error);
    } finally {
      this.#running = false;
      if (this.#dirty) this.#schedule();
      else this.#waiters.splice(0).forEach(resolve => resolve());
    }
  }
}
