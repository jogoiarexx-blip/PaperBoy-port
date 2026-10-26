# PAPERROUTE: detail polish / phase 4.5

This document describes phase 4.5 assets and lights. `INTEGRATION-V7.md` describes
the subsequent camera, sky and ocean update. The deterministic simulation is preserved.

## Style stream / Blender

Run in order with Blender 4.2, or the official `bpy==4.2.0` Python 3.11 wheel:

```
python art/run_bpy.py
python art/run_living_world.py
python art/run_detail_world.py
```

The final generator exports 24 detailed assets, including all seven houses,
three shops, two vehicles, two high detail trees and two forest variants, six
micro-props, streetlight and vending machine. The full manifest has 42 assets.

- `art/generate_detail_world.py`: deeper kawara roofs, gutters/downpipes, engawa
  pegs, sliding door tracks, framed Andon fixtures, bark/roots, plants/flowers,
  drainage grates, red pillar postbox, bench and concrete wall.
- `art/detail_vehicles.py`: authored compact car and Kei pickup, mirrors, grille,
  sloped glazing, wipers, bed corrugations, hinges, rounded tires and tread. The
  white/yellow two-line plates use fictional Yamaguchi display numbers.
- `art/detail_textures.py`: 512px repeatable pigment and shallow normal maps.
  Explicit sRGB encoding keeps the chosen palette from becoming too dark.
- `art/bake_ao.py`: 1024px architectural AO, independently packed `AOAtlas` UVs.
  `PaintUV` preserves the metric grain scale; vehicles and near trees get 512px AO.
- `art/pack_glb_textures.py`: identical paint maps are shared by content hash.

**Keep `public/assets/shared/` beside the GLBs.** These GLBs reference relative
image URIs, so copying a GLB alone will omit its paint/AO textures. The asset ZIP
preserves this layout. The manifest binds every GLB and shared image to its hash.
The detailed geometry and currently used shared maps total about 20.9 MB across
the complete route; distant forest geometry uses 1,284-triangle variants.

## Engine stream / Three.js

- `components/game/visual-style.mjs` retains base-color maps, normal maps and AO
  UV channels during toon conversion. Broad foliage highlights have a subtle
  leaf pattern that fades with distance. Vehicle glazing uses an opaque coated
  material with a soft rim reflection, avoiding instance transparency sorting.
- `components/game/local-lighting.mjs` reads authored `localLight` anchors and
  transforms them with each instanced asset. Four direct point lights and four
  weaker reflected fills cover nearby fixtures; selection gives distinct assets
  priority and fades old lights before assigning new positions.
- `components/game/scene.mjs` scatters props outside the riding corridor, alternates
  the two parked vehicles, shares paint textures on the GPU and connects the light
  pool. The asset studio uses those fixture anchors for review lighting too.

The reflected fills are an art-directed approximation, not real-time global
illumination. Local lights do not allocate shadow maps; the warm directional sun
continues to provide the scene's shadow map. Every lens/lantern stays emissive;
nearby surfaces are illuminated by the bounded pool.

## Review and validation

```
pnpm test
pnpm assets:validate
pnpm exec tsc --noEmit
pnpm build
python art/render_turnarounds.py --detail
pnpm review:geometry
pnpm review:detail
```

The review set contains 96 actual Blender Cycles views at 800px and 284 Three.js
CPU geometry/animation views. `--only house_0,car` limits Blender review renders.
The download ZIP uses high-quality JPEG copies; original lossless PNGs remain
in `public/review/detail-v6/` with their current asset hashes.
The WebGL harness expects all 284 asset/state views and ten sky directions.
Live WebGL preview is unavailable in this managed environment. Cycles validates
asset appearance and geometry; it does not verify WebGL compilation, the full
game scene or mobile frame rate. The target remains 60 fps, without a measured
device-performance claim.

## References

Punctual attenuation and intensity follow [Three.js PointLight](https://threejs.org/docs/pages/PointLight.html).
The packed AO and material export follow the [Blender glTF manual](https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html).
Plate colors and two-line layout refer to the [Japanese Ministry of Land, Infrastructure, Transport and Tourism overview](https://www.mlit.go.jp/common/000169006.pdf).
