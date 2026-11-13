/** Narrow ApplicationV2 boundary double; this is NOT a Foundry runtime. */
export function installFoundryUI() {
  class ApplicationV2 {
    static DEFAULT_OPTIONS = {};
    constructor(options = {}) { this.options = options; }
    async _prepareContext() { return {}; }
    _onRender() {}
    _onClose() {}
    async close() { this._onClose(); this.element?.remove(); }
    async render() { return this; }
  }
  globalThis.foundry = { applications: { api: { ApplicationV2, HandlebarsApplicationMixin: Base => Base }, apps: {} } };
}
