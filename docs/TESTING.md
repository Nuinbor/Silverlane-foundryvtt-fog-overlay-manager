# Verification and real-Foundry acceptance

## Automated coverage

Run `npm run check`, `npm test`, `npm run test:browser`, `npm run build`.
Node/DOM tests exercise real module logic at Foundry boundaries; Chromium uses
actual PIXI 7.4.3 for interactive drag, resize, zoom and cancellation. The small
ApplicationV2 double in `tests/helpers` is not packaged and does not prove
Foundry's application lifecycle or server persistence.

No licensed local Foundry v14 installation was available during initial
implementation. Real multi-client acceptance below is still required before
calling the initial version production-verified.

## Setup

- Back up the world; use a disposable copy on Foundry v14.
- Enable this module alone first, then repeat with Levels 7.x enabled and a scene
  already migrated to native v14 Levels. Add other production modules last.
- Create GM, Alice and Bob users. Log into separate browser profiles, not tabs
  sharing the same session cookie. Give each player an owned token.
- Create a 2000×2000 scene, 100px grid at 5ft, nonzero padding, two native Levels
  (ground and upper), walls and a different map on each.
- Enable Token Vision and individual exploration. Configure a conspicuous normal
  fog color and native Level fog image so fallback is obvious.

## Assignment and geometry

1. Open the matrix from token controls, Scene context and module settings. Confirm
   two player rows and two floor columns, including offline users; no GM row.
2. Assign different files to Alice/Bob on both Levels. Reload: each sees only
   their assigned image for the currently viewed floor.
3. On upper/Alice, set 1500×1200px; editor reports 75×60ft. Align to that floor
   inside the 100×100ft scene and save. Scene dimensions must not change.
4. Try every handle, independent axes, negative X/Y, fractions, rotation, padding,
   zoom and pan. No image repeats beyond its rectangle; normal fog fills outside.
5. Opacity changes only the GM preview. Neither player sees temporary edits.
6. Drag and Escape restores pre-drag geometry. Cancel/close performs no write.
   Switch scene/floor while editing or loading: no stale preview/listeners.
7. Disable a cell and clear another: native fog returns, other cells and unrelated
   scene flags survive. Two GMs can edit different cells; same-cell last save wins.

## Exploration: essential acceptance

1. Alice explores a room on ground. Her overlay disappears; Bob's stays covered
   in individual-exploration mode.
2. Alice walks away. The room remains revealed in normal remembered-fog style,
   not re-covered by the overlay. Tokens outside current sight must not leak.
3. Change to upper/back: ground remembers the room; upper has its own exploration
   and image. Repeat using token-driven floor transitions.
4. Log Alice out, move her token as GM, log in. Reload, rejoin scene and restart
   world: saved knowledge follows native Foundry behavior.
5. Reset fog with Foundry's GM control: reset areas become covered again.
6. Enable shared exploration: shared revealed areas, different images. Disable
   exploration or Token Vision: manager warns and override becomes inactive.
7. Check global illumination, darkness, walls, no controlled token, multiple owned
   tokens, vision modes and below-floor visibility. Native vision stays intact.

## Tiles

1. Restrict a tile to Alice, save native Tile Configuration. Alice sees it, Bob
   does not, GM can manage it. Reload/switch Levels: restriction persists.
2. Native hidden flag hides it even from Alice. Native floor membership remains
   authoritative; permission must not force a tile visible on the wrong floor.
3. Nobody selected + restricted: neither player sees it. Disable restriction:
   normal display returns, including for newly created users.
4. Toggle repeatedly; create, duplicate, redraw, delete restricted tiles. No old
   mesh remains on a player's primary canvas.
5. This is intentionally a visual filter, not server-side asset security. Native
   tile light/weather restrictions stay shared regardless of this filter.

## Failure handling and cleanup

- Bad/removed local image or blocked CORS URL: no map reveal; native fog fallback.
- A player cannot open the manager or persist assignments via its API.
- NaN/infinity/nonpositive sizes cannot be saved to PIXI.
- Repeated preview open/close preserves cached textures and unrelated children;
  check console for unhandled errors and accumulated listeners.
- Disable module and reload all clients: native fog/tiles return. Flags remain
  inert; no migration or destructive cleanup macro needed.
- Install packaged ZIP on a fresh test world, not just the development checkout.
