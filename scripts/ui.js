export const t = key => game.i18n.localize(`SFO.${key}`);

export function reportError(error) {
  console.error("Silverlane Fog Overlay Manager", error);
  ui.notifications.error(t("error"));
}
