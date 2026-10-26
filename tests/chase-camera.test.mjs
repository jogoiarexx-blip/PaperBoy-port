import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ChaseCameraRig,cameraFrame,speedFov,CHASE} from '../components/game/chase-camera.mjs';
import {ground,RULES} from '../engine/simulation.mjs';

const rider=(values={})=>({x:0,z:0,speed:RULES.baseSpeed,steer:0,lean:0,...values});
function cameraFor(frame,aspect){const camera=new THREE.PerspectiveCamera(frame.fov,aspect,.1,1500);camera.position.copy(frame.position);camera.lookAt(frame.target);camera.updateMatrixWorld();return camera;}

test('neutral chase view is directly behind the bicycle, with the full rider below the horizon',()=>{
  for(const aspect of [390/844,1440/1000,844/390])for(const z of [0,260,520])for(const x of [-5.3,0,5.3]){
    const r=rider({x,z}),frame=cameraFrame(r,aspect),camera=cameraFor(frame,aspect);
    assert.equal(frame.position.x,x);assert.equal(frame.target.x,x);
    assert.ok(frame.position.z> -z&&frame.target.z< -z);
    assert.ok(frame.position.y>ground(z)+2.5&&frame.position.y<ground(z)+3);
    assert.ok(frame.position.z+z>9,'the wider reference puts the camera farther behind');
    assert.ok(frame.target.y>frame.position.y,'look slightly above the geographic horizon');
    assert.equal(frame.fov,68);
    for(const y of [0,2.5]){const p=new THREE.Vector3(x,ground(z)+y,-z).project(camera);assert.ok(Math.abs(p.x)<.01&&p.y>-.85&&p.y<.1&&p.z<1);}
  }
});

test('steering pivots gradually and release recenters the camera without moving the rider',()=>{
  const rig=new ChaseCameraRig(rider(),1.44),turn=Object.freeze(rider({x:1,steer:1,lean:.22}));
  const first=rig.update(turn,1.44,1/60);assert.ok(first.yaw>0&&first.yaw<CHASE.maxYaw/2);assert.ok(rig.anchor.x>0&&rig.anchor.x<1);
  for(let i=0;i<60;i++)rig.update(turn,1.44,1/60);
  const previous=rig.yaw,neutral=Object.freeze({...turn,steer:0,lean:0});rig.update(neutral,1.44,1/60);
  assert.ok(rig.yaw>0&&rig.yaw<previous,'release should damp the pivot, not snap it');
  for(let i=0;i<120;i++)rig.update(neutral,1.44,1/60);
  assert.ok(Math.abs(rig.yaw)<.00001);assert.equal(neutral.x,1);assert.equal(neutral.steer,0);
  const left=cameraFrame(rider({steer:-1,lean:-.22}),1.44),right=cameraFrame(rider({steer:1,lean:.22}),1.44);
  assert.ok(left.yaw<0&&right.yaw>0);assert.ok(Math.abs(left.position.x+right.position.x)<1e-12);
});

test('follow, pivot and FOV damping give the same settled result at 30, 60 and 144 Hz',()=>{
  const results=[];
  for(const fps of [30,60,144]){const rig=new ChaseCameraRig(rider(),1.44),goal=rider({x:3,z:8,steer:1,lean:.22,speed:RULES.sprintSpeed});for(let i=0;i<fps;i++)rig.update(goal,1.44,1/fps);results.push(rig);}
  for(const rig of results.slice(1)){assert.ok(rig.anchor.distanceTo(results[0].anchor)<1e-10);assert.ok(Math.abs(rig.yaw-results[0].yaw)<1e-10);assert.ok(Math.abs(rig.fov-results[0].fov)<1e-10);}
});

test('68 degree reference FOV stays fixed during sprint, rotation and restart',()=>{
  for(const aspect of [390/844,1.44,844/390]){
    const rig=new ChaseCameraRig(rider(),aspect);
    for(const speed of [0,RULES.baseSpeed,RULES.sprintSpeed,100]){
      assert.equal(speedFov(speed,aspect),68);
      assert.equal(rig.update(rider({speed}),aspect,1/60).fov,68);
    }
    rig.update(rider({x:5,z:510,steer:1}),aspect,1);const frame=rig.reset(rider(),aspect);
    assert.equal(frame.fov,68);assert.equal(frame.yaw,0);assert.equal(frame.position.x,0);assert.equal(frame.position.z,CHASE.distance);
  }
});

test('moving rider stays framed while weaving, sprinting and changing screen orientation',()=>{
  const rig=new ChaseCameraRig(rider(),390/844);let z=0;
  for(let i=0;i<900;i++){
    const time=i/60,speed=RULES.baseSpeed+(RULES.sprintSpeed-RULES.baseSpeed)*(.5+.5*Math.sin(time));z+=speed/60;
    const steer=Math.cos(time)*.8,r=rider({x:4.4*Math.sin(time),z,speed,steer,lean:steer*.22}),aspect=i<450?390/844:844/390;
    const frame=rig.update(r,aspect,1/60),camera=cameraFor(frame,aspect);
    for(const y of [0,2.5]){const p=new THREE.Vector3(r.x,ground(z)+y,-z).project(camera);assert.ok(Math.abs(p.x)<.85&&p.y>-.85&&p.y<.2&&p.z<1,`rider clipped at ${time}s`);}
    assert.ok(frame.horizonTop>.505&&frame.horizonTop<.53,'the geographic horizon stays near mid-screen');
  }
});
