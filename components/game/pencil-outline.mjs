import * as THREE from 'three';
export function pencilMaterial(width=.012){
  const material=new THREE.MeshBasicMaterial({color:'#344740',side:THREE.BackSide,transparent:true,opacity:.30,depthWrite:false});material.name='pencil-outline';
  material.onBeforeCompile=shader=>{
    shader.uniforms.pencilWidth={value:width};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float pencilWidth;').replace('#include <begin_vertex>','#include <begin_vertex>\nfloat pencilGrain=.92+.08*sin(position.x*41.+position.y*53.+position.z*29.);\ntransformed+=normal*pencilWidth*pencilGrain;');
  };
  material.customProgramCacheKey=()=>`pencil-hull-v4-${width}`;return material;
}
export function addPencilOutlines(root,material){
  const meshes=[];root.traverse(o=>{if(o.isMesh&&!o.userData.outline)meshes.push(o);});
  for(const source of meshes){const outline=new THREE.Mesh(source.geometry,material);outline.name='outline-'+source.name;outline.userData.outline=true;outline.castShadow=false;outline.receiveShadow=false;source.add(outline);}
}
