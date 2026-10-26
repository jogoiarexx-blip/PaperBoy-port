import * as THREE from 'three';
export const SKY_RADIUS=900;
export const SKY_PALETTE=Object.freeze({zenith:'#054fa8',blue:'#1080c8',horizon:'#d8e8d8',cloudShadow:'#6aace0',cloudLight:'#fff8e8'});
export function equirectUV(direction){const d=direction.clone().normalize();return new THREE.Vector2(Math.atan2(d.z,d.x)/(Math.PI*2)+.5,Math.asin(THREE.MathUtils.clamp(d.y,-1,1))/Math.PI+.5);}
export function createSkydome(texture){
  texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;texture.repeat.set(1,1);texture.offset.set(0,0);texture.needsUpdate=true;
  const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.BackSide,depthWrite:false,depthTest:false,fog:false,toneMapped:false});
  material.onBeforeCompile=shader=>{
    shader.uniforms.zenithColor={value:new THREE.Color(SKY_PALETTE.zenith)};shader.uniforms.horizonColor={value:new THREE.Color(SKY_PALETTE.horizon)};
    shader.uniforms.skyBlue={value:new THREE.Color(SKY_PALETTE.blue)};
    shader.uniforms.cloudShadow={value:new THREE.Color(SKY_PALETTE.cloudShadow)};
    shader.uniforms.cloudLight={value:new THREE.Color(SKY_PALETTE.cloudLight)};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 skyDirection;').replace('#include <begin_vertex>','#include <begin_vertex>\nskyDirection=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 skyDirection;\nuniform vec3 zenithColor;\nuniform vec3 horizonColor;\nuniform vec3 skyBlue;\nuniform vec3 cloudShadow;\nuniform vec3 cloudLight;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',/* glsl */`
      vec3 direction=normalize(skyDirection);
      vec2 sphereUV=vec2(atan(direction.z,direction.x)/6.28318530718+.5,asin(clamp(direction.y,-1.,1.))/3.14159265359+.5);
      // Turn the tall painted cloud bank toward the road; preserve a single 360° wrap.
      sphereUV.x=fract(sphereUV.x*2.0+.20);
      // Full equirectangular map. Offset the painted cloud base to true latitude 0.
      sphereUV.y=clamp(sphereUV.y-.025,0.,1.);
      vec3 painting=texture2D(map,sphereUV).rgb;
      vec3 seamColor=.5*(texture2D(map,vec2(.02,sphereUV.y)).rgb+texture2D(map,vec2(.98,sphereUV.y)).rgb);
      float seamDistance=min(sphereUV.x,1.-sphereUV.x);
      painting=mix(seamColor,painting,smoothstep(0.,.055,seamDistance));
      // Grade the existing brushwork in linear light: blue ambient undersides and
      // warm highlights remain dimensional instead of becoming a flat white mask.
      float cloudMask=smoothstep(.06,.32,painting.r/(painting.b+.04));
      float lightness=dot(painting,vec3(.2126,.7152,.0722));
      vec3 cloudGrade=mix(cloudShadow,cloudLight,smoothstep(.15,.88,lightness));
      vec3 paintedCloud=mix(painting,cloudGrade,.32);
      paintedCloud=mix(paintedCloud,cloudLight,.16*smoothstep(.65,.95,lightness));
      vec3 clearSky=mix(skyBlue,zenithColor,smoothstep(.10,.95,direction.y));
      clearSky=mix(horizonColor,clearSky,smoothstep(-.025,.110,direction.y));
      /* Subtle warm golden-hour glow at horizon */
      vec3 horizonGlow=mix(vec3(.98,.88,.65),clearSky,smoothstep(.0,.18,direction.y));
      clearSky=mix(horizonGlow,clearSky,smoothstep(.02,.15,direction.y));
      painting=mix(mix(clearSky,painting,.10),paintedCloud,cloudMask);
      painting=mix(painting,zenithColor,smoothstep(.88,.97,direction.y));
      painting=mix(horizonColor,painting,smoothstep(-.038,.030,direction.y));
      diffuseColor.rgb*=painting;
    `);
  };
  material.customProgramCacheKey=()=> 'painted-spherical-sky-v9-ultra';
  const dome=new THREE.Mesh(new THREE.SphereGeometry(SKY_RADIUS,128,64),material);dome.name='painted-360-skydome';dome.frustumCulled=false;dome.renderOrder=-1000;dome.userData.sky=true;return dome;
}
