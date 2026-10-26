import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const assetBase=new URL('../public/assets/',import.meta.url);
const assets=JSON.parse(fs.readFileSync(new URL('manifest.json',assetBase))).assets;
function gltf(a){const b=fs.readFileSync(new URL(a.file,assetBase));return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));}
test('every detailed asset has four current Cycles turnaround views',()=>{
 const detailed=assets.filter(a=>a.revision==='detail-polish-v6');assert.equal(detailed.length,24);
 const base=new URL('../public/review/detail-v6/',import.meta.url),review=JSON.parse(fs.readFileSync(new URL('manifest.json',base)));
 assert.equal(review.captures.length,detailed.length*4);
 for(const a of detailed)for(const view of ['front','side','rear','clay']){
  const c=review.captures.find(c=>c.asset===a.id&&c.view===view);assert.ok(c);assert.equal(c.assetSha256,a.sha256);
  const png=fs.readFileSync(new URL(c.file,base));assert.equal(png.readUInt32BE(16),800);assert.equal(png.readUInt32BE(20),800);
 }
});
test('external paint and AO images exist and match their content addresses',()=>{
 const paths=new Set(assets.flatMap(a=>a.textures||[]));assert.ok(paths.size>20);
 for(const path of paths){const data=fs.readFileSync(new URL(path,assetBase));assert.ok(path.includes(crypto.createHash('sha256').update(data).digest('hex').slice(0,24)));}
 for(const a of assets.filter(a=>a.revision==='detail-polish-v6'))for(const image of gltf(a).images||[])assert.ok(a.textures.includes(image.uri));
});
test('all houses have illuminated entrance fixtures and both vehicles have four emitting lenses',()=>{
 for(const a of assets.filter(a=>a.id.startsWith('house_')||['car','kei_truck','streetlight'].includes(a.id))){
  const doc=gltf(a),anchors=doc.nodes.filter(n=>n.extras?.localLight).map(n=>n.extras.localLight);
  assert.ok(anchors.length>0,a.id);assert.ok(anchors.every(l=>l.intensity>0&&l.distance>0));
  if(a.id.startsWith('house_'))assert.ok(anchors.some(a=>a.kind==='porch'));
  if(['car','kei_truck'].includes(a.id)){
   assert.equal(anchors.filter(a=>a.kind==='headlight').length,2);assert.equal(anchors.filter(a=>a.kind==='taillight').length,2);
   for(const name of ['headlamp','taillamp'])assert.ok(doc.materials.some(m=>m.name.startsWith(name)&&m.emissiveFactor.some(v=>v>0)));
   assert.ok(doc.meshes.length<=14,'Static wheels must share material batches.');
  }
 }
});
