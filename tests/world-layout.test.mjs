import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Simulation} from '../engine/simulation.mjs';
import {createWorldPlacements} from '../components/game/world-layout.mjs';

test('live and review layouts use repeatable matrices with existing assets',()=>{
 const ids=new Set(JSON.parse(fs.readFileSync(new URL('../public/assets/manifest.json',import.meta.url))).assets.map(a=>a.id));
 const sim=new Simulation(),before=JSON.stringify(sim),a=createWorldPlacements(sim),b=createWorldPlacements(sim);
 assert.equal(JSON.stringify(sim),before,'layout must not advance or edit gameplay');
 assert.deepEqual([...a],[...b]);
 for(const [id,matrices] of a){assert.ok(ids.has(id),id);assert.ok(matrices.length);for(const m of matrices)assert.ok(m.elements.every(Number.isFinite));}
 assert.ok(a.get('tree_oak_lod').length+a.get('tree_elm_lod').length>200);
 assert.ok(a.get('car').length&&a.get('kei_truck').length);
});
