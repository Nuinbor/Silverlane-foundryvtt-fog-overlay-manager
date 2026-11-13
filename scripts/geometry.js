/** The map rectangle, excluding Foundry's surrounding scene padding. */
export function sceneRect(scene) {
  const d = scene?.dimensions;
  return {
    x: d?.sceneX ?? 0,
    y: d?.sceneY ?? 0,
    width: scene?.width ?? d?.sceneWidth ?? 1,
    height: scene?.height ?? d?.sceneHeight ?? 1
  };
}

export function moveRect(start, delta) {
  return { ...start, x: start.x + delta.x, y: start.y + delta.y };
}

/** Rotate the pointer delta into image-local axes; keep the opposite edge fixed. */
export function resizeRect(start, handle, delta, { minSize = 1 } = {}) {
  const theta = (start.rotation ?? 0) * Math.PI / 180;
  const cos = Math.cos(theta), sin = Math.sin(theta);
  const dx = delta.x * cos + delta.y * sin;
  const dy = -delta.x * sin + delta.y * cos;
  const sx = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
  const sy = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
  const width = sx ? Math.max(minSize, start.width + sx * dx) : start.width;
  const height = sy ? Math.max(minSize, start.height + sy * dy) : start.height;
  const cx = sx * (width - start.width) / 2;
  const cy = sy * (height - start.height) / 2;
  return {
    ...start,
    x: start.x + cx * cos - cy * sin - (width - start.width) / 2,
    y: start.y + cx * sin + cy * cos - (height - start.height) / 2,
    width, height
  };
}
