import { requireGM } from "./model.js";
import { moveRect, resizeRect } from "./geometry.js";

const HANDLES = { nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0] };

/** A GM-local alignment gizmo. Does not create Tile documents or network messages. */
export class CanvasAlignmentPreview {
  #generation = 0;
  #closed = false;
  #container;
  #sprite;
  #gizmo;
  #frame;
  #handles = new Map();
  #listeners;
  #drag = null;
  #sceneId;
  #levelId;

  constructor({ canvas, assignment, onChange = () => {},
    loadTexture = src => foundry.canvas.loadTexture(src), onError = console.error }) {
    this.canvas = canvas;
    this.assignment = { ...assignment };
    this.onChange = onChange;
    this.loadTexture = loadTexture;
    this.onError = onError;
    this.#sceneId = canvas.scene?.id;
    this.#levelId = canvas.level?.id;
  }

  #isCurrent(generation) {
    return !this.#closed && generation === this.#generation && this.canvas.ready
      && this.canvas.scene?.id === this.#sceneId && this.canvas.level?.id === this.#levelId;
  }

  async start() {
    requireGM();
    const generation = ++this.#generation;
    let texture;
    try { texture = await this.loadTexture(this.assignment.src); }
    catch (error) { if (this.#isCurrent(generation)) this.onError(error); return false; }
    if (!this.#isCurrent(generation)) return false;
    if (!texture?.valid) { this.onError(new Error("The image could not be loaded.")); return false; }
    this.#container = new PIXI.Container();
    this.#container.name = "silverlane-alignment-preview";
    this.#sprite = this.#container.addChild(new PIXI.Sprite(texture));
    this.#sprite.anchor.set(0.5);
    this.#sprite.alpha = 0.55;
    this.#sprite.eventMode = "static";
    this.#sprite.cursor = "move";
    this.#sprite.on("pointerdown", event => this.#beginDrag(event, "move"));
    this.#gizmo = this.#container.addChild(new PIXI.Container());
    this.#frame = this.#gizmo.addChild(new PIXI.Graphics());
    for (const handle of Object.keys(HANDLES)) {
      const graphics = this.#gizmo.addChild(new PIXI.Graphics());
      graphics.eventMode = "static";
      graphics.cursor = `${handle}-resize`;
      graphics.on("pointerdown", event => this.#beginDrag(event, handle));
      this.#handles.set(handle, graphics);
    }
    this.canvas.interface.addChild(this.#container);
    this.#listeners = new AbortController();
    const options = { capture: true, signal: this.#listeners.signal };
    window.addEventListener("pointermove", event => this.#moveDrag(event), options);
    window.addEventListener("pointerup", event => this.#endDrag(event), options);
    window.addEventListener("pointercancel", () => this.#cancelDrag(), options);
    window.addEventListener("blur", () => this.#cancelDrag(), options);
    window.addEventListener("keydown", event => {
      if (event.key === "Escape" && this.#drag) {
        event.preventDefault(); event.stopImmediatePropagation(); this.#cancelDrag();
      }
    }, options);
    this.refresh();
    return true;
  }

  #point(event) {
    const native = event.nativeEvent ?? event;
    return this.canvas.canvasCoordinatesFromClient({ x: native.clientX, y: native.clientY });
  }

  #beginDrag(event, handle) {
    if (event.button !== 0 || !game.user.isGM) return;
    event.stopPropagation(); event.preventDefault?.();
    this.#drag = { handle, start: { ...this.assignment }, point: this.#point(event), pointerId: event.pointerId };
  }

  #moveDrag(event) {
    if (!this.#drag || event.pointerId !== this.#drag.pointerId) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const point = this.#point(event), drag = this.#drag;
    const delta = { x: point.x - drag.point.x, y: point.y - drag.point.y };
    this.update(drag.handle === "move" ? moveRect(drag.start, delta) : resizeRect(drag.start, drag.handle, delta));
    this.onChange({ ...this.assignment });
  }

  #endDrag(event) {
    if (!this.#drag || event.pointerId !== this.#drag.pointerId) return;
    this.#moveDrag(event);
    this.#drag = null;
  }

  #cancelDrag() {
    if (!this.#drag) return;
    this.update(this.#drag.start); this.#drag = null;
    this.onChange({ ...this.assignment });
  }

  update(assignment) { this.assignment = { ...assignment }; this.refresh(); }

  setOpacity(alpha) { if (this.#sprite) this.#sprite.alpha = Math.max(0.05, Math.min(1, Number(alpha))); }

  refresh() {
    if (!this.#container || this.#closed) return;
    const { x, y, width, height, rotation = 0 } = this.assignment;
    const cx = x + width / 2, cy = y + height / 2, radians = rotation * Math.PI / 180;
    this.#sprite.position.set(cx, cy); this.#sprite.width = width; this.#sprite.height = height; this.#sprite.rotation = radians;
    this.#gizmo.position.set(cx, cy); this.#gizmo.rotation = radians;
    const zoom = Math.max(0.05, this.canvas.stage.scale.x);
    this.#frame.clear().lineStyle(2 / zoom, 0xe6b958, 1).drawRect(-width / 2, -height / 2, width, height);
    const size = 12 / zoom;
    for (const [name, g] of this.#handles) {
      const [hx, hy] = HANDLES[name];
      g.position.set(hx * width / 2, hy * height / 2);
      g.clear().lineStyle(1 / zoom, 0x121820).beginFill(0xe6b958).drawRect(-size / 2, -size / 2, size, size).endFill();
    }
  }

  destroy() {
    this.#closed = true; this.#generation++; this.#drag = null;
    this.#listeners?.abort();
    this.#container?.parent?.removeChild(this.#container);
    this.#container?.destroy({ children: true, texture: false, baseTexture: false });
    this.#container = null; this.#handles.clear();
  }
}
