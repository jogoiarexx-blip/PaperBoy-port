import * as THREE from 'three';

// Eight direct fixtures + eight low-intensity reflected fills.
// Doubled from 4 to fill the richer world with proper lamp warmth.
export const LOCAL_LIGHT_BUDGET=8;
export function collectLightSources(assets,placements){
  const sources=[];
  for(const [name,transforms] of placements){
    const root=assets.get(name);if(!root)continue;root.updateMatrixWorld(true);
    root.traverse(node=>{
      const spec=node.userData.localLight;if(!spec)return;
      for(let index=0;index<transforms.length;index++){
        const matrix=new THREE.Matrix4().multiplyMatrices(transforms[index],node.matrixWorld);
        sources.push({id:`${name}:${index}:${node.name}`,group:`${name}:${index}`,
          position:new THREE.Vector3().setFromMatrixPosition(matrix),
          color:spec.color,intensity:spec.intensity,distance:spec.distance,kind:spec.kind,
          groundY:transforms[index].elements[13], _d2: 0});
      }
    });
  }
  return sources;
}

export class LocalLightPool{
  constructor(scene,sources,budget=LOCAL_LIGHT_BUDGET){
    this.scene=scene;this.sources=sources;
    this.candidates=[...sources];
    this.groups=new Set();
    this.keep=new Set();
    this.assigned=new Set();
    this.slots=Array.from({length:budget},()=>{
      const direct=new THREE.PointLight('#ffe2ad',0,7,2),bounce=new THREE.PointLight('#ffe2ad',0,4,2);
      direct.castShadow=bounce.castShadow=false;scene.add(direct,bounce);
      return {direct,bounce,source:null,weight:0};
    });
  }
  update(viewer,dt){
    for(let i=0;i<this.candidates.length;i++){
      this.candidates[i]._d2=this.candidates[i].position.distanceToSquared(viewer);
    }
    this.candidates.sort((a,b)=>a._d2-b._d2||a.id.localeCompare(b.id));

    const selected=[];
    this.groups.clear();
    for(let i=0;i<this.candidates.length;i++){
      const c=this.candidates[i];
      if(c._d2>=2500)break;
      if(!this.groups.has(c.group)&&selected.length<this.slots.length){selected.push(c);this.groups.add(c.group);}
    }
    for(let i=0;i<this.candidates.length;i++){
      const c=this.candidates[i];
      if(c._d2>=2500)break;
      if(selected.length<this.slots.length&&!selected.includes(c))selected.push(c);
    }

    this.keep.clear();
    for(let i=0;i<selected.length;i++) this.keep.add(selected[i].id);

    this.assigned.clear();
    for(let i=0;i<this.slots.length;i++){
      if(this.slots[i].source) this.assigned.add(this.slots[i].source.id);
    }

    for(let i=0;i<this.slots.length;i++){
      const slot=this.slots[i];
      if(slot.source&&!this.keep.has(slot.source.id)&&slot.weight<.025){
        this.assigned.delete(slot.source.id);slot.source=null;slot.weight=0;
      }
      if(!slot.source){
        let next=null;
        for(let j=0;j<selected.length;j++){
          if(!this.assigned.has(selected[j].id)){next=selected[j];break;}
        }
        if(next){slot.source=next;this.assigned.add(next.id);}
      }
      const s=slot.source;const distance=s?viewer.distanceTo(s.position):Infinity;
      const target=s&&this.keep.has(s.id)?1-THREE.MathUtils.smoothstep(distance,32,50):0;
      slot.weight=THREE.MathUtils.lerp(slot.weight,target,1-Math.exp(-Math.max(0,dt)*9));
      if(!s){slot.direct.intensity=slot.bounce.intensity=0;continue;}
      slot.direct.position.copy(s.position);slot.direct.color.set(s.color);slot.direct.distance=s.distance;slot.direct.intensity=s.intensity*slot.weight;
      slot.bounce.position.copy(s.position);slot.bounce.position.y=s.groundY+.22;
      slot.bounce.color.set(s.color).lerp(new THREE.Color('#f0c080'),.30);
      slot.bounce.distance=Math.min(5.5,s.distance*.70);slot.bounce.intensity=s.intensity*.095*slot.weight;
    }
  }
  reset(){for(let i=0;i<this.slots.length;i++){const s=this.slots[i];s.source=null;s.weight=0;s.direct.intensity=s.bounce.intensity=0;}}
  dispose(){for(let i=0;i<this.slots.length;i++){const {direct,bounce}=this.slots[i];this.scene.remove(direct,bounce);direct.dispose();bounce.dispose();}}
  get activeCount(){let c=0;for(let i=0;i<this.slots.length;i++)if(this.slots[i].weight>.025)c++;return c;}
}
