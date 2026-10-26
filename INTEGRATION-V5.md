# PAPERROUTE living summer code

This is an update for the existing PAPERROUTE checkout. The source bundle keeps
repository-relative paths. Copy them into that checkout; existing UI components,
hosting configuration and approved base GLBs remain necessary.

## Runtime

- `components/game/skydome.mjs`: inward sphere, full equirectangular coordinates,
  narrow seam blending, aligned cloud horizon and clear polar caps.
- `components/game/ocean-shader.mjs`: cyan/blue depth bands, animated shoreline
  foam, broken sun-reflection path. Integrated by `visual-style.mjs`.
- `engine/living-world.mjs`: seeded resident state machines, town coordinates,
  sidewalk bounds, deterministic timing, pause/reset and pose parameters.
- `components/game/npc-view.mjs`: articulated hips, shoulders, elbows and knees,
  tea-cup visibility and broom sweep. `scene.mjs` connects it to simulation ticks.

`TOWN` sets commercial locations. `LivingWorld` creates 26 independent residents.
`updateTo(sim.tick)` avoids render-rate drift; don't update with wall-clock time.
Outfits: yukata, jinbei, maekake, school uniform and a light summer wrap outfit.
NPCs are decorative residents and are excluded from rider hazard collisions.

## Blender

Use Blender 4.2 or the official `bpy==4.2.0` Python 3.11 wheel.
First run `art/generate_assets.py`, then `art/generate_living_world.py`.
The second generator preserves base houses/rider and adds/updates thirteen assets.
`art/run_bpy.py` and `art/run_living_world.py` are wrappers for the bpy wheel.
All final model topology is authored with vertex/face arrays. Tree lobes have
outward custom split normals; commercial AO maps use `art/bake_ao.py`.
The font subset is distributed under its included OFL license.

## Review and validation

`pnpm test`, `pnpm assets:validate`, `pnpm exec tsc --noEmit`, `pnpm build`.
`python art/render_turnarounds.py --world` produces 52 Cycles views.
`pnpm review:geometry` produces 248 CPU geometry/animation views.
`python scripts/review/living-sheets.py` assembles the review sheets.
The WebGL runner requires a supported running preview and captures ten sky angles.
Do not run an alternate browser to bypass a managed-preview restriction.

The current environment could not run live WebGL preview. Cycles and CPU geometry
captures validate geometry/poses, not runtime shader appearance or device FPS.
