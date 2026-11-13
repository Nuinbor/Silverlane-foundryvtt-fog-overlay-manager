import { MODULE_ID, FLAG_ROOT, canViewTile } from "./model.js";

const t = key => game.i18n.localize(`SFO.${key}`);

export function installTileVisibility() {
  const Base = CONFIG.Tile.objectClass;
  CONFIG.Tile.objectClass = class SilverlaneTile extends Base {
    get isVisible() { return canViewTile(this.document, game.user) && super.isVisible; }
    get isInteractable() { return canViewTile(this.document, game.user) && super.isInteractable; }
  };
}

/** Native TileConfig submits these flags with the rest of its normal form. */
export function injectTileVisibility(app, html) {
  if (!game.user.isGM) return;
  const root = html?.[0] ?? html;
  if (!root?.querySelector || root.querySelector("fieldset[data-silverlane]")) return;
  const form = root.matches?.("form") ? root : root.querySelector("form");
  if (!form) return;
  const visibility = app.document?.flags?.[MODULE_ID]?.visibility ?? {};
  const fieldset = document.createElement("fieldset");
  fieldset.dataset.silverlane = "visibility";
  fieldset.className = "sfo-tile-visibility";
  const legend = fieldset.appendChild(document.createElement("legend"));
  legend.textContent = t("tileTitle");

  const checkbox = (name, labelText, checked) => {
    const label = fieldset.appendChild(document.createElement("label"));
    const input = label.appendChild(document.createElement("input"));
    input.type = "checkbox"; input.name = name; input.checked = checked;
    label.appendChild(document.createTextNode(` ${labelText}`));
    return input;
  };
  checkbox(`${FLAG_ROOT}.visibility.restricted`, t("tileRestrict"), visibility.restricted === true);
  for (const user of game.users) {
    if (!user.isGM) checkbox(`${FLAG_ROOT}.visibility.users.${user.id}`, user.name, visibility.users?.[user.id] === true);
  }
  const hint = fieldset.appendChild(document.createElement("p"));
  hint.className = "hint"; hint.textContent = t("tileHint");
  const tab = form.querySelector('.tab[data-tab="basic"], .tab[data-tab="appearance"]');
  if (tab) tab.appendChild(fieldset);
  else form.insertBefore(fieldset, form.querySelector(":scope > footer"));
}

export function refreshTileVisibility(document) {
  document.object?.renderFlags.set({ refreshState: true, refreshVisibility: true });
}
