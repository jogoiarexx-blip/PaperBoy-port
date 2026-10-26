# PAPERROUTE — The Summer Edition

A mobile-first, deterministic Three.js newspaper delivery game set on a bright
rural Japanese hill overlooking a bay. Checkpoint 07 integrates all 42 assets, detailed architecture, local lights, a low 68° chase camera and updated painted sky/ocean palettes.

## Two independent streams

| Stream | Source | Responsibility |
| --- | --- | --- |
| Engine | `engine/` | Fixed 60 Hz simulation, input intent, exact ballistic throws, hazards, score and lives |
| Style | `art/` | Authored Blender topology, split materials, vertex color variation, GLB export |
| Integration | `components/game/scene.mjs`, `visual-style.mjs` | GLB loading, painted toon materials, sky, sunlight, camera and capture studio |
| Review | `scripts/review/`, `public/review/` | Turnarounds and capture freshness gate |

## Play

Click **Let’s ride**. Drag horizontally to steer; release to immediately stop
steering and center the lean. Hold for 170 ms to pedal. Tap to throw along the
visible dotted arc. The arc and projectile use the same analytic trajectory.
On mobile, dedicated hold and throw buttons also support two-thumb play.
Desktop: A/D or arrows to steer, W/up to pedal, Space to throw, P/Escape to pause.

Marked mailboxes score 100 points plus combo bonuses. Point at an unmarked
window to see a risky aim; breaking it costs 150 points. Cars and garbage bins
cost a life. Dogs chase, can be outrun by pedaling, or distracted for six seconds
by a nearby newspaper. A 2.4-second recovery interval plus persistent contact
tracking prevents repeated damage from one continuous obstacle contact.

The route is 520 m, with 30 subscribers and 55 papers. The map uses seed 721.
Restart reproduces the same world; there is no network state or unseeded random
state in the simulation.

## Run and test

Extract PAPERROUTE-complete.zip and open a terminal in its PAPERROUTE folder.
Use Node 22.13+ and pnpm 11.25.0. Open the localhost address printed by pnpm dev
(normally port 5173). WebGL 2 is required. The download includes all source,
assets, textures, Blender scripts, tests and review images. Install dependencies
and build locally; credentials, caches and generated build output are excluded.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
pnpm exec tsc --noEmit
python scripts/validate_assets.py
```

## Generate Blender assets

With a standalone Blender 4.2 binary:

```sh
blender --background --python art/generate_assets.py -- --out public/assets
```

Or use Python 3.11 and the official Blender wheel:

```sh
python -m pip install bpy==4.2.0 Pillow
python art/run_bpy.py
python art/run_living_world.py
python art/run_detail_world.py
python scripts/validate_assets.py
```

The wheel wrapper avoids Blender's teardown crash in restricted containers only
after generation has completed successfully. Export errors still fail the run.
Every model is made with explicit vertex/face topology through mesh.from_pydata.
Static parts sharing a material are merged; rider pivots stay separate.

## Summer visual style

The camera frames a generated, painted cobalt sky panorama, with
large cumulonimbus clouds and warm horizon haze. `createSkydome` wraps it on a camera-centered sphere, blends the longitude seam
and removes cloud detail at the poles. The bay
uses a separate distant haze blend and sparse animated glints.

`components/game/visual-style.mjs` owns the style settings. Houses, roads and
props retain Three.js toon lighting and shadow support with pigment washes,
brush strokes and fine grain. Foliage adds smooth Blender normals, per-vertex
pigment variation, saturated greens and upward-facing brush highlights.

A warm directional sun follows the rider with a 2,048 px PCF soft shadow map.
Its tighter coverage includes the nearby bicycle, trees, fence and asphalt.
Camera projection tests keep the rider and distant bay inside the frustum on
mobile and desktop. GPU appearance and phone performance still need browser
review; these tests cannot establish either.

The original sky painting, generation brief and checksums are in `art/textures/`.
The optimized game texture is `public/textures/summer-sky-v5.webp`.
The current shader regrades its existing brushwork into cerulean blue, warm cloud
highlights and blue undersides; see `INTEGRATION-V7.md`.

## Third-person chase camera

`components/game/chase-camera.mjs` owns the camera independently of the engine.
The neutral view sits directly behind the bicycle: 9.6 m back and 2.65 m above
its road height, looking 1.2° above horizontal. Exponential lerp follows position;
steering and lean introduce a smoothly damped yaw of at most 4.9°. Release
recenters that pivot. The geographic horizon is about 51.6% down the screen.

Vertical FOV is exactly 68° in landscape, portrait and sprint. Reset restores the
rig immediately. Camera tests cover rider framing, steering, damping at
30/60/144 Hz, fixed FOV and reset. The deterministic simulation is unchanged.

## Review loop

After changing a model or animation, refresh the turnarounds before committing:

```sh
python art/render_turnarounds.py --detail
pnpm review:geometry
pnpm review:detail
node scripts/review/export-composition.mjs
python art/render_composition.py
pnpm test
```

Contact sheets require Pillow. A SHA-256 freshness test binds all 284 CPU captures to
the exported asset manifest and animation source. Stale captures fail the suite.
The checked-in CPU previews use Three.js SVGRenderer and are explicitly labeled
as geometry previews, not WebGL screenshots.

For real WebGL screenshots against a running app:

```sh
pnpm exec playwright install chromium
pnpm review:webgl --url http://localhost:5173
```

The runner captures every asset and pose in front, side, rear and clay views,
plus desktop/mobile gameplay. In the game, **Asset studio → Capture checkpoint**
does the same turnaround batch without developer tools. Files can be downloaded
individually. The camera icon in the top bar (**Save WebGL frame**) downloads
the actual current canvas as PNG, without the HUD. Capture rejects known shader
compilation errors and lost WebGL contexts.

The runner writes to `public/review/webgl/horizon-summer-v7-low-horizon-v7/`,
records source hashes, WebGL version, shader errors and render statistics, and
produces 284 turnarounds, ten sky directions and desktop/mobile scene/UI captures.
The review API is exposed only when the URL includes `?review=1`.

The 96 detailed asset turnarounds in `public/review/detail-v6/` and three camera
studies in `public/review/horizon-v7/` are Blender Cycles renders, not WebGL.
The camera studies share live camera and placement matrices but approximate
materials in Cycles. The supervised preview service was unavailable, so GPU
shader compilation, actual sky/water appearance and phone FPS remain unverified.

GitHub Actions configuration is included in `.github/workflows/check.yml` for
engine, snapshot integrity and Blender regeneration. A GitHub destination has
not been selected; no GitHub workflow run is claimed.

## Performance and validation

The 42 GLBs and referenced shared textures total about 20.9 MB. Keep
`public/assets/shared/` beside the GLBs. Detailed houses/shops are capped at
18,000 triangles; vehicles at 8,200; detailed near props/trees at 5,200. Distant
forest trees use 1,284 triangles. Geometry/material sharing, instancing, street
chunk culling, a 1.6 pixel-ratio cap and one shadow light bound the rendering cost.
Four direct point lights and four weaker reflected fills approximate bounce
light near fixtures; these do not implement global illumination.

50 automated tests cover gameplay, NPC schedules, camera, materials, local lights,
layout and capture freshness. Mobile 60 FPS remains a target without device
measurements. See `INTEGRATION-V6.md`, `INTEGRATION-V7.md` and `REVIEW.md`.

## Primary references

- [Three.js GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)
- [Three.js MeshToonMaterial](https://threejs.org/docs/#api/en/materials/MeshToonMaterial)
- [Blender glTF export API](https://docs.blender.org/api/4.2/bpy.ops.export_scene.html#bpy.ops.export_scene.gltf)
- [Three.js SVGRenderer](https://threejs.org/docs/#examples/en/renderers/SVGRenderer)


## Checkpoint 04: Japanese close-up review

`art/japanese_assets.py` authors seven rural Japanese house families, curved kawara
roof ribs, engawa planks, sliding doors, low masonry walls and utility poles with
hanging wires. Rider upgrades include clothing folds, backpack straps, face/cap
geometry, wheel spokes, brass bell and a supported open basket.
`art/bake_ao.py` bakes shared 512px AO atlases with non-overlapping UVs, embedded
as glTF occlusion textures for the houses, rider, wall and road. The road includes
cracks, pebbles, a solid yellow centerline and mesh lettering 止まれ.

`components/game/skydome.mjs` wraps the approved summer painting on a camera-centered
BackSide sphere. Longitude/latitude mapping replaces the screen-space background;
matching seam samples and detail-free polar caps handle wrap and pole singularities.
`pencil-outline.mjs` adds subtle inverted hulls, culled beyond 65m. AO maps are retained
when converting each source material to the painted toon shader.

Run `python art/render_turnarounds.py` in Blender's Python environment for 32 actual
Cycles asset views. `python scripts/review/blender-sheets.py` creates the review sheets
and ZIP in `public/review/japanese-v4/`. Hash tests bind the images to the final GLBs.
These are Blender renders, not WebGL screenshots. Full runtime shader compilation,
360-degree visual sky inspection and mobile FPS remain unverified because the
supervised preview service is unavailable. Build and math tests do not establish 60fps.

The user approved this visual checkpoint. It is now merged into the main Three.js
game with the existing chase camera and deterministic gameplay.

AO export reference: [Blender glTF manual](https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html), including the glTF Material Output occlusion input.

The WebGL harness also captures eight sky azimuths plus zenith/nadir via `review.captureSky()` for an explicit wrap/pole review. These captures have not run in this environment.


## Detail polish (06)

`INTEGRATION-V6.md` documents the current Three.js and Blender pipeline.
All seven houses now use deeper tile meshes, door tracks, Andon fixtures,
gutters/downpipes, painted timber and separate 1024px AO atlases. Nearby trees
have continuous bent trunks, root flares, bark maps and 4,572-triangle crowns;
the dense forest uses 1,284-triangle variants. Two detailed parked vehicles have
mirrors, tire treads, coated glazing, emitting lamps and fictional Japanese plates.
Potted summer flowers, drainage grates, red postboxes, benches and short concrete
walls are placed outside the riding corridor.

The renderer preserves paint/normal textures and their UV channels. A fixed pool
of four direct point lights and four weaker fills lights nearby fixtures, fading
between assignments. The fills approximate reflected light; this is not global
illumination. Texture sharing and static material batching bound resource use.
Keep the `public/assets/shared/` directory with the GLBs when moving assets.

Run `pnpm assets:generate` for all three generator stages, or `pnpm assets:detail`
to update this stage. `python art/render_turnarounds.py --detail` produces 96
Cycles views; `pnpm review:geometry` produces 284 geometry/state views, and
`pnpm review:detail` assembles the review and download bundles. Runtime WebGL
appearance and mobile FPS remain unverified because supervised preview is
unavailable. Technical and cultural reference links are in `INTEGRATION-V6.md`.

## Living summer expansion (05, historical checkpoint)

Runtime code: `components/game/skydome.mjs`, `ocean-shader.mjs`, `npc-view.mjs`,
`scene.mjs`; deterministic behavior: `engine/living-world.mjs`.
Blender entrypoint: `art/generate_living_world.py` (or `art/run_living_world.py`
with the official bpy wheel). Generate the approved base assets first with
`art/generate_assets.py`, then run the living-world generator. It preserves house
and rider GLBs and updates two trees plus eleven new assets (33 assets total).

The sky now samples the full 2:1 painting directly; the old upper-hemisphere
rescale is removed. The cloud base is aligned to latitude zero with a small offset,
the seam is blended and only the last polar degrees lose detail. The source is
`art/textures/summer-sky-v5-source.png`; the runtime uses its WebP conversion.
It was generated once for this restored workspace after the prior runtime reset.
It is artwork, not a game screenshot.

Water uses cyan-to-deep-blue depth bands, rhythmic shore foam and moving glints.
A narrow authored sand strip meets the procedural foam coast. Tree canopies use
explicit outward spherical split normals and broad painted light patches.
Three staggered rows of instanced trees form the right boundary.

The town adds two cafe placements, a dagashi shop, a produce shop, lit vending
machines and warm self-lit streetlight fixtures. Existing overhead utility wiring
and Japanese road markings remain. No per-fixture shadow-casting point lights
are added; the warm glow comes from emission and the directional afternoon sun.

26 residents independently cycle walking/looking, sitting/drinking or
sweeping/resting. Each has its own seeded random stream and state deadline;
updates consume simulation ticks, so pauses, restarts and different frame rates
behave consistently. Pedestrians follow bounded sidewalk routes clear of the
mailboxes. Stationary cafe guests share their chair's floor elevation.
Five authored outfits are cotton yukata/obi, striped jinbei, indigo maekake apron,
short-sleeve sailor school uniform, and a lightweight wrap top/cropped trousers
with a woven summer hat. Garments are stylized, not historical reconstructions.

Review: `python art/render_turnarounds.py --world` renders 52 Cycles views.
`pnpm review:geometry` renders 248 Three.js CPU views, including every NPC state
in all five outfits from front/side/rear/clay. `python scripts/review/living-sheets.py`
assembles the contact sheets and ZIP. The in-game studio supports NPC state selection.
The WebGL harness records the same 248 views plus ten sky directions.

Validation limits: the supervised WebGL preview service is unavailable. Cycles
and CPU geometry images do not establish final shader appearance or mobile FPS.
No 60fps device claim is made. GLB payload is about 8.1 MB, under a 12 MB cap;
instancing, near-NPC culling and no foliage outline hulls limit rendering overhead.

Design references: [Visit Kinosaki's yukata guide](https://visitkinosaki.com/plan/visitor-info/guides/yukata/)
for the wrap direction; [Web Japan](https://web-japan.org/trends/11_fashion/fas120820.html)
for lightweight cotton summer yukata; [Anything, the maekake maker](https://anything.ne.jp/)
for the indigo waist apron. These guide garment features, not claims about every
Japanese resident's clothing.
