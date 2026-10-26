// Dog visual variants: 4 distinct color schemes / body proportions
// variant 0: Shiba (wood/cream) — original look
// variant 1: Black & White (navy/cream)
// variant 2: Ginger (coral/peach)
// variant 3: Grey (gray/stone)
// Variant is stored on d.variant from simulation. The mesh colors are baked in the GLB
// so we can't change them here, but we CAN differentiate by scale and animation speed.

// Scale: 1 unit = 1 meter. Real dog shoulder height ≈ 0.5–0.6m.
// Base scale (0.38) is applied externally on the root object from scene.mjs.
// Variant scale here is a relative multiplier (1.0 = use base, 0.9 = 10% smaller etc.)
const VARIANT_CONFIG = [
  {scale: 1.00, speed: 15, tailSpeed: 14, bodyBob: 0.018, legSwing: 0.40}, // Shiba — lively
  {scale: 1.10, speed: 12, tailSpeed: 18, bodyBob: 0.015, legSwing: 0.36}, // Black&White — slightly bigger
  {scale: 0.90, speed: 18, tailSpeed: 22, bodyBob: 0.022, legSwing: 0.48}, // Ginger — small, quick
  {scale: 1.05, speed: 10, tailSpeed: 10, bodyBob: 0.012, legSwing: 0.30}, // Grey — calm, slow
];

export function applyDogPose(model, mode, time, variant=0) {
  const node = name => model.getObjectByName(name);
  const cfg  = VARIANT_CONFIG[variant % VARIANT_CONFIG.length];

  const torso = node('dog_torso');
  if (!torso) return;

  // Apply variant relative scale on torso (root obj already has base 0.38 scale)
  torso.scale.setScalar(cfg.scale);

  const isWandering = mode === 'wandering';
  const phase = time * cfg.speed;

  // Body bob
  const bounce    = isWandering ? Math.abs(Math.sin(phase)) * cfg.bodyBob : 0;
  const bodyPitch = isWandering ? Math.sin(phase) * 0.07 : 0;

  // torso.position.y is in LOCAL space (before root scale=0.38).
  // We want torso at ~0.30m world height → 0.30/0.38 ≈ 0.79 local units.
  torso.position.y = 0.79 + bounce;
  torso.rotation.x = bodyPitch;

  // Head — looks gently in direction of travel
  const head = node('dog_head');
  if (head) {
    head.rotation.x = -bodyPitch * 0.5;                       // compensate body tilt
    head.rotation.y = isWandering ? Math.sin(time * 2.1) * 0.18 : 0;
  }

  // Tail wag
  const tail = node('dog_tail');
  if (tail) {
    tail.rotation.y = Math.sin(time * cfg.tailSpeed) * 0.28;
    tail.rotation.z = 0.15 * Math.cos(time * cfg.tailSpeed * 0.5); // secondary wag
  }

  // Legs — trot gait: diagonal pairs move together
  const swing = isWandering ? cfg.legSwing : 0;
  const legPhase = Math.sin(phase);
  for (const [name, value] of [
    ['dog_leg_left_front',  legPhase * swing],
    ['dog_leg_right_front', -legPhase * swing],
    ['dog_leg_left_back',   -legPhase * swing],
    ['dog_leg_right_back',  legPhase * swing],
  ]) {
    const leg = node(name);
    if (leg) leg.rotation.x = value;
  }
}
