import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LocalLightPool,collectLightSources,selectLightSources,LOCAL_LIGHT_BUDGET} from '../components/game/local-lighting.mjs';
import {createPaintedMaterial} from '../components/game/visual-style.mjs';

const source=(id,x=0,z=0,group=id)=>({id,group,position:new THREE.Vector3(x,2,z),color:'#ffe3ab',intensity:14,distance:7,groundY:0,kind:'porch'});
test('light anchors follow the same rotation and translation as instanced houses',()=>{
 const root=new THREE.Group(),lamp=new THREE.Object3D();lamp.position.set(1,2,-3);lamp.userData.localLight={kind:'porch',intensity:14,distance:7,color:'#ffe3ab'};root.add(lamp);
 const placement=new THREE.Matrix4().makeRotationY(Math.PI/2);placement.setPosition(12,-1,-24);
 const result=collectLightSources(new Map([['house',root]]),new Map([['house',[placement]]]))[0];
 assert.deepEqual(result.position.toArray(),[9,1,-25]);assert.equal(result.groundY,-1);
});
test('nearby light selection is bounded and gives neighbors a share of the budget',()=>{
 const sources=[source('a',0,0,'car'),source('b',0,.1,'car'),source('c',0,.2,'car'),source('porch',3),source('street',4),source('far',100)];
 const chosen=selectLightSources(sources,new THREE.Vector3());assert.equal(chosen.length,LOCAL_LIGHT_BUDGET);assert.ok(chosen.some(s=>s.id==='porch'));assert.ok(chosen.some(s=>s.id==='street'));assert.ok(!chosen.some(s=>s.id==='far'));
});
test('pooled fixture fades are stable across frame rates and release stale positions',()=>{
 function settle(hz){const pool=new LocalLightPool(new THREE.Scene(),[source('home')]);for(let i=0;i<hz;i++)pool.update(new THREE.Vector3(),1/hz);return pool;}
 const a=settle(30),b=settle(144);assert.ok(Math.abs(a.slots[0].direct.intensity-b.slots[0].direct.intensity)<1e-10);
 for(let i=0;i<90;i++)a.update(new THREE.Vector3(100,0,0),1/30);
 assert.equal(a.activeCount,0);assert.ok(a.slots.every(s=>s.direct.intensity===0));a.reset();assert.equal(a.activeCount,0);
});
test('local lighting has a fixed light count and disposes only its own lights',()=>{
 const scene=new THREE.Scene(),sun=new THREE.DirectionalLight();scene.add(sun);const pool=new LocalLightPool(scene,[source('porch')]);pool.update(new THREE.Vector3(),1);
 assert.equal(scene.children.length,1+LOCAL_LIGHT_BUDGET*2);assert.ok(pool.slots.every(s=>s.direct.decay===2&&!s.direct.castShadow));
 assert.ok(pool.slots[0].bounce.intensity<pool.slots[0].direct.intensity);pool.dispose();assert.deepEqual(scene.children,[sun]);
});
test('paint preserves texture UV channels and AO; glass avoids transparency sorting',()=>{
 const source=new THREE.MeshStandardMaterial();source.name='cedar@house';source.map=new THREE.Texture();source.normalMap=new THREE.Texture();source.aoMap=new THREE.Texture();source.aoMap.channel=1;
 const m=createPaintedMaterial(source,new THREE.Texture());assert.equal(m.map,source.map);assert.equal(m.normalMap,source.normalMap);assert.equal(m.aoMap.channel,1);
 source.name='vehicleGlass';const glass=createPaintedMaterial(source,new THREE.Texture());assert.ok(glass.isMeshPhysicalMaterial);assert.equal(glass.transparent,false);assert.ok(glass.clearcoat>0);
});
