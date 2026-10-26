# PAPERROUTE — horizon framing / checkpoint 07

All 42 Blender GLBs are integrated, including 24 phase 4.5 detailed models.
The deterministic simulation, controls and delivery rules are preserved.

## Camera

`components/game/chase-camera.mjs` uses a 9.6 m rear offset, 2.65 m height,
20 m forward target distance and 1.2° upward pitch. Vertical FOV stays exactly
68° across sprint, portrait, landscape and reset. Target height comes from the
camera height so the hill cannot pull the view down. Follow rate is 9/s, heading
damping 5.5/s, and maximum pivot 0.085 radians. There is no depth-of-field blur.

## Sky and water

`skydome.mjs` keeps the BackSide sphere, seam blend and polar cloud fade. The
existing painted panorama is regraded in linear light, retaining its brushwork.
The cloud bank rotates 0.20 of a turn toward the road.

| Element | sRGB palette |
| --- | --- |
| Zenith / blue sky | `#0872c0` / `#168fce` |
| Horizon / cloud light / cloud shade | `#e2e8d4` / `#fff4d6` / `#77b0d0` |
| Shallow / deep water | `#32abb9` / `#185887` |
| Foam / sun glints / water haze | `#e8f2dd` / `#ffe5ad` / `#c8dfd9` |

`ocean-shader.mjs` adds broad quantized waves and slow pigment variation. Foam
ribbons use screen derivatives; distant sparkle detail fades to reduce aliasing.
`visual-style.mjs` uses warm gray-green asphalt and haze from 115 to 330 m, with
a separate distant-water blend. The warm sun and bounded local-light pool remain.

## Assets and reviews

The final Kei cab meets its roof, avoids coincident body panels and places side
glazing outside the cab skin. Regenerated paint/AO and four turnarounds are
included. The car and near trees also have current four-view Cycles evidence.
Keep the shared texture directory beside the GLBs.

`world-layout.mjs` owns static placement. The runtime and the new
`scripts/review/export-composition.mjs` consume the same matrices. The latter
exports desktop, portrait and bay camera studies for `art/render_composition.py`.
The manifests include source hashes and exact camera parameters. Cycles
approximates lighting and does not execute the live toon, sky or water GLSL.

## Validation scope

50 tests cover deterministic simulation, NPC schedules, crash recovery, ballistic
prediction, camera damping/framing, materials, light budgets, placement and
capture freshness. TypeScript and asset validation run before the production
build. Current evidence is in `public/review/`.

The supervised preview reports an unavailable mailbox. Consequently no current
WebGL screenshots, GPU compilation result or measured mobile FPS are claimed.
The real WebGL harness is included for a running local game; see README.md.
No alternative server was started to bypass the preview restriction.
