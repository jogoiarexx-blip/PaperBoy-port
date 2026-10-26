// Residents run on simulation ticks, independent of rendering and rider input.
import {DT,seeded} from './simulation.mjs';

export const OUTFITS=['yukata','jinbei','maekake','school','summer'];
export const NPC_STATES=['inside','exiting','entering','walking','looking','sitting','drinking','sweeping','resting'];
export const TOWN=[{asset:'cafe',x:-13.7,z:30},{asset:'dagashi',x:-13.7,z:145},{asset:'cafe',x:-13.7,z:260},{asset:'small_shop',x:-13.7,z:375}];

export class LivingWorld {
  constructor(seed=991) {
    this.seed=seed;
    this.reset();
  }
  
  reset() {
    this.tick=0;
    this.npcs=[];
    const random=seeded(this.seed);
    
    // We have 44 houses (22 rows * 2 sides)
    // Let's spawn 2 NPCs per house, plus the town keepers
    let idCounter = 0;
    for(let row=0; row<22; row++) {
      for(const side of [-1,1]) {
        const homeZ = 19 + row*23 + (side===1?8:0);
        // Add 2 residents per house
        for(let j=0; j<2; j++) {
          const isWalker = random() > 0.3; // mostly walkers
          this.npcs.push(this.resident(idCounter++, {
            homeX: side * 13.7,
            homeZ,
            x: side * 13.7, // start at door
            z: homeZ,
            targetX: side * 6.55, // sidewalk X
            targetZ: homeZ + (random() * 40 - 20), // random destination along sidewalk
            side,
            role: isWalker ? 'walker' : 'stander',
            outfit: OUTFITS[Math.floor(random()*OUTFITS.length)],
            state: 'inside'
          }, random));
        }
      }
    }
    
    // Town keepers and guests
    for(const [i,p] of TOWN.entries()){
      this.npcs.push(this.resident(idCounter++, {x:-8.8,z:p.z+1,homeZ:p.z+1,targetZ:p.z+1,role:'keeper',outfit:'maekake',state:'sweeping',yaw:-Math.PI/2}, random));
      if(p.asset==='cafe') {
        this.npcs.push(this.resident(idCounter++, {x:-9.4,z:p.z-1.6,homeZ:p.z-1.6,targetZ:p.z-1.6,floorZ:p.z,role:'guest',outfit:i?'summer':'jinbei',state:'drinking',yaw:-Math.PI/2}, random));
      }
    }
  }
  
  resident(id, values, r) {
    return {
      id: 'resident-' + id,
      age: 0,
      phase: r() * Math.PI * 2,
      speed: 0.34 + r() * 0.24,
      stateUntil: Math.floor(r() * 600), // initial random wait
      transitions: 0,
      yaw: values.side === 1 ? -Math.PI/2 : Math.PI/2,
      ...values,
      random: seeded(this.seed + id * 97)
    };
  }
  
  transition(n, state) {
    n.state = state;
    n.age = 0;
    n.transitions++;
    // duration depends on state
    let duration = 2 + n.random() * 5;
    if (state === 'inside') duration = 5 + n.random() * 20;
    if (state === 'looking' || state === 'resting') duration = 4 + n.random() * 8;
    n.stateUntil = this.tick + Math.floor(duration / DT);
  }
  
  step() {
    this.tick++;
    for (const n of this.npcs) {
      n.age += DT;
      
      // Moving logic
      if (n.state === 'exiting') {
        const dx = (n.side * 6.55) - n.x;
        const dist = Math.abs(dx);
        if (dist > 0.1) {
          n.x += Math.sign(dx) * n.speed * DT;
          n.yaw = Math.sign(dx) > 0 ? Math.PI/2 : -Math.PI/2;
        } else {
          n.x = n.side * 6.55;
          this.transition(n, 'walking');
        }
      } 
      else if (n.state === 'entering') {
        const dx = n.homeX - n.x;
        const dist = Math.abs(dx);
        if (dist > 0.1) {
          n.x += Math.sign(dx) * n.speed * DT;
          n.yaw = Math.sign(dx) > 0 ? Math.PI/2 : -Math.PI/2;
        } else {
          n.x = n.homeX;
          this.transition(n, 'inside');
        }
      }
      else if (n.state === 'walking' || n.state === 'returning') {
        const target = n.state === 'walking' ? n.targetZ : n.homeZ;
        const dz = target - n.z;
        const dist = Math.abs(dz);
        if (dist > 0.2) {
          n.z += Math.sign(dz) * n.speed * DT;
          n.yaw = Math.sign(dz) > 0 ? 0 : Math.PI;
        } else {
          n.z = target;
          this.transition(n, n.state === 'walking' ? 'looking' : 'entering');
        }
      }
      
      // Time-based transitions
      if (this.tick >= n.stateUntil) {
        if (n.role === 'keeper') {
          this.transition(n, n.state === 'sweeping' ? 'resting' : 'sweeping');
        } else if (n.role === 'guest') {
          this.transition(n, n.state === 'drinking' ? 'sitting' : 'drinking');
        } else { // walker or stander
          if (n.state === 'inside') {
             // pick new destination
             n.targetZ = n.homeZ + (n.random() * 40 - 20);
             this.transition(n, 'exiting');
          } else if (n.state === 'looking') {
             this.transition(n, 'returning');
          }
        }
      }
    }
  }
  
  updateTo(tick) {
    if(tick < this.tick) this.reset();
    while(this.tick < tick) this.step();
  }
  
  snapshot() {
    return this.npcs.map(({random, ...n}) => n);
  }
}

export function npcPose(state, time, phase=0, outfit='summer') {
  // wave drives the walk cycle — positive = left leg forward / right arm forward
  const wave = Math.sin(time * 3.2 + phase);
  const breath = Math.sin(time * 1.4 + phase);
  const isWalking = state === 'walking' || state === 'exiting' || state === 'entering' || state === 'returning';
  const sit = state === 'sitting' || state === 'drinking';
  const legSwing = outfit === 'yukata' ? 0.13 : 0.32; // yukata constrains leg

  const p = {
    // hipsY offset relative to the GLB rest position (already at 0.83 in the file)
    hipsY: sit ? -0.36 : isWalking ? Math.abs(wave) * 0.016 : 0,
    // body pitch: slight forward lean while walking, breathing at rest
    body: isWalking ? -0.06 + breath * 0.01 : breath * 0.018,
    // headYaw: gentle side-to-side look while walking; slow scan when looking
    headYaw: state === 'looking' ? Math.sin(time * 0.6 + phase) * 0.40 : isWalking ? wave * 0.06 : 0,
    headPitch: isWalking ? Math.abs(wave) * 0.04 : 0, // nod with each step
    // Arms swing OPPOSITE to same-side leg
    leftArm:  isWalking ? -wave * 0.22 : 0,
    rightArm: isWalking ?  wave * 0.22 : 0,
    // Legs swing
    leftLeg:  isWalking ?  wave * legSwing : 0,
    rightLeg: isWalking ? -wave * legSwing : 0,
    // Knee bends on back-leg (negative wave)
    leftKnee:  isWalking ? Math.max(0, -wave) * 0.28 : 0,
    rightKnee: isWalking ? Math.max(0,  wave) * 0.28 : 0,
    leftElbow:  0.10,
    rightElbow: 0.10,
    cup: sit,
    broom: state === 'sweeping' || state === 'resting',
    broomAngle: 0,
    chestScale: 1 + breath * 0.012,
  };

  if (sit) {
    p.leftLeg = p.rightLeg = Math.PI / 2;
    p.leftKnee = p.rightKnee = -Math.PI / 2;
    p.leftArm = 0.22;
    const sip = 0.5 + 0.5 * Math.sin(time * 1.8 + phase);
    p.rightArm  = state === 'drinking' ? 0.6 + 1.0 * sip : 0.32;
    p.rightElbow = state === 'drinking' ? 0.35 + 1.3 * sip : 0.28;
  }

  if (state === 'sweeping') {
    p.body = -0.10 + breath * 0.015;
    p.leftArm  = 0.30;
    p.rightArm = 0.48 + 0.16 * wave;
    p.broomAngle = 0.12 * wave;
  }

  return p;
}
