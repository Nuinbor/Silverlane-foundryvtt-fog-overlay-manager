import { sceneRect } from "./geometry.js";

export const MODULE_ID = "silverlane-fog-overlay-manager";
export const FLAG_ROOT = `flags.${MODULE_ID}`;

export function requireGM() {
  if (!globalThis.game?.user?.isGM) throw new Error("Only a GM can change fog overlays or tile visibility.");
}

export function getLevels(scene) {
  const levels = scene?.levels?.contents ?? (scene?.levels ? Array.from(scene.levels.values()) : []);
  return [...levels].sort((a, b) => (a.sort ?? a.index ?? 0) - (b.sort ?? b.index ?? 0));
}

function validPath(src) {
  return typeof src === "string" && !!src.trim() && src.length <= 4096
    && !/[\u0000-\u001f]/u.test(src) && !src.trim().startsWith("//")
    && !src.includes("\\") && (!src.includes(":") || /^https?:\/\//i.test(src));
}

const finite = (value, fallback, positive = false) => {
  if (value === "" || value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= 1e9 && (!positive || (n >= 1 && n <= 1e7)) ? n : fallback;
};

export function normalizeAssignment(value, rect) {
  if (!value || !validPath(value.src)) return null;
  const rotation = finite(value.rotation, 0);
  return {
    src: value.src.trim(),
    enabled: value.enabled !== false,
    x: finite(value.x, rect.x), y: finite(value.y, rect.y),
    width: finite(value.width, rect.width, true), height: finite(value.height, rect.height, true),
    rotation: ((rotation % 360) + 540) % 360 - 180
  };
}

export function readAssignment(scene, levelId, userId) {
  const value = scene?.flags?.[MODULE_ID]?.assignments?.[levelId]?.[userId];
  return normalizeAssignment(value, sceneRect(scene));
}

export async function saveAssignment(scene, levelId, userId, value) {
  requireGM();
  if (![levelId, userId].every(id => typeof id === "string" && /^[A-Za-z0-9_-]+$/.test(id))) {
    throw new Error("Invalid Level or user identifier.");
  }
  if (!getLevels(scene).some(level => level.id === levelId)) throw new Error("The Level no longer exists.");
  const path = `${FLAG_ROOT}.assignments.${levelId}`;
  if (value === null) return scene.update({ [`${path}.-=${userId}`]: null });
  const normalized = normalizeAssignment(value, sceneRect(scene));
  if (!normalized) throw new Error("A valid image path is required.");
  for (const field of ["x", "y", "width", "height", "rotation"]) {
    if (value[field] !== undefined && (!Number.isFinite(Number(value[field]))
      || Math.abs(Number(value[field])) > 1e9
      || (["width", "height"].includes(field) && (Number(value[field]) < 1 || Number(value[field]) > 1e7)))) {
      throw new Error(`Invalid image ${field}.`);
    }
  }
  return scene.update({ [`${path}.${userId}`]: normalized });
}

export function canViewTile(document, user) {
  if (user?.isGM) return true;
  const visibility = document?.flags?.[MODULE_ID]?.visibility;
  return visibility?.restricted !== true || visibility.users?.[user?.id] === true;
}
