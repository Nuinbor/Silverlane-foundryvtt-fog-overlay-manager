# SDD ledger — plan: docs/superpowers/plans/2026-11-13-fog-overlays.md

- Authority: user confirmed explored areas must stay revealed and delegated all remaining choices; original request authorizes commit and push.
- Baseline: clean main at cb5d02e; README and MIT license only; Node 24.14.1, npm 11.11.0; no existing tests.
- Ruling: work in this clean checkout on a feature branch, without creating a worktree — user requested this repository and delegated execution; no unrelated changes to isolate.
- Ruling: execute inline and do not pause for plan approval — user's explicit “дальше делай все на свое усмотрение” opts out of further design questions.
- Pre-flight: Task 1 helpers feed Tasks 2/3 with native Level IDs and scene-coordinate rectangles; consistent.
- Pre-flight: Task 2 native redraw lifecycle destroys Task 3 temporary previews; editors must cancel previews on canvasTearDown; consistent.
- Pre-flight: Task 4 packages Task 3 entry point, templates and locale paths listed by Task 1 manifest; consistent.
- API evidence: official v14.370 docs and the publicly served v14 demo confirm CanvasVisibility is a group, visibilityOverlay is a Sprite, sceneTextures.fogOverlay is preloaded locally, and drawCanvasVisibility fires after filter creation.
- Task 1: complete — 14 Node tests pass, commit 23419a9.
- Task 2: complete — 24 Node tests pass; local texture preloading/binding, native transform, serialized redraws, tile subclass and native form flags verified.
- Task 3: complete — 37 Node/DOM tests and 5 Chromium tests pass. Browser tests use actual PIXI 7.4.3 for movement, independent resizing, zoom coordinates, Escape and resource cleanup; no licensed Foundry session is claimed.
- Task 4: in progress — packaging, documentation and independent review.
- Ruling: opacity controls only the local GM alignment preview, not the player fog image — player opacity was not requested and native texture alpha avoids extra render targets.
- Task 1 RED: missing model/geometry modules. Initial implementation caught one incomplete test Level fixture (missing native id); corrected fixture, not production behavior.
