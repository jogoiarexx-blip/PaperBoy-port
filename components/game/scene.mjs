import {createWorldPlacements} from './world-layout.mjs';
import {generateYardGrass} from './grass-system.mjs';
import {createSkydome} from './skydome.mjs';
import {pencilMaterial,addPencilOutlines} from './pencil-outline.mjs';
import {LivingWorld,NPC_STATES} from '../../engine/living-world.mjs';
import {applyNPCPose} from './npc-view.mjs';
import {applyDogPose} from './dog-view.mjs';
import {LocalLightPool,collectLightSources} from './local-lighting.mjs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {Simulation,FixedStepper,ground,RULES,trajectory,positionAt} from '../../engine/simulation.mjs';
import {PointerIntent} from '../../engine/controls.mjs';
import {poseAt,ANIMATIONS} from '../../engine/animation.mjs';
import {STYLE,STYLE_REVISION,createPaintedMaterial,configureSun,followSun} from './visual-style.mjs';
import {ChaseCameraRig,CAMERA_REVISION} from './chase-camera.mjs';
import {WalkController} from './walk-controller.mjs';

const world=(p, target)=>target.set(p.x,p.y??ground(p.z),-p.z);
export async function createGame(canvas,onUpdate,onLoad){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.25)); // Ultra-stable 60 FPS optimization for mobile/console
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=STYLE.exposure;
  const shaderErrors=[];renderer.debug.onShaderError=(gl,program,vertex,fragment)=>shaderErrors.push({program:gl.getProgramInfoLog(program),vertex:gl.getShaderInfoLog(vertex),fragment:gl.getShaderInfoLog(fragment)});
  function ensureWebGLFrame(){if(renderer.getContext().isContextLost())throw Error('The graphics context was lost. Reload before capturing.');if(shaderErrors.length)throw Error('WebGL shader compilation failed; this frame cannot be accepted.');}
  const scene=new THREE.Scene();scene.fog=new THREE.Fog(STYLE.fog.color,STYLE.fog.near,STYLE.fog.far);
  const skyLoading=new THREE.TextureLoader().loadAsync(STYLE.sky);
  const camera=new THREE.PerspectiveCamera(68,1,.1,1500);const sim=new Simulation(),clock=new FixedStepper(sim),pointer=new PointerIntent();
  const loader=new GLTFLoader();
  const dracoLoader=new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
  loader.setDRACOLoader(dracoLoader);
  
  const audioListener = new THREE.AudioListener(); camera.add(audioListener);
  const audioLoader = new THREE.AudioLoader();
  const bgmAudio = new THREE.Audio(audioListener);
  const bgmLoading = audioLoader.loadAsync('/assets/audio/bgm.mp3').then(b => { bgmAudio.setBuffer(b); bgmAudio.setLoop(true); bgmAudio.setVolume(0.06); }).catch(()=>null);
  let audioContextStarted = false;

  const manifest=await fetch('/assets/manifest.json').then(r=>{if(!r.ok)throw Error('Asset manifest unavailable');return r.json();});
  const assets=new Map();let loaded=0;
  await Promise.all(manifest.assets.map(async entry=>{
      const gltf=await loader.loadAsync('/assets/'+entry.file);
      if (gltf.animations && gltf.animations.length) gltf.scene.userData.animations = gltf.animations;
      assets.set(entry.id,gltf.scene);
      onLoad(++loaded/manifest.assets.length); 
  }));
  const skyTexture=await skyLoading; await Promise.all([bgmLoading]);
  skyTexture.colorSpace=THREE.SRGBColorSpace;skyTexture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());const skydome=createSkydome(skyTexture);scene.add(skydome);
  const gradient=new THREE.DataTexture(new Uint8Array([88,151,211,255]),4,1,THREE.RedFormat);gradient.needsUpdate=true;gradient.minFilter=gradient.magFilter=THREE.NearestFilter;
  const materialCache=new Map(),sharedPaintMaps=new Map(),timeUniform={value:0};
  function paint(old){
    const key=old.uuid;if(materialCache.has(key))return materialCache.get(key);
    const surface=old.userData.surface||old.name.split('@')[0];
    if(old.userData.paintedTexture)for(const property of ['map','normalMap'])if(old[property]){const sharedKey=surface+':'+property;if(sharedPaintMaps.has(sharedKey))old[property]=sharedPaintMaps.get(sharedKey);else sharedPaintMaps.set(sharedKey,old[property]);}
    const m=createPaintedMaterial(old,gradient,timeUniform);materialCache.set(key,m);return m;
  }
  // Anisotropy helper — use hardware max up to 8 for crisp distant textures
  const maxAniso=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const pencil=pencilMaterial(.014),riderPencil=pencilMaterial(.005);

  
  const lanternAsset = assets.get('lantern');
  if (lanternAsset) {
     lanternAsset.userData.localLight = {color: '#ffa85c', intensity: 2.0, distance: 10.0, kind: 'lantern'};
     // Material will be set in the loop below
  }
  const toriiAsset = assets.get('torii');
  if (toriiAsset) {
     const vermilion = new THREE.MeshToonMaterial({color: '#cc3322', gradientMap: gradient});
     const darkRoof = new THREE.MeshToonMaterial({color: '#2a2a2a', gradientMap: gradient});
     const stone = new THREE.MeshToonMaterial({color: '#8b8c89', gradientMap: gradient});
     toriiAsset.traverse(o => {
        if (o.isMesh) {
           let mat = vermilion;
           const n = o.name.toLowerCase() + (o.material ? o.material.name.toLowerCase() : '');
           if (n.includes('roof') || n.includes('top') || n.includes('black') || n.includes('dark')) mat = darkRoof;
           if (n.includes('base') || n.includes('stone') || n.includes('pedestal')) mat = stone;
           o.material = mat;
        }
     });
  }
  const stoneLanternAsset = assets.get('stone_lantern');
  if (stoneLanternAsset) {
     stoneLanternAsset.userData.localLight = {color: '#ffc87a', intensity: 2.0, distance: 8.0, kind: 'stone_lantern'};
     const stoneMat = new THREE.MeshToonMaterial({color: '#8b8c89', gradientMap: gradient});
     stoneLanternAsset.traverse(o => {
        if (o.isMesh) {
           const n = o.name.toLowerCase() + (o.material ? o.material.name.toLowerCase() : '');
           if(n.includes('light') || n.includes('emit') || n.includes('glow') || n.includes('bulb') || n.includes('glass')) {
               o.material = new THREE.MeshBasicMaterial({color: '#ffddaa'});
           } else {
               o.material = stoneMat;
           }
        }
     });
  }

  for(const [id,model] of assets){model.traverse(o=>{if(o.isMesh){
    if (id === 'torii' && o.material.isMeshToonMaterial) {
      // Keep colored torii material
    } else if (id === 'lantern') {
      // Use Toon material with emissive map for the paper lantern
      o.material = new THREE.MeshToonMaterial({
          color: o.material.color || '#ffffff',
          map: o.material.map || null,
          emissive: '#ffaa55',
          emissiveMap: o.material.emissiveMap || o.material.map || null,
          emissiveIntensity: 1.2,
          gradientMap: gradient
      });
    } else if (id === 'house_start' || id === 'japanese_temple' || id === 'japanese_cherry_tree') {
      // Keep its original native material so textures aren't lost by Toon conversion
    } else if (id === 'stone_lantern') {
      // Handled above
    } else if (id === 'tree_pink') {
      // Pink tree has generic mesh names (Object_0), so force pink color and preserve alpha maps
      o.material = new THREE.MeshToonMaterial({
          color: '#ffb7c5',
          map: o.material.map || null,
          alphaTest: 0.5, // Ensure leaf cutouts work
          side: THREE.DoubleSide,
          transparent: true,
          gradientMap: gradient
      });
    } else if (id === 'horse') {
      const n = (o.material.name || '').toLowerCase();
      let color = '#8b4513'; // Brown body
      if (n.includes('hair')) color = '#222222'; // Dark hair
      else if (n.includes('saddle')) color = '#552222'; // Dark red saddle
      o.material = new THREE.MeshToonMaterial({
          color: color,
          alphaTest: 0.5,
          side: THREE.DoubleSide,
          gradientMap: gradient
      });
      o.frustumCulled = false;
    } else if (id === 'tree_green' || id === 'tree_yellow') {
      // Apply Ghibli toon shading to the new custom trees
      let c = id === 'tree_green' ? '#7da453' : '#d9b626';
      const n = o.name.toLowerCase() + (o.material ? o.material.name.toLowerCase() : '');
      if (n.includes('leaf') || n.includes('leaves') || n.includes('foliage')) {
         o.material = new THREE.MeshToonMaterial({color: c, gradientMap: gradient, alphaTest: 0.5, side: THREE.DoubleSide});
      } else if (n.includes('trunk') || n.includes('bark') || n.includes('wood')) {
         o.material = new THREE.MeshToonMaterial({color: '#5c4a3d', gradientMap: gradient});
      } else {
         o.material = paint(o.material);
      }
    } else if (id === 'sakura_tree') {
      if (o.material) {
        o.material = new THREE.MeshBasicMaterial({
          map: o.material.map,
          color: o.material.color || 0xffffff,
          alphaTest: 0.5,
          side: THREE.DoubleSide,
          transparent: false
        });
      }
      o.castShadow = true;
      o.receiveShadow = true;
      return;
    } else if (id === 'potted_plants') {
      // Keep original stylized PBR materials — toon conversion turns them black
      o.castShadow = false; // Disable shadow casting for perf
      o.receiveShadow = true;
      o.frustumCulled = true;
      for(const map of [o.material.map,o.material.normalMap,o.material.aoMap])if(map)map.anisotropy=maxAniso;
      return; // Skip paint() and shadow reassignment below
    } else {
      o.material=paint(o.material);
    }
    o.castShadow=o.material.name!=='vehicleGlass';
    o.receiveShadow=true;
    for(const map of [o.material.map,o.material.normalMap,o.material.aoMap])if(map)map.anisotropy=maxAniso;
  }});if(!['sakura_tree','tree_pink','tree_green','tree_yellow','japanese_cherry_tree','stone_lantern','lantern','torii','road','road_markings','terrain','ocean','cloud','utility_pole','beach','potted_plants','flower_patch','drain_grate'].includes(id))addPencilOutlines(model,id==='rider'||id.startsWith('npc_')?riderPencil:pencil);}
  scene.add(new THREE.HemisphereLight(STYLE.fill.sky,STYLE.fill.ground,STYLE.fill.intensity));
  const sun=new THREE.DirectionalLight();configureSun(sun);followSun(sun,sim.rider);scene.add(sun,sun.target);
  const environment=new THREE.Group();scene.add(environment);const placements=createWorldPlacements(sim);
  const cityPlaneGeo = new THREE.PlaneGeometry(2000, 2000);
  const cityPlaneMat = new THREE.MeshToonMaterial({ color: 0xa4c639, gradientMap: gradient }); 
  const cityPlane = new THREE.Mesh(cityPlaneGeo, cityPlaneMat);
  cityPlane.rotation.x = -Math.PI / 2;
  cityPlane.position.set(1000, ground(800) - 0.08, -1000);
  cityPlane.receiveShadow = true;
  scene.add(cityPlane);
  generateYardGrass(sim, scene, timeUniform);
  const localLighting=new LocalLightPool(scene,collectLightSources(assets,placements));
  const instances=[];
  for(const [name,transforms] of placements){const asset=assets.get(name);if(!asset){console.warn('Missing asset:',name);continue;}asset.updateMatrixWorld(true);const batches=new Map();for(const transform of transforms){const chunk=['cloud','ocean','terrain','beach'].includes(name)?0:Math.floor(-transform.elements[14]/69);if(!batches.has(chunk))batches.set(chunk,[]);batches.get(chunk).push(transform);}for(const [chunk,transforms] of batches)asset.traverse(o=>{
    if(!o.isMesh)return;const mesh=new THREE.InstancedMesh(o.geometry,o.material,transforms.length);mesh.matrixAutoUpdate=false;mesh.userData.outline=!!o.userData.outline;mesh.castShadow=!o.userData.outline&&o.material.name!=='vehicleGlass'&&!['road','road_markings','ocean','terrain','cloud'].includes(name);mesh.receiveShadow=!o.userData.outline&&name!=='cloud';
    for(let i=0;i<transforms.length;i++)mesh.setMatrixAt(i,new THREE.Matrix4().multiplyMatrices(transforms[i],o.matrixWorld));mesh.computeBoundingSphere();mesh.userData.asset=name;mesh.userData.chunk=chunk;environment.add(mesh);instances.push(mesh);
  });}
  const mailboxes=new Map(),windowTargets=[];
  for(const t of sim.targets){if(!t.subscriber)continue;const obj=assets.get('mailbox').clone(true);obj.matrixAutoUpdate=false;world(t,obj.position);obj.rotation.y=t.side*Math.PI/2;obj.updateMatrix();obj.traverse(o=>o.userData.targetId=t.id);scene.add(obj);mailboxes.set(t.id,obj);}
  for(const t of sim.targets){if(t.subscriber)continue;const house=sim.houses.find(h=>h.id===t.houseId);const source=assets.get('house_'+house.family);source.updateMatrixWorld(true);source.traverse(o=>{if(o.isMesh&&o.material.name==='glass'){const pick=new THREE.Mesh(o.geometry,new THREE.MeshBasicMaterial({visible:false,color:'#254c5e',side:THREE.DoubleSide}));pick.applyMatrix4(o.matrixWorld);pick.position.z-=.006;const root=new THREE.Group();root.matrixAutoUpdate=false;world(house,root.position);root.rotation.y=t.side*Math.PI/2;root.updateMatrix();root.add(pick);root.userData.targetId=t.id;pick.userData.targetId=t.id;scene.add(root);windowTargets.push(root);}});}
  // Dog models: scale to ~0.5–0.6m shoulder height. Variant overrides applied in applyDogPose.
  const dogModels=new Map();for(const d of sim.dogs){const obj=assets.get('dog').clone(true);obj.scale.setScalar(0.38);obj.traverse(o=>o.userData.targetId=d.id);scene.add(obj);dogModels.set(d.id,obj);}
  const rider=assets.get('rider').clone(true);
  scene.add(rider);
  
  const residents=new LivingWorld(),npcModels=new Map();
  // NPC models: scale to ~1.75m. If the GLB mesh is ~1.9 units tall, scale 0.92 ≈ 1.75m.
  for(const n of residents.npcs){const model=assets.get('npc_'+n.outfit).clone(true);model.scale.setScalar(0.92);scene.add(model);npcModels.set(n.id,model);}
  const projectiles=new Map();
  const arcGeometry=new THREE.BufferGeometry();arcGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(25*3),3));
  const arcMat=new THREE.PointsMaterial({color:'#fff9db',size:.095,sizeAttenuation:true,depthTest:false});const arc=new THREE.Points(arcGeometry,arcMat);arc.frustumCulled=false;arc.renderOrder=8;scene.add(arc);
  const markerGeometry=new THREE.BufferGeometry();let ring=[];for(let i=0;i<=48;i++){const a=i/48*Math.PI*2;ring.push(Math.cos(a)*.65,0,Math.sin(a)*.65);}markerGeometry.setAttribute('position',new THREE.Float32BufferAttribute(ring,3));const marker=new THREE.Line(markerGeometry,new THREE.LineBasicMaterial({color:'#f8df7a',depthTest:false}));scene.add(marker);
  let last=performance.now(),frame=0,disposed=false,muted=true,audioContext=null,reviewing=false,reviewObject=null,reviewState=null,reviewCamera=null;
  let viewport={width:1,height:1},keys=new Set(),notice='',noticeUntil=0,previousEvents=0,fps=60;
  const chase=new ChaseCameraRig(sim.rider,canvas.clientWidth/Math.max(1,canvas.clientHeight));
  // ── WALK MODE: Third-Person Character Controller (toggle with E key) ──────
  const walkCtrl = new WalkController(canvas);
  let walkMode   = false;
  let walkerModel = null; // visual avatar spawned when entering walk mode
  let walkTime = 0; // Local time accumulator for walker animation
  function enterWalkMode() {
    if (walkMode) return;
    walkMode = true;
    if (sim.mode === 'playing') sim.pause();
    // Spawn walker avatar at rider position (clone an NPC model)
    if (!walkerModel) {
      walkerModel = assets.get('npc_summer').clone(true);
      walkerModel.scale.setScalar(0.92); // match NPC scale
      scene.add(walkerModel);
    }
    walkerModel.visible = true;
    ['arm_left', 'arm_right', 'head', 'leg_left', 'leg_right', 'torso'].forEach(n => {
      const obj = rider.getObjectByName(n);
      if (obj) obj.visible = false;
    });
    walkCtrl.activate(sim.rider.x, sim.rider.z, canvas);
  }
  function exitWalkMode() {
    if (!walkMode) return;
    walkMode = false;
    walkCtrl.deactivate();
    // Sync rider back to walker position
    const pos = walkCtrl.position;
    sim.rider.x = Math.max(-RULES.roadLimit, Math.min(RULES.roadLimit, pos.x));
    if (walkerModel) walkerModel.visible = false;
    ['arm_left', 'arm_right', 'head', 'leg_left', 'leg_right', 'torso'].forEach(n => {
      const obj = rider.getObjectByName(n);
      if (obj) obj.visible = true;
    });
    sim.resume();
    last = performance.now();
    updateCamera(0, true);
  }
  const raycaster=new THREE.Raycaster();const abort=new AbortController();
  const scratchVec=new THREE.Vector3(); // Prevent GC stutter
  let cameraMode = 'chase';
  function updateCamera(dt,reset=false){
    if (cameraMode === 'topdown') {
      const rx = sim.rider.x;
      const rz = sim.rider.z;
      camera.position.set(rx, ground(rz) + 120, -rz + 1); 
      camera.lookAt(rx, ground(rz), -rz);
      camera.fov = 60;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      skydome.position.copy(camera.position);
      return;
    }
    const framing=reset?chase.reset(sim.rider,camera.aspect):chase.update(sim.rider,camera.aspect,dt);
    camera.position.copy(framing.position);camera.lookAt(framing.target);camera.fov=framing.fov;camera.updateProjectionMatrix();
    camera.updateMatrixWorld(); // Aim picking and HUD projection use this frame's view.
    skydome.position.copy(camera.position);
  }
  function resize(){const rect=canvas.getBoundingClientRect();viewport={width:rect.width,height:rect.height};renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/Math.max(1,rect.height);updateCamera(0);}
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  function clearControls(){pointer.release();keys.clear();sim.release();}
  function tryStartAudio() {
    if (!audioContextStarted && audioListener.context.state !== 'running') {
      audioListener.context.resume().then(() => {
        audioContextStarted = true;
        if(bgmAudio.buffer && !bgmAudio.isPlaying) bgmAudio.play();
      });
    }
  }
  function aimAt(x,y){const rect=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),camera);const hits=raycaster.intersectObjects([...mailboxes.values(),...dogModels.values(),...windowTargets],true);if(hits.length)sim.setAim(hits[0].object.userData.targetId);}
  canvas.addEventListener('pointerdown',e=>{tryStartAudio();if(sim.mode!=='playing'||reviewing)return;aimAt(e.clientX,e.clientY);if(pointer.down(e.pointerId,e.clientX,e.clientY,performance.now()))canvas.setPointerCapture(e.pointerId);},{signal:abort.signal});
  canvas.addEventListener('pointermove',e=>{pointer.move(e.pointerId,e.clientX,e.clientY);if(!pointer.active)aimAt(e.clientX,e.clientY);},{signal:abort.signal});
  canvas.addEventListener('pointerup',e=>{if(pointer.up(e.pointerId,performance.now()))sim.throwPaper();sim.release();},{signal:abort.signal});
  for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,clearControls,{signal:abort.signal});
  window.addEventListener('keydown',e=>{tryStartAudio();if(e.code==='KeyE'){if(!e.repeat){if(walkMode)exitWalkMode();else enterWalkMode();}return;}if(e.code==='KeyC'){cameraMode=cameraMode==='chase'?'topdown':'chase';updateCamera(0,true);return;}if(walkMode)return; // walk mode consumes its own keys via WalkController
    if(['ArrowLeft','ArrowRight','ArrowUp','Space','KeyA','KeyD','KeyW'].includes(e.code)){e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat)sim.throwPaper();}if((e.code==='Escape'||e.code==='KeyP')&&!reviewing){if(sim.mode==='playing')sim.pause();else if(sim.mode==='paused')sim.resume();}},{signal:abort.signal});
  window.addEventListener('keyup',e=>{keys.delete(e.code);if(!keys.has('ArrowLeft')&&!keys.has('ArrowRight')&&!keys.has('KeyA')&&!keys.has('KeyD'))sim.setInput({steer:0});},{signal:abort.signal});
  window.addEventListener('blur',()=>{clearControls();sim.pause();},{signal:abort.signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearControls();sim.pause();}last=performance.now();},{signal:abort.signal});
  function sound(frequency,duration=.13){if(muted)return;try{audioContext??=new window.AudioContext();audioContext.resume();const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,audioContext.currentTime);oscillator.frequency.exponentialRampToValueAtTime(frequency*1.4,audioContext.currentTime+duration);gain.gain.setValueAtTime(.07,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+duration);oscillator.connect(gain).connect(audioContext.destination);oscillator.start();oscillator.stop(audioContext.currentTime+duration);}catch{}}
  function applyPose(root,pose){const node=n=>root.getObjectByName(n);root.rotation.z=pose.lean+pose.fall;root.rotation.x=pose.bodyPitch;
    if(node('leg_left'))node('leg_left').rotation.x=pose.leftLeg;if(node('leg_right'))node('leg_right').rotation.x=pose.rightLeg;
    if(node('arm_left'))node('arm_left').rotation.x=pose.leftArm;if(node('arm_right'))node('arm_right').rotation.x=pose.rightArm;
    if(node('wheel_front'))node('wheel_front').rotation.x=pose.wheel;if(node('wheel_rear'))node('wheel_rear').rotation.x=pose.wheel;
  }
  function renderGame(now){
    const realDt=Math.min((now-last)/1000,.1);last=now;fps=fps*.97+(1/Math.max(realDt,.001))*.03;
    if(!reviewing){
      const p=pointer.sample(now);sim.setInput({steer:keys.has('ArrowLeft')||keys.has('KeyA')?-1:keys.has('ArrowRight')||keys.has('KeyD')?1:p.steer,pedal:p.pedal||keys.has('ArrowUp')||keys.has('KeyW')||keys.has('ShiftLeft')||keys.has('ShiftRight')});
      clock.advance(realDt);timeUniform.value=sim.time;const r=sim.rider;residents.updateTo(sim.tick);
      for(const n of residents.npcs){const model=npcModels.get(n.id);model.visible=n.z>r.z-25&&n.z<r.z+110;if(!model.visible)continue;model.position.set(n.x,ground(n.floorZ??n.z),-n.z);model.rotation.y=n.yaw;applyNPCPose(model,n.state,sim.time,n.phase,n.outfit);}
      const mode=sim.time-sim.lastCrash<1.1?'falling':sim.time-sim.lastThrow<.5?'throwing':sim.input.pedal?'sprinting':r.steer?'steering':'riding';      // Player
      const pose=poseAt(mode,mode==='throwing'?sim.time-sim.lastThrow:mode==='falling'?sim.time-sim.lastCrash:sim.time,r.steer);
      applyPose(rider,pose);
      rider.position.set(r.x,ground(r.z)+pose.bob,-r.z);
      rider.rotation.y = -(r.yaw || 0);
      rider.rotation.z = -r.lean;
      // Walk-mode: let WalkController drive camera + avatar
      if (walkMode) {
        walkTime += realDt;
        walkCtrl.update(camera, realDt, walkerModel);
        // Animate the walker model
        applyNPCPose(walkerModel, walkCtrl.state.speed > 0.1 ? 'walking' : 'looking', walkTime, 0, 'summer');
        // Use walker position for culling and sun/light updates
        const wPos = walkCtrl.position;
        followSun(sun, wPos); scratchVec.set(wPos.x,ground(wPos.z),-wPos.z); localLighting.update(scratchVec, realDt);
        for(const mesh of instances)if(!['cloud','ocean','terrain','beach'].includes(mesh.userData.asset)){const start=mesh.userData.chunk*69;mesh.visible=start<wPos.z+(mesh.userData.outline?200:450)&&start+69>wPos.z-60;}
      } else {
        rider.visible=!(sim.time<sim.recoveryUntil && Math.floor(sim.time*11)%2===0);
        updateCamera(realDt);
        followSun(sun,r);world(r,scratchVec);localLighting.update(scratchVec,realDt);
        for(const mesh of instances)if(!['cloud','ocean','terrain','beach'].includes(mesh.userData.asset)){const start=mesh.userData.chunk*69;mesh.visible=Math.abs(start+34.5 - r.z)<(mesh.userData.outline?150:450);}
        for(const t of sim.targets){const obj=mailboxes.get(t.id);if(obj)obj.visible=Math.abs(t.z-r.z)<150;}
        for(const obj of windowTargets){const t=sim.targets.find(t=>t.id===obj.userData.targetId);if(t)obj.children[0].material.visible=!!t.broken;}
        for(const d of sim.dogs){
          const obj=dogModels.get(d.id);
          obj.visible=Math.abs(d.z-r.z)<80;
          if(!obj.visible)continue;
          world(d, obj.position);
          const dir = d.direction ?? 1;
          obj.rotation.y = dir > 0 ? 0 : Math.PI;
          applyDogPose(obj, d.mode, sim.time, d.variant ?? 0);
        }
        for(const p of sim.projectiles){if(!projectiles.has(p.id)){const obj=assets.get('newspaper').clone(true);scene.add(obj);projectiles.set(p.id,obj);}const obj=projectiles.get(p.id);world(positionAt(p,p.age), obj.position);obj.rotation.set(p.age*15,p.age*9,p.age*5);}
        for(const [id,obj] of projectiles)if(!sim.projectiles.some(p=>p.id===id)){scene.remove(obj);projectiles.delete(id);}
        const prediction=sim.preview();const pts=trajectory(prediction),attr=arcGeometry.attributes.position;pts.forEach((p,i)=>attr.setXYZ(i,p.x,p.y,-p.z));attr.needsUpdate=true;arc.visible=sim.mode==='playing';marker.visible=arc.visible;world(prediction.target,marker.position);marker.position.y=ground(prediction.target.z)+.13;
        const aim=sim.getAim();arcMat.color.set(aim?.type==='dog'?'#f9c35c':aim?.type==='window'?'#ef855d':'#fff8d8');
        if(previousEvents<sim.events.length){for(const e of sim.events.slice(previousEvents)){notice=e.type==='delivery'?`NICE THROW!  +${e.points}`:e.type==='crash'?'EASY THERE!':e.type==='distract'?'GOOD DOG. KEEP RIDING!':'WRONG HOUSE!  −150';noticeUntil=now+1700;sound(e.type==='delivery'?650:e.type==='crash'?110:360);}previousEvents=sim.events.length;}
        if(frame%4===0){
          const targets=[];let totalSubscribers=0;
          for(let i=0;i<sim.targets.length;i++){
            const t=sim.targets[i];
            if(t.subscriber)totalSubscribers++;
            if(t.subscriber&&!t.delivered&&t.z-r.z>-7&&t.z-r.z<40){
              scratchVec.set(t.x,t.y+1,-t.z).project(camera);
              if(scratchVec.z< -1||scratchVec.z>1||Math.abs(scratchVec.x)>1||Math.abs(scratchVec.y)>1)continue;
              targets.push({id:t.id,x:(scratchVec.x*.5+.5)*viewport.width,y:(-.5*scratchVec.y+.5)*viewport.height,active:t.id===aim?.id});
            }
          }
          onUpdate({mode:sim.mode,score:sim.score,lives:sim.lives,papers:sim.papers,delivered:sim.delivered,total:totalSubscribers,speed:Math.round(r.speed*3.6),progress:Math.min(1,r.z/RULES.length),combo:sim.combo,targets,notice:now<noticeUntil?notice:'',aim:aim?.type||null,sprinting:sim.input.pedal,fps:Math.round(fps)});
        }
      }
      renderer.render(scene,camera);
    }else renderReview();
    frame++;if(!disposed)requestAnimationFrame(renderGame);
  }
  const studio=new THREE.Scene();studio.background=new THREE.Color('#e9eee8');const fill=new THREE.HemisphereLight(STYLE.fill.sky,STYLE.fill.ground,STYLE.fill.intensity);studio.add(fill);const key=new THREE.DirectionalLight(STYLE.sun.color,STYLE.sun.intensity);key.position.set(-4,7,5);studio.add(key);const rim=new THREE.DirectionalLight('#b0d7ee',.7);rim.position.set(5,3,-5);studio.add(rim);
  const clay=new THREE.MeshToonMaterial({color:'#cbd2c9',gradientMap:gradient});let reviewLighting=null;
  function renderReview(){if(reviewObject&&reviewCamera)renderer.render(studio,reviewCamera);}
  function showReview(asset='rider',view='front',animation='riding',time=.25,clayMode=false){
    if(!assets.has(asset))throw Error('Unknown asset');if(!['front','side','rear','clay'].includes(view))throw Error('Unknown view');
    sim.pause();clearControls();reviewing=true;reviewLighting?.dispose();reviewLighting=null;if(reviewObject)studio.remove(reviewObject);reviewObject=assets.get(asset).clone(true);studio.add(reviewObject);
    if(asset==='rider')applyPose(reviewObject,poseAt(animation,time));if(asset.startsWith('npc_'))applyNPCPose(reviewObject,NPC_STATES.includes(animation)?animation:'walking',time,0,asset.slice(4));if(clayMode||view==='clay')reviewObject.traverse(o=>{if(o.userData.outline)o.visible=false;else if(o.isMesh)o.material=clay;});
    const box=new THREE.Box3().setFromObject(reviewObject),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());const extent=Math.max(size.x,size.y,size.z)*.74;
    if(!clayMode&&view!=='clay'){reviewLighting=new LocalLightPool(studio,collectLightSources(new Map([[asset,reviewObject]]),new Map([[asset,[new THREE.Matrix4()]]])));reviewLighting.update(center,1);}
    reviewCamera=new THREE.OrthographicCamera(-extent*viewport.width/viewport.height,extent*viewport.width/viewport.height,extent,-extent,.01,Math.max(300,extent*8));
    const direction=view==='front'?new THREE.Vector3(0,.16,-1):view==='side'?new THREE.Vector3(1,.12,0):view==='rear'?new THREE.Vector3(0,.16,1):new THREE.Vector3(1,.65,-1);
    reviewCamera.position.copy(center).addScaledVector(direction,Math.max(8,extent*3));reviewCamera.lookAt(center);reviewState={asset,view,animation,time,clay:view==='clay'||clayMode};renderReview();return reviewState;
  }
  const review={assets:manifest.assets,animations:ANIMATIONS,npcAnimations:NPC_STATES,show:showReview,close(){reviewing=false;last=performance.now();},captureSky(){
    const probe=new THREE.PerspectiveCamera(90,camera.aspect,.1,1500);probe.position.copy(camera.position);skydome.position.copy(probe.position);
    const directions=Array.from({length:8},(_,i)=>({name:`azimuth-${i*45}`,direction:new THREE.Vector3(Math.cos(i*Math.PI/4),.35,Math.sin(i*Math.PI/4))}));
    directions.push({name:'zenith',direction:new THREE.Vector3(0,1,0)},{name:'nadir',direction:new THREE.Vector3(0,-1,0)});
    const captures=directions.map(({name,direction})=>{probe.lookAt(probe.position.clone().add(direction));renderer.render(scene,probe);ensureWebGLFrame();return {name:`sky-${name}.png`,direction:direction.toArray(),data:canvas.toDataURL('image/png')};});
    if(reviewing)renderReview();else renderer.render(scene,camera);return captures;
  },snapshot(){if(!reviewing)throw Error('Open an asset in the review studio first');renderReview();ensureWebGLFrame();return renderer.domElement.toDataURL('image/png');},captureAll(){
    const capture=[];const prior={width:viewport.width,height:viewport.height};renderer.setPixelRatio(1);renderer.setSize(640,640,false);viewport={width:640,height:640};
    for(const a of manifest.assets){const motions=a.id==='rider'?ANIMATIONS:a.id.startsWith('npc_')?NPC_STATES:['riding'];for(const animation of motions)for(const view of ['front','side','rear','clay']){showReview(a.id,view,animation,animation==='falling'?.55:.25);capture.push({name:`${a.id}-${animation}-${view}.png`,data:review.snapshot(),...reviewState});}}
    viewport=prior;renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));renderer.setSize(prior.width,prior.height,false);if(reviewState)showReview(reviewState.asset,reviewState.view,reviewState.animation,reviewState.time);return capture;
  }};
  const api={sim,review,start(){sim.start();last=performance.now();sound(520);},pause(){clearControls();sim.pause();},resume(){clearControls();sim.resume();last=performance.now();},restart(){sim.reset();localLighting.reset();updateCamera(0,true);previousEvents=0;notice='';clearControls();sim.start();last=performance.now();},throw(){sim.throwPaper();},setPedal(value){if(value)keys.add('ArrowUp');else keys.delete('ArrowUp');},toggleSound(){muted=!muted; audioListener.setMasterVolume(muted?0:1); sound(550);return muted;},captureScene(){if(reviewing)renderReview();else renderer.render(scene,camera);ensureWebGLFrame();return {data:canvas.toDataURL('image/png'),name:`paperroute-${CAMERA_REVISION}-${Math.round(sim.rider.z)}m.png`,renderer:'Three.js WebGLRenderer',styleRevision:STYLE_REVISION,cameraRevision:CAMERA_REVISION};},stats(){return {fps:Math.round(fps),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,assets:manifest.assets.length,localLights:localLighting.activeCount,localLightBudget:localLighting.slots.length*2,residents:residents.npcs.length,npcStates:residents.snapshot().map(({id,state})=>({id,state})),styleRevision:STYLE_REVISION,cameraRevision:CAMERA_REVISION,camera:{position:camera.position.toArray(),target:chase.frame.target.toArray(),fov:camera.fov,yaw:chase.yaw,horizonTop:chase.frame.horizonTop},shaderErrors:[...shaderErrors],webglVersion:renderer.getContext().getParameter(renderer.getContext().VERSION)};},dispose(){if(bgmAudio.isPlaying)bgmAudio.stop(); reviewLighting?.dispose();localLighting.dispose();disposed=true;abort.abort();observer.disconnect();clearControls();audioContext?.close();renderer.dispose();scene.traverse(o=>{if(o.geometry)o.geometry.dispose();});materialCache.forEach(m=>{m.aoMap?.dispose();m.dispose();});sharedPaintMaps.forEach(t=>t.dispose());skydome.material.dispose();pencil.dispose();riderPencil.dispose();clay.dispose();skyTexture.dispose();gradient.dispose();}};
  if(new URLSearchParams(window.location.search).has('review'))Object.defineProperty(window,'PAPERROUTE',{value:api,configurable:true});
  requestAnimationFrame(renderGame);return api;
}
