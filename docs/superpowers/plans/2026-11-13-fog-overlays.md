# Fog overlays implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver and push a v14 per-user/per-floor fog image manager with tile visibility controls.

**Architecture:** Pure data/geometry utilities feed GM-only ApplicationV2 windows and a small native-fog adapter. Native Foundry fog exploration is retained; no extra player mask or fog documents.

**Tech Stack:** JavaScript ESM, Foundry v14, PIXI v7, Handlebars, Node test runner, jsdom, Playwright, fflate (development only).

**Spec:** `docs/superpowers/specs/2026-11-13-fog-overlay-design.md`

## Global Constraints

- Foundry 14 only, system agnostic, no runtime dependencies.
- Russian and English UI.
- Only GM writes; no new sockets, scene migrations or fog resets.
- Never overwrite unrelated scene or tile flags.
- Native exploration and visibility remain authoritative.

## Review Focus

- Nonzero scene padding must not shift an overlay: geometry tests use sceneX=200 and sceneY=100.
- Empty restrictions hide a tile from every player, not everyone except one: permission tests cover empty maps.
- Delayed image loads after a scene/Level change must not attach stale previews: lifecycle race tests.
- Clearing one assignment must preserve other users/floors: sparse write tests.
- Abandoned editors and repeated redraws must not leak sprites/listeners or modify player views: lifecycle and browser tests.

### Task 1: Validated configuration and geometry

**Files:** `package.json`, `module.json`, `scripts/model.js`, `scripts/geometry.js`, `tests/model.test.js`, `tests/geometry.test.js`.

**Interfaces:** `MODULE_ID`; `getLevels(scene)`; `readAssignment(scene, levelId, userId)`; `normalizeAssignment(value, rect)`; `saveAssignment(scene, levelId, userId, value)`; `canViewTile(document, user)`; `sceneRect(scene)`; `resizeRect(start, handle, delta, options)`.

- [x] Write failing tests for floor ordering, missing assignments, invalid dimensions, safe paths, sparse updates, GM authorization, tile restrictions, padded scene coordinates and rotated resize geometry.
- [x] Run `npm test`; confirm absent behavior fails.
- [x] Implement the pure helpers and manifest; rerun the complete suite.
- [x] Commit the test-backed model and geometry.

### Task 2: Native fog and tile integration

**Files:** `scripts/fog.js`, `scripts/tiles.js`, `tests/fog.test.js`, `tests/tiles.test.js`.

**Interfaces:** `FogOverlayController` with `onCanvasInit(canvas)`, `onVisibilityDraw(group)`, `requestRedraw()`; `installTileVisibility()`; `injectTileVisibility(app, html)`.

- [x] Write failing boundary tests for selecting only the local user's Level assignment, unity dimensions (no tiling), fallbacks, native visibility composition and form persistence.
- [x] Run targeted tests; implement the adapters; run the suite.
- [x] Commit native integrations.

### Task 3: Manager and interactive alignment

**Files:** `scripts/manager.js`, `scripts/alignment.js`, `scripts/main.js`, `templates/*.hbs`, `styles/module.css`, `lang/{en,ru}.json`, `tests/ui.test.js`, `tests/browser/*`.

**Interfaces:** `FogOverlayManager({scene})`; `AlignmentEditor({scene, levelId, userId, assignment, onSave})`; `CanvasAlignmentPreview` owns its PIXI container/listeners and async generation guard.

- [x] Write failing DOM and browser tests for matrix layout, picking paths, drag/resize, cancel, delayed loads and save permissions.
- [x] Implement ApplicationV2 manager, alignment editor/preview and entry-point registration.
- [x] Run Node and browser suites and commit.

### Task 4: Packaging, documentation and final review

**Files:** `tools/check.mjs`, `tools/build.mjs`, `.github/workflows/*.yml`, `README.md`, `docs/TESTING.md`, `CHANGELOG.md`.

**Interfaces:** `npm run check`, `npm test`, `npm run test:browser`, `npm run build`.

- [x] Write a failing package round-trip test; implement deterministic ZIP packaging and artifact checks.
- [x] Document Russian installation, UI usage, v14/Levels and shared-fog caveats and the real-Foundry acceptance checklist.
- [x] Run all checks, review complete diff, resolve important findings with regression tests.
- [ ] Commit, integrate safely into main, push origin main and verify remote SHA.
