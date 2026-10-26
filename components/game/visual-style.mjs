// Style stream integration. Simulation rules and input intent live in engine/.
import * as THREE from 'three';
import {OCEAN_GLSL,OCEAN_PALETTE} from './ocean-shader.mjs';
import {ground} from '../../engine/simulation.mjs';
export {cameraFrame} from './chase-camera.mjs';

export const STYLE_REVISION='horizon-summer-v8-ultra';
export const STYLE={
  sky:'/textures/summer-sky-v5.webp',
  sun:{color:'#ffd98a',intensity:3.4,offset:[-46,30,34],mapSize:1024,span:80}, // Reduced mapSize to 1024 for ultra stable 60 FPS performance
  fill:{sky:'#b8d8ff',ground:'#4d7a40',intensity:1.35},
  fog:{color:'#b8d4cf',near:145,far:520},
  exposure:1.08,
};

const noiseGLSL=/* glsl */`
varying vec3 vPaintPosition;
varying vec3 vPaintNormal;
uniform float paintTime;
uniform vec3 oceanFar;
uniform vec3 oceanShallow;
uniform vec3 oceanDeep;
uniform vec3 oceanFoam;
uniform vec3 oceanGlint;
float pigmentHash(vec2 p){
  vec3 q=fract(vec3(p.xyx)*.1031);
  q+=dot(q,q.yzx+33.33);
  return fract((q.x+q.y)*q.z);
}
float pigmentNoise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(pigmentHash(i),pigmentHash(i+vec2(1.,0.)),f.x),
    mix(pigmentHash(i+vec2(0.,1.)),pigmentHash(i+vec2(1.,1.)),f.x),f.y);
}
`;


export function surfaceKind(name){
  if(['leaf','leafLight','leafDark'].includes(name))return 'foliage';
  if(['asphalt','concrete'].includes(name))return 'road';
  if(name==='water')return 'water';
  if(['cedar','cedarLight','wood','bark'].includes(name))return 'wood';
  if(['kawara','tileLight'].includes(name))return 'tile';
  if(name==='grass')return 'grass';
  return 'paint';
}

export function createPaintedMaterial(source,gradient,timeUniform={value:0}){
  const name=source.userData.surface||source.name.split('@')[0];
  const kind=surfaceKind(name);
  if(name==='vehicleGlass'){
    const glass=new THREE.MeshPhysicalMaterial({color:'#83bbcb',roughness:.17,metalness:.18,clearcoat:.85,clearcoatRoughness:.16,side:THREE.DoubleSide,aoMap:source.aoMap,aoMapIntensity:.45});
    glass.name=name;glass.userData={styleRevision:STYLE_REVISION,surface:'glass'};
    // Opaque illustrated glazing avoids sorted transparency artifacts on instances.
    glass.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float rim=pow(1.0-abs(dot(normalize(normal),normalize(vViewPosition))),2.0);\noutgoingLight=mix(outgoingLight,vec3(.70,.87,.88),.20+rim*.28);\n#include <opaque_fragment>`);};
    glass.customProgramCacheKey=()=>`${STYLE_REVISION}-vehicle-glass`;return glass;
  }
  const material=new THREE.MeshToonMaterial({color:source.color,map:source.map,normalMap:source.normalMap,normalScale:new THREE.Vector2(.30,.30),emissive:source.emissive,emissiveMap:source.emissiveMap,emissiveIntensity:source.emissiveIntensity??1,vertexColors:true,gradientMap:gradient,aoMap:source.aoMap,aoMapIntensity:.8,side:THREE.DoubleSide});
  material.name=name;material.fog=kind!=='water'&&name!=='cloud';
  material.userData={styleRevision:STYLE_REVISION,surface:kind};
  const tint={leaf:'#2d8630',leafLight:'#6db835',leafDark:'#1f6b32',grass:'#7db040',asphalt:'#555e59'}[name];
  if(name==='grass'){
      // Clean Zelda/Ghibli style: no texture map, pure warm green
      // Color is intentionally dark here — MeshToonMaterial + lighting will brighten it
      material.map = null;
      material.color.set('#4a8c28'); // Rich deep green base, lighting will bring it up
  } else if(tint&&!source.map) {
      material.color.set(tint);
  }
  material.onBeforeCompile=shader=>{
    shader.uniforms.paintTime=timeUniform;shader.uniforms.oceanFar={value:new THREE.Color(OCEAN_PALETTE.horizon)};
    for(const [uniform,key] of [['oceanShallow','shallow'],['oceanDeep','deep'],['oceanFoam','foam'],['oceanGlint','glint']])shader.uniforms[uniform]={value:new THREE.Color(OCEAN_PALETTE[key])};
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\nvarying vec3 vPaintPosition;\nvarying vec3 vPaintNormal;`)
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvPaintPosition=position;\nvPaintNormal=normal;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+noiseGLSL);
    let brush=/* glsl */`
      vec2 brushUV=vPaintPosition.xz+vPaintPosition.y*vec2(.39,.73);
      float wash=pigmentNoise(brushUV*1.35);
      float wash2=pigmentNoise(brushUV*.48+vec2(.91,.37));
      float strokes=pigmentNoise(brushUV*vec2(10.0,24.0)+wash*1.8);
      float grain=pigmentNoise(brushUV*90.0);
      float microGrain=pigmentNoise(brushUV*240.0);
      diffuseColor.rgb*=.86+.16*wash+.10*strokes+.04*(grain-.5)+.015*(microGrain-.5);
      diffuseColor.rgb*=.97+.07*wash2;
    `;
    // ── GRASS: Clean Zelda/Ghibli toon style ──────────────────────────────────
    // No tiling textures. Just a soft two-tone warm-green gradient driven by
    // world position and sunlight. Depth comes from shadows only, not texture.
    if(kind==='grass')brush=/* glsl */`
      /* sunlit top: rich warm Zelda-style green */
      vec3 grassLight  = vec3(0.298, 0.588, 0.141); // #4C961E deep saturated green
      /* shadow side: cool olive-green */
      vec3 grassShadow = vec3(0.188, 0.400, 0.086); // #306616 deep olive
      /* Soft depth gradient — far is slightly darker/cooler, not repeated */
      float depthBlend = smoothstep(0.0, 90.0, -vPaintPosition.z);
      vec3 grassColor = mix(grassLight, grassShadow, depthBlend * 0.40);
      /* Sun-facing: top surfaces get a warm highlight, sides stay grounded */
      float sunFacing = clamp(dot(normalize(vPaintNormal), vec3(0.4, 1.0, 0.2)), 0.0, 1.0);
      /* Bright lit patch vs shaded patch — Zelda two-tone cel-shading */
      vec3 litColor    = grassColor * vec3(1.28, 1.18, 0.92); // warm yellow-green sunlit
      vec3 shadedColor = grassColor * vec3(0.78, 0.90, 0.80); // cooler shaded
      grassColor = mix(shadedColor, litColor, sunFacing);
      /* Atmospheric haze: push far grass to a muted teal-grey */
      float fogDist = smoothstep(50.0, 150.0, length(vViewPosition));
      grassColor = mix(grassColor, vec3(0.32, 0.48, 0.30), fogDist * 0.30);
      diffuseColor.rgb = grassColor;
    `;
    if(kind==='foliage')brush+=/* glsl */`
      float upward=smoothstep(-.4,1.0,normalize(vPaintNormal).y);
      float rim=1.0-abs(dot(normalize(vPaintNormal),normalize(vViewPosition)));
      float leaves=smoothstep(.34,.78,pigmentNoise(brushUV*1.8+wash*.65));
      float leavesB=smoothstep(.42,.80,pigmentNoise(brushUV*3.2+wash2*.45));
      float brushHighlights=(.22+.78*upward)*max(leaves,leavesB*.6);
      /* Warm sunlit highlight + cool SSS-like backlighting */
      diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.55,1.22,.68),brushHighlights*.72);
      diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.70,1.08,.72),rim*.18*(1.0-upward));
      diffuseColor.rgb*=.90+.18*upward;
      float fineLeaves=smoothstep(.46,.78,pigmentNoise(brushUV*8.5));
      float fineLeaves2=smoothstep(.52,.80,pigmentNoise(brushUV*18.0));
      float detailFade=1.0-smoothstep(20.0,55.0,length(vViewPosition));
      float nearFade=1.0-smoothstep(50.0,130.0,length(vViewPosition));
      diffuseColor.rgb*=1.0+.075*fineLeaves*upward*detailFade+.035*fineLeaves2*nearFade;
      /* Gentle color temperature shift: yellower top, cooler underside */
      diffuseColor.rgb=mix(diffuseColor.rgb*vec3(1.04,.99,.92),diffuseColor.rgb*vec3(.96,1.00,1.05),upward);
    `;
    if(kind==='wood')brush+=/* glsl */`
      float woodDist=length(vViewPosition);
      float woodDetailHi=1.0-smoothstep(8.0,22.0,woodDist);
      float woodDetailLo=1.0-smoothstep(22.0,55.0,woodDist);
      float growth=sin(vPaintPosition.x*56.0+pigmentNoise(vPaintPosition.xy*1.5)*5.0);
      float growthFine=sin(vPaintPosition.x*180.0+vPaintPosition.z*95.0+grain*4.0);
      float knot=pigmentNoise(vPaintPosition.xz*.8)*smoothstep(.75,1.0,pigmentNoise(vPaintPosition.xz*.22));
      diffuseColor.rgb*=1.0+.025*growth*woodDetailLo+.018*growthFine*woodDetailHi+.08*knot*woodDetailHi;
    `;
    if(kind==='tile')brush+=/* glsl */`
      float tileDist=length(vViewPosition);
      float tileFade=1.0-smoothstep(12.0,40.0,tileDist);
      float tileSheen=smoothstep(.55,.90,pigmentNoise(brushUV*5.5));
      float lichen=smoothstep(.62,.88,pigmentNoise(brushUV*.9+vec2(.5,0.)));
      diffuseColor.rgb*=.93+.10*tileSheen*tileFade;
      diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.88,.94,.78),.055*lichen*tileFade);
    `;
    if(kind==='road')brush+=/* glsl */`
      float asphaltGrain=smoothstep(.3,.76,grain);
      float asphaltMicro=smoothstep(.4,.80,microGrain);
      diffuseColor.rgb*=.89+.13*asphaltGrain+.04*asphaltMicro;
      /* Subtle wet-reflection: darker near camera angle */
      float wet=1.0-smoothstep(5.0,30.0,length(vViewPosition));
      diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.92,.96,1.02),.22+.12*wet);
    `;
    if(kind==='water')brush=OCEAN_GLSL;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+brush);
    if(kind==='water')shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`outgoingLight=mix(diffuseColor.rgb,oceanFar,smoothstep(420.0,1400.0,length(vViewPosition)));\n#include <opaque_fragment>`);
  };
  // A separate cache key is essential: the material body depends on its surface.
  material.customProgramCacheKey=()=>`${STYLE_REVISION}-${kind}`;
  return material;
}

export function configureSun(sun){
  sun.color.set(STYLE.sun.color);sun.intensity=STYLE.sun.intensity;sun.castShadow=true;
  sun.shadow.mapSize.set(STYLE.sun.mapSize,STYLE.sun.mapSize);
  const c=sun.shadow.camera;c.left=-40;c.right=40;c.top=50;c.bottom=-38;c.near=.5;c.far=145;c.updateProjectionMatrix();
  sun.shadow.normalBias=.022;sun.shadow.bias=-.00007;sun.shadow.radius=3;
}

export function followSun(sun,rider){
  const step=STYLE.sun.span/STYLE.sun.mapSize;
  const x=Math.round(rider.x*.24/step)*step,z=Math.round((-rider.z-12)/step)*step,y=ground(-z);
  sun.target.position.set(x,y,z);sun.position.set(x+STYLE.sun.offset[0],y+STYLE.sun.offset[1],z+STYLE.sun.offset[2]);
}
