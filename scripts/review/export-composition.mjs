// Export the exact live placement matrices and camera; no browser is launched.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as THREE from 'three';
import {Simulation,ground} from '../../engine/simulation.mjs';
import {LivingWorld} from '../../engine/living-world.mjs';
import {poseAt} from '../../engine/animation.mjs';
import {createWorldPlacements} from '../../components/game/world-layout.mjs';
import {cameraFrame,CAMERA_REVISION} from '../../components/game/chase-camera.mjs';
import {STYLE,STYLE_REVISION} from '../../components/game/visual-style.mjs';
import {SKY_PALETTE} from '../../components/game/skydome.mjs';
import {OCEAN_PALETTE} from '../../components/game/ocean-shader.mjs';

const sim=new Simulation(),placements=createWorldPlacements(sim);
function add(id,x,y,z,rotation=0){
  if(!placements.has(id))placements.set(id,[]);
  const o=new THREE.Object3D();o.position.set(x,y,z);o.rotation.y=rotation;o.updateMatrix();placements.get(id).push(o.matrix.clone());
}
for(const t of sim.targets.filter(t=>t.subscriber))add('mailbox',t.x,ground(t.z),-t.z,t.side*Math.PI/2);
for(const n of new LivingWorld().npcs)add('npc_'+n.outfit,n.x,ground(n.floorZ??n.z),-n.z,n.yaw);
for(const d of sim.dogs)add('dog',d.x,ground(d.z),-d.z,.4);
const frames=[];
for(const [name,z,width,height] of [['desktop',22,1280,800],['mobile',22,480,900],['bay',420,1280,800]]){
  const rider={...sim.rider,z},f=cameraFrame(rider,width/height);
  frames.push({name,width,height,rider,groundY:ground(z),pose:poseAt('riding',.25),camera:{position:f.position.toArray(),target:f.target.toArray(),fov:f.fov,horizonTop:f.horizonTop}});
}
const sourceFiles=['components/game/scene.mjs','components/game/world-layout.mjs','components/game/chase-camera.mjs','components/game/skydome.mjs','components/game/ocean-shader.mjs','components/game/visual-style.mjs','public/assets/manifest.json'];
const sourceHashes={};for(const p of sourceFiles)sourceHashes[p]=crypto.createHash('sha256').update(await fs.readFile(p)).digest('hex');
await fs.mkdir('public/review/horizon-v7',{recursive:true});
await fs.writeFile('public/review/horizon-v7/layout.json',JSON.stringify({renderer:'Blender Cycles composition review; not WebGL',cameraRevision:CAMERA_REVISION,styleRevision:STYLE_REVISION,style:STYLE,sky:SKY_PALETTE,ocean:OCEAN_PALETTE,sourceHashes,frames,placements:[...placements].map(([asset,matrices])=>({asset,matrices:matrices.map(m=>m.toArray())}))},null,2));
console.log('Exported live matrices, three camera views and source hashes for offline composition review.');
