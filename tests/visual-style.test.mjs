import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {cameraFrame,createPaintedMaterial,configureSun,followSun,STYLE_REVISION} from '../components/game/visual-style.mjs';
import {ground} from '../engine/simulation.mjs';

test('downhill camera keeps the rider and distant bay visible on phones and desktop',()=>{
  for(const aspect of [390/844,844/390,1440/1000])for(const z of [0,260,520])for(const x of [-4.8,0,4.8]){
    const frame=cameraFrame({x,z},aspect),camera=new THREE.PerspectiveCamera(frame.fov,aspect,.1,1500);
    camera.position.copy(frame.position);camera.lookAt(frame.target);camera.updateMatrixWorld();
    const rider=new THREE.Vector3(x,ground(z)+1,-z).project(camera);
    assert.ok(Math.abs(rider.x)<.93&&Math.abs(rider.y)<.85&&rider.z<1,`rider leaves ${aspect} at ${x},${z}`);
    assert.ok(frame.horizonTop>.505&&frame.horizonTop<.53,'the sky occupies the upper half');
    const direction=new THREE.Vector3().subVectors(frame.target,frame.position);direction.y=0;direction.normalize();
    const bay=frame.position.clone().addScaledVector(direction,1100);bay.y=-35;bay.project(camera);
    assert.ok(Math.abs(bay.x)<1&&bay.y>-.25&&bay.y<.08&&bay.z<1,'distant water stays just below the horizon');
  }
});

test('painted surfaces integrate with Three toon lighting and shadow shader chunks',()=>{
  const gradient=new THREE.Texture(),clock={value:4},keys=new Map();
  for(const [name,kind] of [['cream','paint'],['leaf','foliage'],['asphalt','road'],['water','water']]){
    const source=new THREE.MeshStandardMaterial({color:'#77aa66'});source.name=name;
    const material=createPaintedMaterial(source,gradient,clock);
    const shader={uniforms:{},vertexShader:THREE.ShaderLib.toon.vertexShader,fragmentShader:THREE.ShaderLib.toon.fragmentShader};
    material.onBeforeCompile(shader);
    assert.equal(material.isMeshToonMaterial,true);assert.equal(material.vertexColors,true);
    assert.equal(material.userData.surface,kind);assert.equal(material.userData.styleRevision,STYLE_REVISION);
    assert.equal(shader.uniforms.paintTime,clock);
    for(const chunk of ['lights_toon_fragment','lights_fragment_begin','shadowmap_pars_fragment','tonemapping_fragment','colorspace_fragment'])assert.ok(shader.fragmentShader.includes(`#include <${chunk}>`));
    assert.ok(shader.vertexShader.includes('#include <shadowmap_vertex>'));
    assert.ok(shader.fragmentShader.includes('pigmentNoise'));
    if(kind==='foliage')assert.ok(shader.fragmentShader.includes('brushHighlights'));
    if(kind==='water'){assert.equal(material.fog,false);assert.ok(shader.fragmentShader.includes('outgoingLight=mix'))}
    keys.set(kind,material.customProgramCacheKey());material.dispose();source.dispose();
  }
  assert.equal(new Set(keys.values()).size,4,'surface variants must not reuse the wrong compiled shader');
});

test('moving sun covers bicycle, near trees, fences and receiving asphalt through the route',()=>{
  const sun=new THREE.DirectionalLight();configureSun(sun);
  const world=new THREE.Scene();world.add(sun,sun.target);
  for(const z of [0,260,520]){
    followSun(sun,{x:3,z});world.updateMatrixWorld(true);sun.shadow.updateMatrices(sun);
    for(const [x,dz,y] of [[3,0,1.2],[-11,8,5],[11,8,5],[-7.9,8,1],[7.9,8,1],[0,12,0]]){
      const p=new THREE.Vector3(x,ground(z+dz)+y,-z-dz).project(sun.shadow.camera);
      assert.ok(Math.max(Math.abs(p.x),Math.abs(p.y),Math.abs(p.z))<1,'nearby caster or receiver leaves the shadow map');
    }
  }
  assert.ok(sun.color.r>sun.color.b,'sun should be warm');assert.equal(sun.castShadow,true);
});
