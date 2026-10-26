// User/CI runner for the real WebGL review. Requires a running application.
// node scripts/review/capture-webgl.mjs --url http://localhost:3000
import {chromium} from 'playwright';import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import crypto from 'node:crypto';import {STYLE_REVISION} from '../../components/game/visual-style.mjs';
import {CAMERA_REVISION} from '../../components/game/chase-camera.mjs';
const url=process.argv[process.argv.indexOf('--url')+1];if(!url||!/^https?:\/\//.test(url))throw Error('Pass --url with a running PAPERROUTE application.');
const output=path.resolve('public/review/webgl',`${STYLE_REVISION}-${CAMERA_REVISION}`);await fs.mkdir(output,{recursive:true});
const routeURL=new URL(url);routeURL.searchParams.set('review','1');
const sourceFiles=['components/game/scene.mjs','components/game/world-layout.mjs','components/game/chase-camera.mjs','components/game/visual-style.mjs','art/generate_assets.py','art/japanese_assets.py','art/bake_ao.py','components/game/skydome.mjs','components/game/pencil-outline.mjs','engine/animation.mjs','public/assets/manifest.json','public/textures/summer-sky-v5.webp','components/game/ocean-shader.mjs','components/game/npc-view.mjs','engine/living-world.mjs','art/generate_living_world.py','art/generate_detail_world.py','art/detail_vehicles.py','art/detail_textures.py','art/pack_glb_textures.py','components/game/local-lighting.mjs'];
const sourceHashes={};for(const file of sourceFiles)sourceHashes[file]=crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
const frames=[];
async function saveScene(page,name){
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const frame=await page.evaluate(()=>window.PAPERROUTE.captureScene());
 assert.equal(frame.renderer,'Three.js WebGLRenderer');assert.equal(frame.styleRevision,STYLE_REVISION);
 assert.equal(frame.cameraRevision,CAMERA_REVISION);
 await fs.writeFile(path.join(output,name),Buffer.from(frame.data.split(',')[1],'base64'));
 const stats=await page.evaluate(()=>window.PAPERROUTE.stats());assert.deepEqual(stats.shaderErrors,[]);assert.match(stats.webglVersion,/WebGL/);
 frames.push({file:name,viewport:page.viewportSize(),stats});
}
const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(routeURL.href,{waitUntil:'load'});await page.waitForFunction(()=>!!window.PAPERROUTE,{timeout:60000});await saveScene(page,'desktop-scene.png');await page.screenshot({path:path.join(output,'desktop-start.png')});
 await page.getByRole('button',{name:'Let’s ride'}).click();await page.keyboard.press('Space');await page.waitForFunction(()=>window.PAPERROUTE.sim.delivered===1);await page.screenshot({path:path.join(output,'desktop-delivery.png')});
 await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>window.PAPERROUTE.sim.rider.x>1);await saveScene(page,'desktop-steering-scene.png');assert.ok(frames.at(-1).stats.camera.yaw>0);await page.keyboard.up('ArrowRight');
 const x=await page.evaluate(()=>window.PAPERROUTE.sim.rider.x);await page.waitForFunction(t=>window.PAPERROUTE.sim.time>t+.25,await page.evaluate(()=>window.PAPERROUTE.sim.time));assert.equal(await page.evaluate(()=>window.PAPERROUTE.sim.rider.x),x);
 await saveScene(page,'desktop-riding-scene.png');await page.keyboard.down('ArrowUp');await page.waitForFunction(()=>window.PAPERROUTE.sim.rider.speed>13);await saveScene(page,'desktop-sprint-scene.png');assert.equal(frames.at(-1).stats.camera.fov,68);await page.keyboard.up('ArrowUp');await page.evaluate(()=>window.PAPERROUTE.pause());const captures=await page.evaluate(()=>window.PAPERROUTE.review.captureAll());assert.equal(captures.length,284);const skyCaptures=await page.evaluate(()=>window.PAPERROUTE.review.captureSky());assert.equal(skyCaptures.length,10);for(const c of skyCaptures)await fs.writeFile(path.join(output,c.name),Buffer.from(c.data.split(',')[1],'base64'));for(const c of captures)await fs.writeFile(path.join(output,c.name),Buffer.from(c.data.split(',')[1],'base64'));
 assert.deepEqual(await page.evaluate(()=>window.PAPERROUTE.stats().shaderErrors),[]);
 await page.setViewportSize({width:390,height:844});await page.goto(routeURL.href,{waitUntil:'load'});await page.waitForFunction(()=>!!window.PAPERROUTE);await saveScene(page,'mobile-scene.png');await page.screenshot({path:path.join(output,'mobile-start.png')});await page.getByRole('button',{name:'Let’s ride'}).click();await page.getByRole('button',{name:'Throw newspaper',exact:true}).click();await page.waitForFunction(()=>window.PAPERROUTE.sim.delivered===1);await saveScene(page,'mobile-riding-scene.png');await page.screenshot({path:path.join(output,'mobile-delivery.png')});
 assert.deepEqual(errors,[]);const stats=await page.evaluate(()=>window.PAPERROUTE.stats());await fs.writeFile(path.join(output,'results.json'),JSON.stringify({renderer:'Three.js WebGLRenderer',styleRevision:STYLE_REVISION,cameraRevision:CAMERA_REVISION,capturedAt:new Date().toISOString(),sourceHashes,captures:captures.length,skyViews:skyCaptures.map(({name,direction})=>({name,direction})),frames,errors,stats},null,2));console.log(`PASS: ${captures.length} WebGL turnarounds, desktop/mobile chase captures, steering, reference FOV, delivery and release tests.`);
}finally{await browser.close();}
