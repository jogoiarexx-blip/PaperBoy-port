import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from 'three';
import {createSkydome,equirectUV} from '../components/game/skydome.mjs';
import {createPaintedMaterial} from '../components/game/visual-style.mjs';
import {pencilMaterial,addPencilOutlines} from '../components/game/pencil-outline.mjs';
test('skydome maps a full sphere without mirrored repeats and removes polar cloud detail',()=>{
 const texture=new THREE.Texture(),dome=createSkydome(texture);assert.equal(dome.geometry.type,'SphereGeometry');assert.equal(dome.material.side,THREE.BackSide);assert.equal(dome.material.depthWrite,false);assert.equal(texture.wrapS,THREE.ClampToEdgeWrapping);
 assert.deepEqual(equirectUV(new THREE.Vector3(1,0,0)).toArray(),[.5,.5]);assert.equal(equirectUV(new THREE.Vector3(0,1,0)).y,1);assert.equal(equirectUV(new THREE.Vector3(0,-1,0)).y,0);
 assert.ok(equirectUV(new THREE.Vector3(-1,0,-1e-9)).x<1e-8);assert.ok(equirectUV(new THREE.Vector3(-1,0,1e-9)).x>1-1e-8);
 const shader={uniforms:{},vertexShader:THREE.ShaderLib.basic.vertexShader,fragmentShader:THREE.ShaderLib.basic.fragmentShader};dome.material.onBeforeCompile(shader);assert.ok(shader.fragmentShader.includes('mix(seamColor,painting'));assert.ok(shader.fragmentShader.includes('smoothstep(.88,.97,direction.y)'));
});
test('toon surfaces preserve asset-specific baked AO maps and base names',()=>{
 const source=new THREE.MeshStandardMaterial();source.name='cedar@house_0';source.userData.surface='cedar';source.aoMap=new THREE.Texture();
 const material=createPaintedMaterial(source,new THREE.Texture(),{value:0});assert.equal(material.aoMap,source.aoMap);assert.equal(material.name,'cedar');assert.ok(material.aoMapIntensity>0);
});
test('inverted hull follows the source pivot and does not cast a second shadow',()=>{
 const root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());root.add(mesh);const pencil=pencilMaterial();addPencilOutlines(root,pencil);
 const outline=mesh.children[0];assert.equal(outline.geometry,mesh.geometry);assert.equal(outline.material.side,THREE.BackSide);assert.equal(outline.castShadow,false);mesh.position.x=3;root.updateMatrixWorld();assert.equal(outline.getWorldPosition(new THREE.Vector3()).x,3);
});
test('all seven houses and rider have four fresh Blender review views',()=>{
 const base=new URL('../public/review/japanese-v4/',import.meta.url),review=JSON.parse(fs.readFileSync(new URL('manifest.json',base))),assets=JSON.parse(fs.readFileSync(new URL('../public/assets/manifest.json',import.meta.url))).assets;
 assert.equal(review.captures.length,32);
 for(const a of assets.filter(a=>(a.id.startsWith('house_')||a.id==='rider')&&a.revision!=='detail-polish-v6'))for(const view of ['front','side','rear','clay']){
  const c=review.captures.find(c=>c.asset===a.id&&c.view===view);assert.ok(c);assert.equal(c.assetSha256,a.sha256);const png=fs.readFileSync(new URL(c.file,base));assert.equal(png.readUInt32BE(16),800);assert.equal(png.readUInt32BE(20),800);
 }
});
