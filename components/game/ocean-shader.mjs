// Linear-light uniforms are supplied from THREE.Color; the display transform is
// applied once by Three.js. Units below are authored ocean meters.
export const OCEAN_PALETTE=Object.freeze({shallow:'#28b8ca',deep:'#10446e',foam:'#dff2d4',glint:'#ffda95',horizon:'#a8cfc8'});
export const OCEAN_GLSL=/* glsl */`
 vec2 sea=vPaintPosition.xz;
 float coast=100.0+sin(sea.x*.014)*8.0+sin(sea.x*.039)*2.5+sin(sea.x*.091)*1.2;
 float shoreDistance=max(0.0,coast-sea.y);
 float depth=smoothstep(0.,520.,shoreDistance);
 vec3 seaColor=mix(oceanShallow,oceanDeep,depth);
 /* Two-layer wave pattern — broad swell + medium chop */
 float broadWave=sin(sea.y*.065+sin(sea.x*.012)*1.8+paintTime*.65);
 float chopWave=sin(sea.y*.21+sin(sea.x*.048)*1.2+paintTime*1.1)*0.5;
 seaColor*=.92+.10*floor((broadWave*.5+.5)*3.)/3.+.05*(chopWave*.5+.5);
 float paintedWash=pigmentNoise(sea*vec2(.028,.11)+vec2(paintTime*.013,0.));
 float paintedWash2=pigmentNoise(sea*vec2(.058,.042)+vec2(0.,paintTime*.009));
 seaColor*=.94+.08*paintedWash+.04*paintedWash2;
 /* Shore foam ribbon — animated */
 float ribbon=sin(shoreDistance*.55-paintTime*1.45+sin(sea.x*.16)*.65);
 float ribbonWidth=min(.18,fwidth(ribbon));
 float ribbonMask=smoothstep(.87-ribbonWidth,.98+ribbonWidth,ribbon)*(1.-smoothstep(18.,62.,shoreDistance));
 float shoreLip=(1.-smoothstep(1.2,3.5,shoreDistance))*(.72+.18*sin(paintTime*1.45));
 /* Sun glint path */
 float sunPath=exp(-pow((sea.x-40.-shoreDistance*.04)/(16.+shoreDistance*.16),2.));
 vec2 cell=floor(sea*vec2(.5,1.8));
 float sparkle=step(.89,pigmentHash(cell))*pow(max(0.,sin(paintTime*2.+pigmentHash(cell)*40.)),10.);
 float detailFade=1.-smoothstep(.45,1.4,length(fwidth(sea*vec2(.5,1.8))));
 float glint=sparkle*sunPath*smoothstep(.3,.65,fract(sea.y*1.8))*detailFade;
 /* Secondary micro-sparkle on wave crests */
 vec2 cell2=floor(sea*vec2(1.8,.9));
 float sparkle2=step(.94,pigmentHash(cell2))*pow(max(0.,sin(paintTime*3.1+pigmentHash(cell2)*55.)),14.);
 float glint2=sparkle2*sunPath*smoothstep(.4,.75,fract(sea.y*.9))*detailFade*.55;
 diffuseColor.rgb=mix(seaColor,oceanFoam,max(ribbonMask*.88,shoreLip));
 diffuseColor.rgb+=oceanGlint*(glint*.75+glint2*.4);
`;
