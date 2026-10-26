import * as THREE from 'three';
import {ground,RULES,clamp} from '../../engine/simulation.mjs';

// Presentation only: camera damping never writes to the deterministic rider.
export const CAMERA_REVISION='scale-corrected-v9';
// 1 unit = 1 meter. Rider height ~1.75m. Camera at human eye level (~1.6m) behind rider.
export const CHASE=Object.freeze({distance:8.0,height:2.8,lookAhead:18,pitchUp:1.2,fov:68,followRate:9,pivotRate:5.5,fovRate:3.5,maxYaw:.085,offsetX:1.2});
const damping=(rate,dt)=>1-Math.exp(-rate*Math.max(0,dt));
export function speedFov(speed=RULES.baseSpeed,aspect=1){
  // The approved reference uses a fixed vertical FOV, including portrait and sprint.
  return CHASE.fov;
}
function heading(rider){return (rider.yaw||0)+clamp((rider.steer||0)*.065+(rider.lean||0)*.09,-CHASE.maxYaw,CHASE.maxYaw);}
function frameAt(anchor,yaw,fov){
  const forward=new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw));
  const right=new THREE.Vector3(Math.cos(yaw),0,Math.sin(yaw));
  const position=anchor.clone().addScaledVector(forward,-CHASE.distance);
  if(CHASE.offsetX) position.addScaledVector(right,CHASE.offsetX);
  position.y+=CHASE.height;
  const target=anchor.clone().addScaledVector(forward,CHASE.lookAhead);
  // Aim above the geographic horizon rather than at the descending road. Derive
  // target height from camera height so slope and route progress cannot tilt it down.
  target.y=position.y+(CHASE.distance+CHASE.lookAhead)*Math.tan(THREE.MathUtils.degToRad(CHASE.pitchUp));
  const pitch=Math.atan2(position.y-target.y,Math.hypot(position.x-target.x,position.z-target.z));
  const horizonTop=.5-Math.tan(pitch)/(2*Math.tan(THREE.MathUtils.degToRad(fov/2)));
  return {position,target,fov,yaw,horizonTop};
}
export function cameraFrame(rider,aspect){
  return frameAt(new THREE.Vector3(rider.x,ground(rider.z),-rider.z),heading(rider),speedFov(rider.speed,aspect));
}
export class ChaseCameraRig{
  constructor(rider,aspect){this.anchor=new THREE.Vector3();this.reset(rider,aspect);}
  reset(rider,aspect){
    this.anchor.set(rider.x,ground(rider.z),-rider.z);this.yaw=heading(rider);this.fov=speedFov(rider.speed,aspect);
    this.frame=frameAt(this.anchor,this.yaw,this.fov);return this.frame;
  }
  update(rider,aspect,dt){
    const desired=new THREE.Vector3(rider.x,ground(rider.z),-rider.z);
    this.anchor.lerp(desired,damping(CHASE.followRate,dt));
    let targetYaw = heading(rider);
    let diff = targetYaw - this.yaw;
    while(diff > Math.PI) diff -= Math.PI*2;
    while(diff < -Math.PI) diff += Math.PI*2;
    this.yaw+=diff*damping(CHASE.pivotRate,dt);
    // keep yaw bounded so it doesn't drift to infinity and cause float issues
    while(this.yaw > Math.PI) this.yaw -= Math.PI*2;
    while(this.yaw < -Math.PI) this.yaw += Math.PI*2;
    this.fov+=(speedFov(rider.speed,aspect)-this.fov)*damping(CHASE.fovRate,dt);
    this.frame=frameAt(this.anchor,this.yaw,this.fov);return this.frame;
  }
}
