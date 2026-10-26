// Engine stream: no Three.js, DOM, wall clock, or random global state.
export const DT = 1 / 60;
export const RULES = Object.freeze({length: 1020, slope: .055, baseSpeed: 0, sprintSpeed: 26.8, lateralSpeed: 5.5, roadLimit: 5.3, gravity: 17, recovery: 2.4, throwCooldown: .3});
export const ZONES = Object.freeze({bridgeStart: 540, bridgeEnd: 860, coastStart: 860, coastEnd: 1020});
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const HOUSE_SPECS=[{w:6.3,d:5.8},{w:6.5,d:5.3},{w:8.4,d:5.5},{w:6,d:5.7},{w:6.4,d:5.8},{w:7.3,d:6.2},{w:5.8,d:5.1}];
// Piecewise elevation: town slopes downhill; bridge + coast stay flat at bridge-entry height.
export const BRIDGE_Z = 540;
export const ground = z => z < BRIDGE_Z ? -z * RULES.slope : -BRIDGE_Z * RULES.slope;
export function seeded(seed = 721) {let a=seed>>>0; return () => {a += 0x6D2B79F5; let t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296;};}
export function createRoute(seed=721) {
  const random=seeded(seed), houses=[], targets=[], obstacles=[], dogs=[];
  for(let row=0;row<22;row++) for(const side of [-1,1]) {
    const z=19+row*23+(side===1?8:0), family=(row*2+(side===1?1:0))%7;
    const subscriber=(row+(side===1?1:0))%3!==2;
    houses.push({id:`house-${row}-${side}`,x:side*13.7,z,family,side,subscriber});
    const spec=HOUSE_SPECS[family];
    targets.push({id:`box-${row}-${side}`,houseId:`house-${row}-${side}`,type:subscriber?'mailbox':'window',x:side*(subscriber?7.1:13.7-spec.d/2-.2),y:ground(z)+(subscriber?1.4:1.95),z:subscriber?z:z-side*spec.w*.3,side,subscriber,delivered:false,broken:false});
    if(row>0 && (row+(side===1?1:0))%3===0) obstacles.push({id:`bin-${row}-${side}`,type:'bin',x:side*(6.3+random()*.4),z:z+5,radius:.7});
    if(row%4===2 && side===1) obstacles.push({id:`car-${row}`,type:'car',x:-3.8,z:z+9,radius:1.3});
    // 4 dogs: variant 0+1 go forward (positive vz), variant 2+3 go backward (negative vz)
    // Placed on right sidewalk (x≈7.2) well away from the wall (x≈7.9)
    if(row%5===2 && side===1) {
      const dogVariant = Math.floor(row/5) % 4;
      const goingForward = dogVariant < 2; // variants 0,1 → forward; 2,3 → backward
      dogs.push({id:`dog-${row}`,type:'dog',x:7.2,z:z-3,homeZ:z-3,vx:0,vz:0,
        mode:'wandering',distractedUntil:0,radius:.6,
        variant:dogVariant,direction:goingForward?1:-1});
    }
  }
  return {houses,targets,obstacles,dogs};
}
export function ballistic(origin,target,duration=.68) {
  return {origin:{...origin},target:{...target},duration,velocity:{x:(target.x-origin.x)/duration,z:(target.z-origin.z)/duration,y:(target.y-origin.y+.5*RULES.gravity*duration*duration)/duration}};
}
export function positionAt(shot,t) {
  const a=clamp(t,0,shot.duration);
  return {x:shot.origin.x+shot.velocity.x*a,y:shot.origin.y+shot.velocity.y*a-.5*RULES.gravity*a*a,z:shot.origin.z+shot.velocity.z*a};
}
export function trajectory(shot,segments=24){return Array.from({length:segments+1},(_,i)=>positionAt(shot,shot.duration*i/segments));}
export function segmentDistance(px,pz,ax,az,bx,bz) {
  const dx=bx-ax,dz=bz-az,t=clamp(((px-ax)*dx+(pz-az)*dz)/(dx*dx+dz*dz||1),0,1);
  return Math.hypot(px-ax-dx*t,pz-az-dz*t);
}
export class Simulation {
  constructor(seed=721) {this.seed=seed; this.reset();}
  reset(){
    Object.assign(this,createRoute(this.seed)); this.tick=0;this.time=0;this.mode='ready';this.rider={x:0,z:0,speed:RULES.baseSpeed,steer:0,lean:0,yaw:0};this.input={steer:0,pedal:false};
    this.lives=3;this.score=0;this.combo=0;this.delivered=0;this.papers=55;this.projectiles=[];this.events=[];this.contacts=new Set();this.recoveryUntil=0;this.nextThrow=0;this.lastThrow=-10;this.lastCrash=-10;this.nextId=0;this.aimId=null;this.recording=[];
  }
  start(){if(this.mode==='ready')this.mode='playing';}
  pause(){if(this.mode==='playing'){this.mode='paused';this.release();}}
  resume(){if(this.mode==='paused')this.mode='playing';}
  release(){this.input.steer=0;this.input.pedal=false;this.rider.steer=0;this.rider.lean=0;}
  setInput(input){this.input={...this.input,...input};this.input.steer=clamp(this.input.steer,-1,1); if(!this.input.steer){this.rider.steer=0;this.rider.lean=0;}}
  setAim(id){this.aimId=id;}
  getAim(){
    const rx=this.rider.x, rz=this.rider.z, ryaw = this.rider.yaw || 0;
    const fx = Math.sin(ryaw), fz = Math.cos(ryaw);
    const valid = t => {
      const dx=t.x-rx, dz=t.z-rz;
      return (dx*dx+dz*dz)<625 && (dx*fx + dz*fz) > -2 && !t.delivered && !t.broken;
    };
    if(this.aimId){
      for(let i=0;i<this.targets.length;i++) if(this.targets[i].id===this.aimId && valid(this.targets[i])) return this.targets[i];
      for(let i=0;i<this.dogs.length;i++) if(this.dogs[i].id===this.aimId && valid(this.dogs[i])) return this.dogs[i];
    }
    for(let i=0;i<this.dogs.length;i++) {
      const d=this.dogs[i];
      if(d.mode==='wandering' && valid(d) && (d.x-rx)*(d.x-rx)+(d.z-rz)*(d.z-rz)<49) return {id:d.id, type:d.type, x:d.x, y:ground(d.z)+.35, z:d.z};
    }
    let best=null, bestD2=Infinity;
    for(let i=0;i<this.targets.length;i++) {
      const t=this.targets[i];
      if(t.subscriber && valid(t)) {
        const d2=(t.x-rx)*(t.x-rx)+(t.z-rz)*(t.z-rz);
        if(d2<bestD2){best=t;bestD2=d2;}
      }
    }
    return best;
  }
  preview(){
    const t=this.getAim(); const origin={x:this.rider.x,y:ground(this.rider.z)+1.85,z:this.rider.z};
    const ry = this.rider.yaw || 0;
    const fx = Math.sin(ry), fz = Math.cos(ry);
    const lx = Math.cos(ry), lz = -Math.sin(ry); // lateral vector for steering offset
    const steerOffset = this.input.steer < 0 ? -7 : 7;
    const target=t?{x:t.x,y:t.y??ground(t.z)+.35,z:t.z}:{x:this.rider.x + fx*8 + lx*steerOffset, y:ground(this.rider.z+8)+.12, z:this.rider.z + fz*8 + lz*steerOffset};
    const duration=clamp(Math.hypot(target.x-origin.x,target.z-origin.z)/21,.42,.95);
    return {origin,target,duration,velocity:{x:(target.x-origin.x)/duration,z:(target.z-origin.z)/duration,y:(target.y-origin.y+.5*RULES.gravity*duration*duration)/duration},targetId:t?.id||null,targetType:t?.type||'ground'};
  }
  throwPaper(){
    if(this.mode!=='playing'||this.papers<=0||this.time+1e-9<this.nextThrow)return false;
    const shot={...this.preview(),id:`paper-${this.nextId++}`,age:0};this.projectiles.push(shot);this.papers--;this.nextThrow=this.time+RULES.throwCooldown;this.lastThrow=this.time;
    this.recording.push({tick:this.tick,action:'throw',targetId:shot.targetId});return shot;
  }
  crash(id){
    if(this.time<this.recoveryUntil||this.contacts.has(id)||this.mode!=='playing')return false;
    this.lives--;this.combo=0;this.recoveryUntil=this.time+RULES.recovery;this.lastCrash=this.time;this.rider.speed=3.6;this.events.push({type:'crash',id,tick:this.tick});
    if(this.lives<=0){this.mode='gameover';this.release();}return true;
  }
  land(p){
    const t=this.targets.find(t=>t.id===p.targetId);
    if(t && !t.delivered && !t.broken){
      if(t.subscriber){t.delivered=true;this.combo++;const points=100+Math.min(this.combo-1,4)*25;this.score+=points;this.delivered++;this.events.push({type:'delivery',points,id:t.id,tick:this.tick});}
      else {t.broken=true;this.score=Math.max(0,this.score-150);this.combo=0;this.events.push({type:'window',id:t.id,tick:this.tick});}
    }
    for(const d of this.dogs)if(Math.hypot(d.x-p.target.x,d.z-p.target.z)<4.5){d.mode='distracted';d.distractedUntil=this.time+6;d.vx=0;d.vz=0;this.events.push({type:'distract',id:d.id,tick:this.tick});}
  }
  step(){
    if(this.mode!=='playing')return;
    this.tick++;this.time=this.tick*DT;
    const r=this.rider,ox=r.x,oz=r.z;
    r.steer=this.input.steer;r.lean=r.steer*.22;
    const recovering=this.time-this.lastCrash<.6;
    const desired=recovering?3.6:(this.input.pedal?RULES.sprintSpeed:RULES.baseSpeed);
    r.speed+=clamp(desired-r.speed,-20*DT,12*DT);
    const TURN_RATE = 2.0;
    if(r.speed > 0.5) r.yaw = (r.yaw || 0) + r.steer * TURN_RATE * DT;
    r.x += Math.sin(r.yaw || 0) * r.speed * DT;
    r.z += Math.cos(r.yaw || 0) * r.speed * DT;
    // Bound to world roughly to avoid getting totally lost
    r.x = clamp(r.x, -500, 500); 
    r.z = clamp(r.z, -500, 2000);
    const dogPrevious=new Map();
    for(const d of this.dogs){
      dogPrevious.set(d.id,{x:d.x,z:d.z});
      if(d.mode==='distracted'){
        if(this.time<d.distractedUntil)continue;
        d.mode='wandering';
      }
      const distance=Math.hypot(r.x-d.x,r.z-d.z);
      // Peaceful dog wandering — each dog has a fixed direction (1=forward, -1=backward)
      if(d.mode==='wandering'){
        const dir = d.direction ?? 1;
        const sidewalkX = 7.2; // center of right sidewalk, away from fence (7.9)
        if(r.z > d.homeZ-50 && r.z < d.homeZ+80){
          d.vx = (sidewalkX - d.x) * 3;
          d.vz = 3.8 * dir;
        } else {
          d.vx = 0; d.vz = 0;
        }
        // Hard clamp: never step onto the wall or into the road
        d.x = clamp(d.x + d.vx*DT, 6.7, 7.55);
        d.z += d.vz*DT;
      }
    }

    const currentContacts=new Set();
    for(const o of this.obstacles){
      if(segmentDistance(0,0,ox-o.x,oz-o.z,r.x-o.x,r.z-o.z)<o.radius+.38){this.crash(o.id);currentContacts.add(o.id);}
    }
    this.contacts=currentContacts;
    for(const p of this.projectiles){p.age+=DT;if(p.age+1e-9>=p.duration&&!p.landed){p.landed=true;this.land(p);}}
    this.projectiles=this.projectiles.filter(p=>!p.landed);
    if(r.z>=RULES.length && this.projectiles.length===0){this.mode='complete';this.release();}
  }
  snapshot(){return {tick:this.tick,mode:this.mode,rider:{...this.rider},lives:this.lives,score:this.score,papers:this.papers,delivered:this.delivered,dogs:this.dogs.map(d=>({...d})),targets:this.targets.map(t=>({...t})),projectiles:this.projectiles.map(p=>({...p})),recoveryUntil:this.recoveryUntil};}
}
export class FixedStepper {
  constructor(sim){this.sim=sim;this.accumulator=0;}
  advance(seconds){if(this.sim.mode!=='playing'){this.accumulator=0;return 0;}this.accumulator+=Math.max(0,seconds);let steps=0;while(this.accumulator+1e-10>=DT){this.sim.step();this.accumulator-=DT;steps++;}return steps;}
}
