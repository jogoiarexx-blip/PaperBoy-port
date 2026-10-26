import {NPC_STATES} from '../../engine/living-world.mjs';
import {applyNPCPose} from '../../components/game/npc-view.mjs';
// Real Three.js GLB turnarounds using its CPU SVGRenderer. This is a geometry
// review, not a WebGL/shader or performance test. No browser runtime is launched.
import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import crypto from 'node:crypto';import {createRequire} from 'node:module';
import * as THREE from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {SVGRenderer} from 'three/addons/renderers/SVGRenderer.js';import {poseAt,ANIMATIONS} from '../../engine/animation.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(import.meta.url);let sharp;try{sharp=require('sharp');}catch{sharp=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/package.json')('sharp');}
class SVGNode{constructor(tag){this.tag=tag;this.attributes={};this.childNodes=[];this.style={};}setAttribute(k,v){this.attributes[k]=String(v);}appendChild(n){this.childNodes.push(n);return n;}removeChild(n){this.childNodes.splice(this.childNodes.indexOf(n),1);}get firstChild(){return this.childNodes[0];}get outerHTML(){return `<${this.tag} ${Object.entries(this.attributes).map(([k,v])=>`${k}="${v}"`).join(' ')}>${this.childNodes.map(n=>n.outerHTML).join('')}</${this.tag}>`;}}
globalThis.document={createElementNS:(_,tag)=>new SVGNode(tag)};
const renderer=new SVGRenderer();renderer.setSize(600,600);renderer.setPrecision(2);renderer.overdraw=.18;
const scene=new THREE.Scene();scene.add(new THREE.AmbientLight('#dbe9e2',1.15));const key=new THREE.DirectionalLight('#fff0ce',1.7);key.position.set(-4,8,-5);scene.add(key);const rim=new THREE.DirectionalLight('#aacfee',.65);rim.position.set(5,3,4);scene.add(rim);
const loader=new GLTFLoader(),out=path.join(root,'public/review');await fs.mkdir(out,{recursive:true});const manifest=JSON.parse(await fs.readFile(path.join(root,'public/assets/manifest.json'),'utf8'));const captured=[];
function pose(root,p){root.rotation.z=p.lean+p.fall;root.rotation.x=p.bodyPitch;for(const [name,angle] of [['arm_right',p.rightArm],['arm_left',p.leftArm],['leg_left',p.leftLeg],['leg_right',p.rightLeg],['wheel_front',p.wheel],['wheel_rear',p.wheel]]){const o=root.getObjectByName(name);if(o)o.rotation.x=angle;}}
for(const a of manifest.assets){
  const file=await fs.readFile(path.join(root,'public/assets',a.file));const size=file.readUInt32LE(12),json=JSON.parse(file.subarray(20,20+size));
  for(const m of json.materials||[]){
    delete m.occlusionTexture;delete m.normalTexture;delete m.emissiveTexture;
    const pbr=m.pbrMetallicRoughness||{};
    if(pbr.baseColorTexture){
      const name=m.extras?.surface||m.name.split('@')[0];
      const color={cedar:'#76523b',cedarLight:'#a3784f',bark:'#6d6543',leaf:'#52933b',leafLight:'#83b94f',leafDark:'#39783b',kawara:'#465867',tileLight:'#64788a',stone:'#a4aaa0'}[name];
      if(color)pbr.baseColorFactor=[...new THREE.Color(color).toArray(),1];
      delete pbr.baseColorTexture;
    }
    delete pbr.metallicRoughnessTexture;
  }
  const encoded=Buffer.from(JSON.stringify(json)),padded=Math.ceil(encoded.length/4)*4,binary=file.subarray(20+size),diagnostic=Buffer.alloc(20+padded+binary.length,32);
  diagnostic.writeUInt32LE(0x46546c67,0);diagnostic.writeUInt32LE(2,4);diagnostic.writeUInt32LE(diagnostic.length,8);diagnostic.writeUInt32LE(padded,12);diagnostic.writeUInt32LE(0x4e4f534a,16);encoded.copy(diagnostic,20);binary.copy(diagnostic,20+padded);
  const gltf=await loader.parseAsync(diagnostic.buffer.slice(diagnostic.byteOffset,diagnostic.byteOffset+diagnostic.byteLength),'');
  for(const animation of a.id==='rider'?ANIMATIONS:a.id.startsWith('npc_')?NPC_STATES:['riding'])for(const view of ['front','side','rear','clay']){
    const model=gltf.scene.clone(true);model.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();const colors=o.geometry.getAttribute('color');if(colors){const floats=[];for(let i=0;i<colors.count;i++)floats.push(colors.getX(i),colors.getY(i),colors.getZ(i));o.geometry.setAttribute('color',new THREE.Float32BufferAttribute(floats,3));}o.material=new THREE.MeshLambertMaterial({color:view==='clay'?'#9eaca5':o.material.color,vertexColors:view!=='clay',side:THREE.DoubleSide});}});
    if(a.id==='rider')pose(model,poseAt(animation,animation==='falling'?.55:.25));if(a.id.startsWith('npc_'))applyNPCPose(model,animation,.7,0,a.id.slice(4));scene.add(model);
    const bounds=new THREE.Box3().setFromObject(model),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());const extent=Math.max(size.x,size.y,size.z)*.69;
    const camera=new THREE.OrthographicCamera(-extent,extent,extent,-extent,.001,50000);const direction=view==='front'?new THREE.Vector3(0,.16,-1):view==='side'?new THREE.Vector3(1,.12,0):view==='rear'?new THREE.Vector3(0,.16,1):new THREE.Vector3(1,.65,-1);
    camera.position.copy(center).addScaledVector(direction,Math.max(10,extent*3));camera.lookAt(center);scene.updateMatrixWorld(true);renderer.render(scene,camera);
    const svg=renderer.domElement.outerHTML.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ').replace('>','><rect x="-300" y="-300" width="600" height="600" fill="#eef0e8"/>');
    const name=`${a.id}-${animation}-${view}.png`;await sharp(Buffer.from(svg)).png().toFile(path.join(out,name));captured.push({asset:a.id,animation,view,file:name,faces:renderer.info.render.faces});scene.remove(model);
  }
}
const code=await fs.readFile(path.join(root,'engine/animation.mjs'));const checksum=crypto.createHash('sha256').update(JSON.stringify(manifest)).update(code).update(await fs.readFile(path.join(root,'engine/living-world.mjs'))).update(await fs.readFile(path.join(root,'components/game/npc-view.mjs'))).digest('hex');
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({renderer:'Three.js SVGRenderer — geometry preview; WebGL shader review pending',checkpoint:'06',checksum,captures:captured},null,2)+'\n');
console.log(`Captured ${captured.length} front, side, rear and clay previews from ${manifest.assets.length} actual Blender GLBs.`);
