import test from 'node:test';import assert from 'node:assert/strict';
import {LivingWorld,npcPose,OUTFITS,NPC_STATES} from '../engine/living-world.mjs';
test('resident schedules reproduce across frame rates and reset',()=>{
 const worlds=[30,60,144].map(fps=>{const w=new LivingWorld(21);for(let i=1;i<=fps*30;i++)w.updateTo(Math.floor(i*60/fps));return w;});assert.deepEqual(worlds[0].snapshot(),worlds[1].snapshot());assert.deepEqual(worlds[1].snapshot(),worlds[2].snapshot());worlds[0].updateTo(0);assert.deepEqual(worlds[0].snapshot(),new LivingWorld(21).snapshot());
});
test('every wardrobe is present; residents cycle activities',()=>{
 const w=new LivingWorld();assert.deepEqual(new Set(w.npcs.map(n=>n.outfit)),new Set(OUTFITS));
 for(let i=0;i<7200;i++){w.step();for(const n of w.npcs){assert.ok(Math.abs(n.x)>=6.25);assert.ok(Math.abs(n.z-n.homeZ)<=25);assert.ok(NPC_STATES.includes(n.state));}}
 assert.ok(w.npcs.every(n=>n.transitions>0));assert.ok(new Set(w.npcs.map(n=>n.stateUntil)).size>10);assert.ok(w.npcs.some(n=>n.role==='guest'));assert.ok(w.npcs.some(n=>n.role==='keeper'));
});
test('pause freezes residents and one resident does not change neighbors RNG',()=>{const a=new LivingWorld(),b=new LivingWorld();a.updateTo(500);const saved=a.snapshot();a.updateTo(500);assert.deepEqual(a.snapshot(),saved);b.npcs.pop();b.updateTo(500);assert.deepEqual(b.snapshot(),saved.slice(0,-1));});
test('resident poses are finite with bent seated knees and sweeping movement',()=>{
 for(const state of NPC_STATES)for(const outfit of OUTFITS)for(const t of [0,.4,2,7])for(const value of Object.values(npcPose(state,t,1,outfit)))assert.ok(typeof value==='boolean'||Number.isFinite(value));assert.equal(npcPose('sitting',0).leftKnee,-Math.PI/2);assert.notEqual(npcPose('sweeping',0).broomAngle,npcPose('sweeping',1).broomAngle);
});

test('seated thighs and drinking hands move toward the character front, with vertical shins',()=>{for(const t of [0,.7,2]){const p=npcPose('drinking',t);assert.ok(-Math.sin(p.rightArm)<0);assert.ok(-Math.sin(p.leftLeg)<0);assert.ok(Math.abs(p.leftLeg+p.leftKnee)<1e-8);}});
