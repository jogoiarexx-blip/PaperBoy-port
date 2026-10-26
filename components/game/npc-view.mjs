import {npcPose} from '../../engine/living-world.mjs';
export function applyNPCPose(model, state, time, phase=0, outfit='summer') {
  const p = npcPose(state, time, phase, outfit);
  const node = name => model.getObjectByName(name);

  // Hips — root of the skeleton, drives bob height
  const hips = node('npc_hips');
  if (hips) {
    hips.position.y = 0.83 + p.hipsY;
    hips.rotation.x = p.body;           // forward/backward lean
    hips.scale.set(1, 1, p.chestScale || 1);
  }

  // Head — yaw (side-to-side) only; no pitch flip
  const head = node('npc_head');
  if (head) {
    head.rotation.y = p.headYaw ?? 0;   // horizontal look
    head.rotation.x = p.headPitch ?? 0; // subtle nod
  }

  // Limbs
  for (const [name, value] of [
    ['npc_arm_left',   p.leftArm],
    ['npc_arm_right',  p.rightArm],
    ['npc_leg_left',   p.leftLeg],
    ['npc_leg_right',  p.rightLeg],
    ['npc_knee_left',  p.leftKnee],
    ['npc_knee_right', p.rightKnee],
    ['npc_elbow_left', p.leftElbow],
    ['npc_elbow_right',p.rightElbow],
  ]) {
    const n = node(name);
    if (n) n.rotation.x = value;
  }

  // Right arm: slight outward rotation when drinking
  const right = node('npc_arm_right');
  if (right) right.rotation.z = state === 'drinking' ? -0.22 : 0;

  // Props
  const cup = node('npc_cup');
  if (cup) cup.visible = p.cup;

  const broom = node('npc_broom');
  if (broom) {
    broom.visible = p.broom;
    broom.position.y = -0.01;
    broom.rotation.z = p.broomAngle;
  }
}
