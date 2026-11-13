# Silverlane Fog Overlay Manager — design

## Intent and authority

Build a Foundry VTT v14 module in this repository and push its code to origin.
The GM assigns different dungeon-plan images to different users on each floor,
and aligns smaller floor plans without changing scene dimensions. The user
confirmed that exploration permanently removes the image and delegated the
remaining design and implementation decisions to the implementer.

## Goals

- GM-only scene manager: users in rows, native scene Levels in columns.
- Each cell has an image path, Foundry image picker, alignment editor, and clear.
- Independent X/Y position, width/height and rotation per assignment; local GM preview opacity.
- Interactive canvas alignment with drag and independent resize handles,
  numeric fields, fit-to-scene and reset; changes reach players only on save.
- Use Foundry's actual saved fog exploration, including per-Level persistence.
- Respect native v14 level selection and scenes migrated by Levels 7.x.
- Tile configuration can restrict a tile to selected users. GMs always see it;
  native hidden/level/occlusion rules still apply for permitted players.
- Russian and English UI, automated tests, installable ZIP and release workflow.

## Constraints and non-goals

Foundry 14 only, system agnostic, no runtime dependencies. Do not emulate the
retired Levels v13 rendering engine or migrate scenes automatically. Levels 7.x
is an optional migration companion, not a mandatory dependency. Do not reset,
replace, or duplicate FogExploration documents. Resetting fog in Foundry will
naturally cover the map again; “permanent” means until a normal GM fog reset.
Respect shared exploration when the scene enables it; per-player remembered
exploration requires Foundry's individual exploration mode.

Client-side tile visibility is a presentation filter, not file-access security.
Foundry sends scene documents to clients; asset URLs must not be treated as
secrets. A permitted tile is not forced visible through native hidden/floor
rules. Tile light/weather restrictions are not personalized by this module.

## Approaches and implementation decisions

1. A second fog mask above the scene: flexible but would have to reproduce
   exploration, lighting, and Level transitions. Rejected for unnecessary risk.
2. Locally substitute Foundry's native fog overlay texture and its transform:
   selected by the implementer, using the user's delegated discretion. The
   existing visibility filter clips the image against both current vision and
   saved exploration; native fog remains the source of truth.

At `canvasInit`, set this client's `canvas.sceneTextures.fogOverlay` only when
an enabled assignment exists for its user and current Level. Foundry preloads
the texture and creates the native filter with the correct texture reference.
At `drawCanvasVisibility`, align `visibilityOverlay` in scene coordinates and
set the filter's overlay dimensions to unity to disable native auto-tiling.
The native shader handles clipping outside image bounds and exploration. The
GM preview has its own opacity slider for alignment; player images use native
texture alpha without creating extra GPU textures. Assignment changes trigger a serialized,
debounced native canvas redraw; updates are not streamed while dragging.

Store assignments on Scene flags under `silverlane-fog-overlay-manager`, keyed
by native Level ID and user ID. Write individual cell paths, not entire tables,
to avoid clobbering concurrent changes. Defaults fit the image to the unpadded
scene rectangle; pixel dimensions and grid-unit dimensions are displayed.
Alignment runs on the GM's currently viewed floor with a clearly labelled
temporary image above the map, never as a player-facing tile.

Use ApplicationV2/Handlebars windows, Foundry's namespaced FilePicker, native
scene controls and scene-directory context menu, plus a module settings menu.
Tile visibility extends the configured Tile class at init and composes native
`isVisible`; store a boolean restriction plus explicit per-user booleans as
normal Tile flags via its existing form.

## Verification and handoff

Node tests cover data normalization, geometry, sparse writes, permissions,
native overlay lifecycle and races. DOM tests cover templates and tile form
fields; browser tests exercise pointer alignment and use actual PIXI where
possible. Validate manifest, locale parity, syntax, templates and packaged
paths. Include a two-player/two-floor real-Foundry acceptance checklist. Without
a licensed v14 instance, do not claim an end-to-end Foundry session was tested.
