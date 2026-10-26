# PAPERROUTE — low horizon checkpoint 07

The 42-asset town is integrated with a fixed 68° chase view, lower camera,
cerulean sky grading and a cyan ocean palette. See `INTEGRATION-V7.md`.
All 50 tests, TypeScript and asset validation pass.

`public/review/horizon-v7/` contains desktop, portrait and bay camera studies,
exact camera/layout data and source hashes. These are Blender Cycles renders of
the actual GLBs using live camera and placement matrices, not WebGL captures.
The three studies were visually reviewed for framing.

There are 96 current detailed Cycles turnarounds and 284 CPU geometry/state
captures. Review corrected the Kei cab overlap/roof join and side glazing.
The supervised WebGL preview remains unavailable. GPU shader appearance,
compilation and mobile FPS remain unverified. The capture harness is included.

## Earlier checkpoints

# PAPERROUTE — detail polish checkpoint 06

Current code and asset integration is documented in `INTEGRATION-V6.md`.
The review harness targets 96 Cycles turnarounds for the 24 detailed assets,
and 284 Three.js CPU geometry/state captures for the complete 42-asset manifest.
New review sheets and downloadable source/assets are in `public/review/detail-v6/`.

The review loop corrected overly dark texture encoding, disconnected trunk rings,
mirrored plate lettering and a gap below the compact car cabin. The final car
and Kei pickup have small bevels on their body edges; vehicle lights and entry
lanterns have emitting lenses/paper plus authored point-light anchors.

Blender review fixtures use Cycles point lighting. The running Three.js game uses
four pooled direct lights and four weaker reflected fills. These are different
renderers; the Cycles images are not evidence of WebGL shader compilation or
full-scene performance. The supervised preview remains unavailable.

## Earlier checkpoints

# PAPERROUTE — living summer checkpoint 05

Sky, ocean, forest boundary, shops and 26 independent residents are implemented.
52 Blender Cycles asset views and 248 Three.js CPU geometry/state views provide
review evidence. Current sheets live in `public/review/living-v5/`.

Validation completed: 41/41 automated tests, TypeScript and production build.
All 33 GLBs pass geometry, pivot, AO and scoped size budgets: 8,113,572 bytes total.
All 52 Cycles views and 248 CPU geometry/state views match current source hashes.

- `wardrobe-turnarounds.jpg`: all five Japanese summer outfits, four views each.
- `town-turnarounds.jpg`: shops, vending machine, streetlight and smooth trees.
- `resident-behaviors.jpg`: deterministic walking/drinking/sweeping/looking poses.
- `living-v5-turnarounds.zip`: full Cycles images and review sheets.

These are actual GLB renders. They are not live WebGL screenshots. The supervised
preview daemon remains unavailable, so final sky/foam/glow appearance and device
performance need runtime visual review. No unchanged retry or alternate browser
was used to bypass that constraint.

## Earlier checkpoints

# PAPERROUTE — Japanese close-up review (04)

Visual review approved by the user; merged into the main game for publication. Current artifacts are in `public/review/japanese-v4/`:

- `houses-turnarounds.jpg`: seven houses × front / side / rear / clay.
- `rider-turnaround.png`: upgraded character and bicycle, four views.
- `japanese-v4-turnarounds.zip`: all 32 full-resolution Cycles views and GLB hashes.

The 104 Three.js CPU geometry captures also cover every asset and animation pose.
These actual GLB renders are separate from live WebGL validation. The supervised
preview service reports an unavailable mailbox; toon outlines, sky wrap in free-look,
shader compilation and mobile performance still need runtime visual verification.
The approved checkpoint is now integrated into the main Three.js game. Publication status is recorded by Sites.

Validation completed: 35/35 automated tests, GLB AO/UV/budget checks, production build and TypeScript. The 22 GLBs total 6,031,692 bytes. All 32 Cycles captures match the current asset hashes.

## Earlier checkpoint history

# PAPERROUTE — checkpoint 03: third-person chase camera

## Current camera update

- Directly behind the bike at neutral steering: 8.4 m back, 3.8 m above road
  height, looking 12 m ahead down the hill.
- Smooth follow and a steering/lean pivot limited to about 4.9°. The pivot
  damps back to center on release while the horizon stays level.
- Speed-linked vertical FOV: 60–66° desktop, 64–70° portrait. Acceleration and
  deceleration ease the lens gradually. Restart resets the camera rig.
- Sky framing follows FOV and steering. Artwork, materials, lighting and UI
  are preserved. Target labels outside the camera frustum are hidden.
- The capture harness adds steering and sprint perspectives, with camera pose,
  FOV and revision metadata in a separate `chase-v3` output folder.

32 automated tests pass, including five new camera tests for framing,
turning/release, frame-rate-independent damping toward a fixed target, FOV,
restart and movement across screen orientations. Production build and TypeScript
checks pass. No assets or character poses changed; 96 geometry captures stay fresh.

Actual WebGL screenshots remain unavailable because the managed preview service
reports `sites-previewd mailbox is unavailable`. Framing and damping were checked
mathematically, not visually in WebGL. The published game and camera-icon PNG
export are available for visual review. No browser capture result is claimed.

## Previous checkpoint 02: summer visual polish

## Implemented

- A 1774 × 887 painted sky panorama with deep cobalt blue, towering white
  cumulonimbus and cream horizon haze. The 241 KB WebP is the backdrop texture,
  not a screenshot. Its screen framing tracks the camera horizon and aspect.
- Separate painted toon material variants for buildings and props, foliage,
  roads and water. All keep Three.js lighting/shadow integration. Foliage has
  painted upward highlights, smooth normals and per-vertex pigment variation.
- Warm sunlight, a 2,048 px PCF soft shadow map following the rider, and nearby
  fence placement at the garden edge. The bicycle, tree/fence casters and
  receiving asphalt remain inside the tested shadow frustum along the route.
- A lower diagonal camera: the horizon stays around 21–23% from the top on
  standard desktop and phone views. A distant bay haze blend joins the sky.
- **Save WebGL frame**, the camera icon in the top bar, exports the actual
  current WebGL canvas as a PNG. Shader errors and context loss reject capture.

## Verified here

- 27 automated checks: all existing engine/pose/capture checks plus camera and
  bay visibility, sky aspect/horizon alignment, material shader integration,
  and shadow-frustum coverage. These check source integration and projection
  mathematics; they do not compile the shaders on a GPU.
- TypeScript validation, production build, GLB integrity and polygon budgets.
- All 20 assets exported by Blender 4.2.0 from authored Python topology.
  Seven house families. Total GLB size: **1,622,248 bytes**. Each model is below
  3,000 triangles. Rider: 2,204. Houses: 1,672–2,064. Trees: 2,044 each.
- Refreshed 96 front/side/rear/clay PNGs from the actual exported GLBs, using
  **Three.js SVGRenderer**. These are geometry and pose evidence only. The
  foliage geometry is smoother; the live painted shader is not shown in them.

## WebGL review remains pending

The managed browser preview service was unavailable in this session:
`sites-previewd mailbox is unavailable`. Consequently no actual WebGL renders
were captured here. Browser interaction, final shader output, responsive UI,
shadow appearance and mobile frame rate are still unverified. The published
visual changes must not be treated as visually approved from the CPU previews.

To review in a browser, open the updated game and use the camera icon for clean
scene PNGs, or **Asset studio → Capture checkpoint** for all 96 actual WebGL
turnarounds. `scripts/review/capture-webgl.mjs` automates this against a running
app. It records separate scene images, desktop/mobile interactions, shader
errors, actual renderer details and source hashes in a style-specific folder.
There is no WebGL results manifest until that runner completes successfully.

Please review the bay framing, cloud scale, foliage highlights and shadows in
the running game. The target is 60 fps on mobile; that is not a measured claim.
